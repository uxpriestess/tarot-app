const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function evaluate(source, requireMock, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: requireMock, AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const forbiddenImport = name => { throw new Error(`Unexpected import: ${name}`); };
const loveContract = evaluate(read('src/services/loveReading.ts'), forbiddenImport);

// Execute the actual screen callback without rendering native UI or loading services.
function screenCallback(globals) {
  const source = ts.createSourceFile('LoveReadingScreen.tsx',
    read('src/screens/LoveReadingScreen.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ['POSITIONS', 'cancelReading', 'disposeReading', 'handleCancelReading', 'runStoredReading', 'handleRetryReading', 'handleStartReading'].includes(node.name.getText(source))) {
      declarations.push(`const ${node.getText(source)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(declarations.length, 7);
  const api = evaluate(`${declarations.join('\n')}\nexport { handleStartReading, handleRetryReading, disposeReading, handleCancelReading };`,
    forbiddenImport, { console, ...loveContract,
      pendingReading: { current: null }, requestId: { current: 0 },
      activeRequest: { current: null }, mounted: { current: true },
      setTyFlipped() {}, setPartnerFlipped() {}, setPoutoFlipped() {},
      setReadingError() {}, onClose: undefined, ...globals });
  return Object.assign(api.handleStartReading, {
    retry: api.handleRetryReading, dispose: api.disposeReading, cancel: api.handleCancelReading,
  });
}

function deck(random) {
  const sets = {};
  for (const name of ['majorArcana', 'cups', 'pentacles', 'wands', 'swords']) {
    sets[`./${name}`] = evaluate(read(`src/data/${name}.ts`), forbiddenImport);
  }
  return evaluate(read('src/data/index.ts'), name => {
    assert.ok(sets[name], `Unexpected deck dependency: ${name}`);
    return sets[name];
  }, { Math: Object.assign(Object.create(Math), { random }), console });
}

async function runReading(random, responseSections, success = true, responseOptions = {}) {
  const { allCards, drawCard } = deck(random);
  assert.equal(new Set(allCards.map(card => card.id)).size, allCards.length);
  const allowedPools = [], stages = [], displayed = [], requests = [], errors = [];
  const sections = responseSections === undefined ? ['ty', 'partner', 'vztah'].map(key => ({ key, label: key, text: `Mock ${key}` })) : responseSections;
  // Real API serializer, mocked fetch and profile store: no network/native imports.
  const service = evaluate(read('src/services/universe.ts'), name => {
    if (name === '../data') return { drawCard };
    if (name === './loveReading') return loveContract;
    if (name === '../store/appStore') return {
      useAppStore: { getState: () => ({ getUserContext: () => undefined }) },
    };
    return forbiddenImport(name);
  }, {
    console,
    fetch: async (url, options) => {
      assert.equal(options.method, 'POST');
      const body = JSON.parse(options.body);
      requests.push(body);
      if (responseOptions.networkError) throw new Error('Mock network error');
      return { ok: responseOptions.ok ?? true, json: async () => {
        if (responseOptions.invalidJson) throw new SyntaxError('Mock invalid JSON');
        return { readingType: responseOptions.readingType ?? body.mode, sections };
      } };
    },
  });
  const start = screenCallback({
    allCards,
    drawCard: ids => {
      assert.ok(ids.length > 0);
      allowedPools.push(Array.from(ids));
      return drawCard(ids);
    },
    performReading: service.performReading,
    setStage: stage => stages.push(stage),
    setCardsData: cards => displayed.push(Array.from(cards)),
    setReadingError: text => { if (text) errors.push(text); },
  });
  await start();
  assert.equal(requests.length, 1);
  assert.deepEqual(stages, success ? ['loading', 'ty'] : ['loading', 'error']);
  assert.equal(displayed.length, success ? 1 : 0);
  assert.equal(errors.length, success ? 0 : 1);
  return { request: requests[0], pools: allowedPools, displayed: displayed[0], allCards };
}

test('active love callback sends love_3_card and preserves spread positions through the service', async () => {
  const { request, displayed } = await runReading(() => 0.75);
  assert.equal(request.mode, 'love_3_card');
  assert.equal(request.spreadName, 'Láska a vztahy');
  assert.equal(request.question, 'Co je mezi námi?');
  assert.deepEqual(request.cards.map(card => card.label), ['TY', 'PARTNER', 'VAŠE POUTO']);
  assert.deepEqual(displayed.map(card => card.position), ['TY', 'PARTNER', 'VAŠE POUTO']);
  assert.deepEqual(displayed.map(card => card.meaning), ['Mock ty', 'Mock partner', 'Mock vztah']);
});

test('draws three distinct real deck IDs even when random always chooses the same index', async () => {
  for (const value of [0, 0.5, 0.999999]) {
    const { request, pools, displayed, allCards } = await runReading(() => value);
    const ids = displayed.map(item => item.card.id);
    assert.equal(new Set(ids).size, 3);
    assert.deepEqual(pools.map(pool => pool.length), [allCards.length, allCards.length - 1, allCards.length - 2]);
    ids.forEach((id, index) => {
      assert.ok(pools[index].includes(id));
      for (let later = index + 1; later < pools.length; later++) assert.ok(!pools[later].includes(id));
      assert.equal(request.cards[index].name, displayed[index].card.name);
    });
  }
});

test('transmits actual mixed orientations in the same order as the drawn cards', async () => {
  const values = [0, 0.1, 0, 0.9, 0, 0.2];
  const { request } = await runReading(() => {
    assert.ok(values.length, 'Unexpected additional random draw');
    return values.shift();
  });
  assert.equal(values.length, 0);
  assert.deepEqual(request.cards.map(card => card.position), ['reversed', 'upright', 'reversed']);
});

test('reordered response sections map to the correct cards by stable keys', async () => {
  const sections = ['vztah', 'ty', 'partner'].map(key => ({ key, text: `Text ${key}` }));
  const { displayed } = await runReading(() => 0.75, sections);
  assert.deepEqual(displayed.map(card => card.meaning), ['Text ty', 'Text partner', 'Text vztah']);
});

const validSections = () => ['ty', 'partner', 'vztah'].map(key => ({ key, text: `Text ${key}` }));
const invalidSections = [
  ['missing', () => validSections().slice(0, 2)],
  ['duplicated', () => [validSections()[0], validSections()[0], validSections()[2]]],
  ['unknown key', () => [...validSections().slice(0, 2), { key: 'pouto', text: 'Text' }]],
  ['empty text', () => [...validSections().slice(0, 2), { key: 'vztah', text: '  ' }]],
  ['non-string text', () => [...validSections().slice(0, 2), { key: 'vztah', text: 42 }]],
  ['null section', () => [...validSections().slice(0, 2), null]],
  ['not an array', () => ({ ty: 'Text' })],
];
for (const [name, makeSections] of invalidSections) {
  test(`frontend rejects ${name} sections and exits loading without displaying a reading`, async () => {
    await runReading(() => 0.75, makeSections(), false);
  });
}

for (const [name, options] of [
  ['HTTP error', { ok: false }], ['invalid response JSON', { invalidJson: true }],
  ['network failure', { networkError: true }], ['wrong reading type', { readingType: 'daily' }],
]) {
  test(`love screen exits loading on ${name}`, async () => {
    await runReading(() => 0.75, undefined, false, options);
  });
}

function backend(rawText, stopReason = 'end_turn') {
  const calls = [];
  class AnthropicMock {
    constructor() {
      this.messages = { create: async request => {
        calls.push(request);
        return { stop_reason: stopReason, content: [{ type: 'text', text: rawText }] };
      } };
    }
  }
  const silentConsole = { log() {}, warn() {}, error() {} };
  const api = evaluate(read('my-ai-backend/api/chat.js'), name => {
    assert.equal(name, '@anthropic-ai/sdk');
    return AnthropicMock;
  }, { console: silentConsole, process: { env: { ANTHROPIC_API_KEY: 'mock-only' } } });
  return { calls, async request(mode = 'love_3_card') {
    let status, body;
    const res = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
    await api.default({ method: 'POST', body: {
      mode, question: 'Mock question',
      cards: ['TY', 'PARTNER', 'VAŠE POUTO'].map((label, index) => ({
        nameCzech: `Mock karta ${index}`, label, position: index === 1 ? 'upright' : 'reversed',
      })),
    } }, res);
    return { status, body };
  } };
}

test('backend requires JSON and normalizes reordered love sections with canonical labels', async () => {
  const api = backend(JSON.stringify({ sections: validSections().reverse() }));
  const { status, body } = await api.request();
  assert.equal(status, 200);
  assert.equal(body.readingType, 'love_3_card');
  assert.deepEqual(Array.from(body.sections, section => section.key), ['ty', 'partner', 'vztah']);
  assert.deepEqual(Array.from(body.sections, section => section.label), ['Ty', 'Partner', 'Vaše pouto']);
  assert.match(api.calls[0].system, /<love_output_contract>/);
  assert.match(api.calls[0].system, /Jsi Tarotka/);
  assert.match(api.calls[0].messages[0].content, /Mock karta 0 \(Obrácená\)/);
});

for (const [name, makeSections] of invalidSections) {
  test(`backend returns 502 for ${name} sections`, async () => {
    const { status, body } = await backend(JSON.stringify({ sections: makeSections() })).request();
    assert.equal(status, 502);
    assert.equal(body.code, 'INVALID_LOVE_READING');
    assert.equal(body.sections, undefined);
  });
}
for (const malformed of ['not JSON', '```json\n{}\n```', '{"sections":', 'null',
  JSON.stringify({ sections: validSections(), extra: true }),
  JSON.stringify({ sections: validSections().map(section => ({ ...section, extra: true })) })]) {
  test(`backend rejects malformed output ${malformed.slice(0, 24)}`, async () => {
    assert.equal((await backend(malformed).request()).status, 502);
  });
}
test('backend rejects refused and truncated love output even with valid JSON', async () => {
  for (const reason of ['refusal', 'max_tokens']) {
    assert.equal((await backend(JSON.stringify({ sections: validSections() }), reason).request()).status, 502);
  }
});
test('other backend modes retain plain text responses without the love contract', async () => {
  for (const mode of ['daily', 'tomorrow', 'reading-screen', 'custom_question', 'moon_phase', 'body_mind_spirit']) {
    const api = backend('Mock text');
    const { status, body } = await api.request(mode);
    assert.equal(status, 200);
    assert.equal(body.answer, 'Mock text');
    assert.ok(!api.calls[0].system.includes('<love_output_contract>'));
  }
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const validReading = () => ({ readingType: 'love_3_card', sections: validSections() });
function screenSession(performReading) {
  const data = deck(() => 0.75);
  const stages = [], displayed = [], errors = [], calls = [];
  let draws = 0;
  const start = screenCallback({
    allCards: data.allCards,
    drawCard: ids => { draws++; return data.drawCard(ids); },
    performReading: (input, options) => {
      calls.push({ input, signal: options.signal });
      return performReading(input, options);
    },
    setStage: value => stages.push(value),
    setCardsData: value => displayed.push(value),
    setReadingError: value => errors.push(value),
  });
  return { start, stages, displayed, errors, calls, get draws() { return draws; } };
}

for (const failure of ['network', 'timeout', 'invalid']) {
  test(`retry recovers from ${failure} with identical cards, orientations, positions and question`, async () => {
    let attempt = 0;
    const session = screenSession(async () => {
      if (++attempt === 1) {
        if (failure === 'invalid') return { readingType: 'love_3_card', sections: [] };
        throw new loveContract.LoveReadingError(failure);
      }
      return validReading();
    });
    await session.start();
    assert.deepEqual(session.stages, ['loading', 'error']);
    assert.ok(session.errors.at(-1));
    await session.start.retry();
    assert.equal(session.draws, 3);
    assert.equal(session.calls[0].input, session.calls[1].input);
    assert.deepEqual(session.calls[0].input, session.calls[1].input);
    assert.deepEqual(session.stages, ['loading', 'error', 'loading', 'ty']);
    assert.equal(session.displayed.length, 1);
  });
}

for (const oldFailure of [false, true]) {
  test(`stale ${oldFailure ? 'failure' : 'success'} cannot overwrite a newer reading`, async () => {
    const old = deferred();
    let calls = 0;
    const session = screenSession(() => ++calls === 1 ? old.promise : Promise.resolve(validReading()));
    const first = session.start();
    await session.start();
    assert.equal(session.calls[0].signal.aborted, true);
    const snapshot = JSON.stringify([session.stages, session.errors, session.displayed]);
    if (oldFailure) old.reject(new Error('Mock late failure'));
    else old.resolve(validReading());
    await first;
    assert.equal(JSON.stringify([session.stages, session.errors, session.displayed]), snapshot);
  });
}

for (const fail of [false, true]) {
  test(`unmount aborts the request and suppresses late ${fail ? 'failure' : 'success'}`, async () => {
    const pending = deferred();
    const session = screenSession(() => pending.promise);
    const running = session.start();
    session.start.dispose();
    assert.equal(session.calls[0].signal.aborted, true);
    const snapshot = JSON.stringify([session.stages, session.errors, session.displayed]);
    if (fail) pending.reject(new Error('Mock failure after unmount'));
    else pending.resolve(validReading());
    await running;
    await session.start.retry();
    assert.equal(session.calls.length, 1);
    assert.equal(JSON.stringify([session.stages, session.errors, session.displayed]), snapshot);
  });
}

test('cancel exits loading even without onClose, ignores late output and permits same-card retry', async () => {
  const pending = deferred();
  let calls = 0;
  const session = screenSession(() => ++calls === 1 ? pending.promise : Promise.resolve(validReading()));
  const running = session.start();
  session.start.cancel();
  assert.equal(session.calls[0].signal.aborted, true);
  assert.deepEqual(session.stages, ['loading', 'error']);
  pending.resolve(validReading());
  await running;
  assert.equal(session.displayed.length, 0);
  await session.start.retry();
  assert.equal(session.draws, 3);
  assert.equal(session.calls[0].input, session.calls[1].input);
  assert.equal(session.stages.at(-1), 'ty');
});

function timedService(fetchMock) {
  let fire, clears = 0, timers = 0;
  const contract = evaluate(read('src/services/loveReading.ts'), forbiddenImport, {
    setTimeout: (callback, delay) => {
      assert.equal(delay, 45_000); timers++; fire = callback; return 123;
    },
    clearTimeout: token => { assert.equal(token, 123); clears++; },
  });
  const service = evaluate(read('src/services/universe.ts'), name => {
    if (name === './loveReading') return contract;
    if (name === '../data') return {};
    if (name === '../store/appStore') return {
      useAppStore: { getState: () => ({ getUserContext: () => undefined }) },
    };
    return forbiddenImport(name);
  }, { fetch: fetchMock, console: { error() {} } });
  return { service, fire: () => fire(), get clears() { return clears; }, get timers() { return timers; } };
}

for (const stalledBody of [false, true]) {
  test(`45 second timeout aborts and settles even if ${stalledBody ? 'response.json' : 'fetch'} ignores abort`, async () => {
    const pending = deferred();
    let signal;
    const api = timedService(async (_, options) => {
      signal = options.signal;
      return stalledBody ? { ok: true, json: () => pending.promise } : pending.promise;
    });
    const running = api.service.performReading({ mode: 'love_3_card', cards: [] });
    const rejected = assert.rejects(running, error => error.code === 'timeout');
    await new Promise(resolve => setImmediate(resolve));
    api.fire();
    await rejected;
    assert.equal(signal.aborted, true);
    assert.equal(api.clears, 1);
    pending.resolve(stalledBody ? validReading() : { ok: true, json: async () => validReading() });
  });
}

test('external abort settles a love request and clears the timeout', async () => {
  const controller = new AbortController();
  let signal;
  const api = timedService(async (_, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  const running = api.service.performReading({ mode: 'love_3_card', cards: [] }, { signal: controller.signal });
  const rejected = assert.rejects(running, error => error.code === 'aborted');
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await rejected;
  assert.equal(signal.aborted, true);
  assert.equal(api.clears, 1);
});

test('successful love request clears its timer; other modes get no timeout or abort signal', async () => {
  const optionsSeen = [];
  const api = timedService(async (_, options) => {
    optionsSeen.push(options);
    return { ok: true, json: async () => validReading() };
  });
  await api.service.performReading({ mode: 'love_3_card', cards: [] });
  assert.equal(api.timers, 1);
  assert.equal(api.clears, 1);
  assert.ok(optionsSeen[0].signal);
  await api.service.performReading({ mode: 'daily', cards: [] });
  assert.equal(api.timers, 1);
  assert.equal('signal' in optionsSeen[1], false);
});
