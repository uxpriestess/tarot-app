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
    fileName: 'test.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
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
      setReadingError() {}, setSynthesis() {}, onClose: undefined, ...globals });
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
  const allowedPools = [], stages = [], displayed = [], requests = [], errors = [], syntheses = [];
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
    console: { error() {}, info() {} },
    fetch: async (url, options) => {
      assert.equal(options.method, 'POST');
      const body = JSON.parse(options.body);
      requests.push(body);
      if (responseOptions.networkError) throw new Error('Mock network error');
      return { ok: responseOptions.ok ?? true, status: responseOptions.status ?? (responseOptions.ok === false ? 500 : 200), json: async () => {
        if (responseOptions.invalidJson) throw new SyntaxError('Mock invalid JSON');
        return { readingType: responseOptions.readingType ?? body.mode, sections, synthesis: responseOptions.synthesis };
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
    setSynthesis: value => syntheses.push(value),
    setReadingError: text => { if (text) errors.push(text); },
  });
  await start();
  assert.equal(requests.length, 1);
  assert.deepEqual(stages, success ? ['loading', 'ty'] : ['loading', 'error']);
  assert.equal(displayed.length, success ? 1 : 0);
  assert.equal(errors.length, success ? 0 : 1);
  return { request: requests[0], pools: allowedPools, displayed: displayed[0], allCards, synthesis: syntheses[0] };
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

function backend(rawText, stopReason = 'end_turn', options = {}) {
  const calls = [], diagnostics = [], logs = [];
  class AnthropicMock {
    constructor() {
      this.messages = { create: async request => {
        calls.push(request);
        if (options.providerError) throw options.providerError;
        return { stop_reason: stopReason, usage: { output_tokens: 123 }, content: options.content ?? [{ type: 'text', text: rawText }] };
      } };
    }
  }
  const silentConsole = {
    log: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args),
    info: (tag, event) => { logs.push([tag, event]); diagnostics.push({ tag, ...event }); },
  };
  const api = evaluate(read('my-ai-backend/api/chat.js'), name => {
    assert.equal(name, '@anthropic-ai/sdk');
    return AnthropicMock;
  }, { console: silentConsole, process: { env: { ANTHROPIC_API_KEY: 'mock-only' } } });
  return { calls, diagnostics, logs, async request(mode = 'love_3_card') {
    let status, body;
    const res = { status(value) { status = value; this.statusCode = value; return this; }, json(value) { body = value; return this; } };
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

test('backend requests synthesis with all three cards in the same AI call', async () => {
  const api = backend(JSON.stringify({ sections: validSections(), synthesis: 'Společný motiv.' }));
  const { status, body } = await api.request();
  assert.equal(status, 200);
  assert.equal(api.calls.length, 1);
  assert.match(api.calls[0].system, /<synthesis_guidance>/);
  assert.match(api.calls[0].system, /Není to rekapitulace/);
  assert.match(api.calls[0].system, /orientací, přiřazených pozic/);
  assert.equal(body.synthesis, 'Společný motiv.');
  assert.equal(body.sections.length, 3);
  assert.equal(api.calls[0].max_tokens, 2048);
});

test('love structured output uses supported schema constraints and keeps synthesis optional', async () => {
  const api = backend(JSON.stringify({ sections: validSections() }));
  const { status, body } = await api.request();
  assert.equal(status, 200);
  assert.equal(api.calls.length, 1);
  const request = api.calls[0];
  assert.equal(request.model, 'claude-sonnet-4-6');
  assert.equal(request.temperature, 0.7);
  assert.equal(request.max_tokens, 2048);
  assert.equal(request.output_config.format.type, 'json_schema');
  const schema = JSON.parse(JSON.stringify(request.output_config.format.schema));
  assert.deepEqual(schema, {
    type: 'object',
    properties: {
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', enum: ['ty', 'partner', 'vztah'] },
            text: { type: 'string' },
          },
          required: ['key', 'text'],
          additionalProperties: false,
        },
      },
      synthesis: { type: 'string' },
    },
    required: ['sections'],
    additionalProperties: false,
  });
  // Labels belong to the public response, not the model's stricter key/text input.
  assert.deepEqual(Array.from(body.sections, section => section.label), ['Ty', 'Partner', 'Vaše pouto']);
  assert.equal(Object.hasOwn(body, 'synthesis'), false);
  assert.doesNotMatch(JSON.stringify(api.logs), /Mock question|Text ty|Mock karta|mock-only/);
});

test('structured output does not repair fenced or syntactically invalid complete love responses', async () => {
  const valid = JSON.stringify({ sections: validSections(), synthesis: 'PRIVATE_SYNTHESIS_MARKER' });
  for (const raw of [`\x60\x60\x60json\n${valid}\n\x60\x60\x60`, `Introduction\n${valid}`, valid.replace('PRIVATE_SYNTHESIS_MARKER', 'First\nSecond')]) {
    const api = backend(raw);
    const { status, body } = await api.request();
    assert.equal(status, 502);
    assert.equal(body.code, 'INVALID_LOVE_READING');
    assert.equal(api.diagnostics[0].validationFailure, 'json_parse');
    assert.equal(api.calls.length, 1);
    assert.ok(api.calls[0].output_config);
    assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_|Mock question|Text ty|Introduction|First/);
  }
});

test('installed Anthropic SDK forwards love output_config through a mocked transport', async () => {
  const api = backend(JSON.stringify({ sections: validSections() }));
  await api.request();
  const Anthropic = require('../my-ai-backend/node_modules/@anthropic-ai/sdk').default;
  let fetchCalls = 0;
  const client = new Anthropic({
    apiKey: 'mock-only', maxRetries: 0,
    fetch: async (_url, init) => {
      fetchCalls++;
      const sent = JSON.parse(init.body);
      assert.deepEqual(sent.output_config, JSON.parse(JSON.stringify(api.calls[0].output_config)));
      return new Response(JSON.stringify({
        id: 'mock', type: 'message', role: 'assistant', model: sent.model,
        content: [{ type: 'text', text: JSON.stringify({ sections: validSections() }) }],
        stop_reason: 'end_turn', stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const response = await client.messages.create(api.calls[0]);
  assert.equal(fetchCalls, 1);
  assert.equal(response.stop_reason, 'end_turn');
});

test('legacy love response without synthesis remains valid and has no extra section', async () => {
  const { status, body } = await backend(JSON.stringify({ sections: validSections() })).request();
  assert.equal(status, 200);
  assert.equal(body.sections.length, 3);
  assert.equal(Object.hasOwn(body, 'synthesis'), false);
});

for (const value of ['', ' \n ', null, 42, true, [], { text: 'Wrong shape' }]) {
  test(`malformed optional synthesis ${JSON.stringify(value)} is ignored without breaking sections`, async () => {
    const { status, body } = await backend(JSON.stringify({ sections: validSections(), synthesis: value })).request();
    assert.equal(status, 200);
    assert.equal(body.sections.length, 3);
    assert.equal(Object.hasOwn(body, 'synthesis'), false);
    const result = await runReading(() => 0.75, undefined, true, { synthesis: value });
    assert.equal(result.synthesis, undefined);
  });
}

test('synthesis is trimmed and preserved through backend, API client and screen state', async () => {
  const synthesis = 'První odstavec.\n\nDruhý odstavec.';
  const { body } = await backend(JSON.stringify({ sections: validSections().reverse(), synthesis: `  ${synthesis}  ` })).request();
  assert.equal(body.synthesis, synthesis);
  const result = await runReading(() => 0.75, body.sections, true, { synthesis: body.synthesis });
  assert.equal(result.synthesis, synthesis);
  assert.deepEqual(result.displayed.map(card => card.meaning), ['Text ty', 'Text partner', 'Text vztah']);
});

test('valid synthesis cannot conceal an invalid required card section', async () => {
  const { status } = await backend(JSON.stringify({ sections: validSections().slice(1), synthesis: 'Mock synthesis' })).request();
  assert.equal(status, 502);
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
    assert.equal(body.synthesis, undefined);
    assert.equal(api.calls[0].max_tokens, 1024);
    assert.equal(Object.hasOwn(api.calls[0], 'output_config'), false);
    assert.deepEqual(Object.keys(api.calls[0]).sort(), ['max_tokens', 'messages', 'model', 'system', 'temperature']);
    assert.equal(api.calls[0].model, 'claude-sonnet-4-6');
    assert.equal(api.calls[0].temperature, 0.7);
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
  const diagnostics = [];
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
  }, { fetch: fetchMock, console: { error() {}, info: (tag, event) => diagnostics.push({ tag, ...event }) } });
  return { service, diagnostics, fire: () => fire(), get clears() { return clears; }, get timers() { return timers; } };
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
    assert.equal(api.diagnostics.length, 1);
    assert.equal(api.diagnostics[0].category, 'timeout');
    pending.resolve(stalledBody ? validReading() : { ok: true, json: async () => validReading() });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(api.diagnostics.length, 1);
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
  assert.equal(api.diagnostics.length, 1);
  assert.equal(api.diagnostics[0].category, 'aborted');
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

// Render the real screen's JSX and exercise its navigation with mocked native UI.
// This checks where synthesis appears without an emulator or any network request.
function loveScreenHarness(reading) {
  const states = [], refs = [];
  let stateIndex = 0, refIndex = 0, calls = 0;
  const jsx = (type, props) => ({ type, props: props || {} });
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = value; }];
    },
    useRef(initial) {
      const index = refIndex++;
      if (!(index in refs)) refs[index] = { current: initial };
      return refs[index];
    },
    useEffect() {},
  };
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'SafeAreaView', 'ActivityIndicator'].map(name => [name, name]));
  native.StyleSheet = { create: styles => styles };
  native.Animated = { View: 'Animated.View', Value: class { constructor() {} } };
  const data = deck(() => 0.75);
  const theme = evaluate(read('src/theme/colors.ts'), forbiddenImport);
  const screen = evaluate(read('src/screens/LoveReadingScreen.tsx'), name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return native;
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (name === '../components/ImmersiveScreen') return { ImmersiveScreen: 'ImmersiveScreen' };
    if (name === '../components/CardImage') return { CardImage: 'CardImage' };
    if (name === '../services/universe') return { performReading: async () => { calls++; return reading; } };
    if (name === '../services/loveReading') return loveContract;
    if (name === '../theme/colors') return theme;
    if (name === '../data') return data;
    if (name === '../hooks/useFonts') return { useFonts: () => true };
    if (name === 'expo-haptics') return {};
    return forbiddenImport(name);
  }).LoveReadingScreen;
  return {
    render() { stateIndex = 0; refIndex = 0; return screen({ onClose() {} }); },
    get calls() { return calls; },
  };
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

for (const synthesis of [undefined, 'První společný postřeh.\n\nDruhá souvislost.']) {
  test(`full reading ${synthesis ? 'shows synthesis after all three cards' : 'renders older reading without empty synthesis'} with no extra AI call`, async () => {
    const harness = loveScreenHarness({ ...validReading(), synthesis });
    const initial = harness.render();
    const start = nodes(initial, node => node.type === 'TouchableOpacity').find(button =>
      nodes(button, node => node.type === 'Text' && node.props.children === 'Odhal karty').length);
    await start.props.onPress();
    assert.equal(harness.calls, 1);
    const heading = 'Co ti karty říkají společně';
    for (let index = 0; index < 3; index++) {
      let tree = harness.render();
      assert.equal(nodes(tree, node => node.type === 'Text' && node.props.children === heading).length, 0);
      let card = nodes(tree, node => node.props?.nextButtonText)[0];
      card.props.onFlip();
      tree = harness.render();
      card = nodes(tree, node => node.props?.nextButtonText)[0];
      card.props.onNext();
    }
    const timeline = harness.render();
    assert.equal(harness.calls, 1);
    const texts = nodes(timeline, node => node.type === 'Text');
    const headingIndex = texts.findIndex(node => node.props.children === heading);
    if (synthesis) {
      assert.ok(headingIndex >= 0);
      const finalCardIndex = texts.findIndex(node => Array.isArray(node.props.children) && node.props.children.includes('Text vztah'));
      assert.ok(finalCardIndex >= 0 && finalCardIndex < headingIndex);
      assert.ok(texts.some(node => Array.isArray(node.props.children) && node.props.children.includes(synthesis)));
    } else assert.equal(headingIndex, -1);
  });
}

async function clientProbe({ status = 200, body = validReading(), jsonError, fetchError, mode = 'love_3_card' } = {}) {
  const diagnostics = [], logs = [];
  let jsonReads = 0;
  const service = evaluate(read('src/services/universe.ts'), name => {
    if (name === './loveReading') return loveContract;
    if (name === '../data') return {};
    if (name === '../store/appStore') return {
      useAppStore: { getState: () => ({ getUserContext: () => ({ zodiacSign: 'PRIVATE_CONTEXT_MARKER' }) }) },
    };
    return forbiddenImport(name);
  }, {
    console: {
      info: (tag, event) => { logs.push([tag, event]); diagnostics.push({ tag, ...event }); },
      error: (...args) => logs.push(args), log: (...args) => logs.push(args), warn: (...args) => logs.push(args),
    },
    fetch: async () => {
      if (fetchError) throw fetchError;
      return { status, ok: status >= 200 && status < 300, json: async () => {
        jsonReads++;
        if (jsonError) throw jsonError;
        return body;
      } };
    },
  });
  let result, error;
  try {
    result = await service.performReading({ mode, cards: [], spreadName: 'Mock', question: 'PRIVATE_QUESTION_MARKER' });
  } catch (caught) { error = caught; }
  return { result, error, diagnostics, jsonReads, logs };
}

for (const [name, options, category] of [
  ['504 non-JSON', { status: 504, jsonError: new SyntaxError('PRIVATE_HTML_MARKER') }, 'timeout'],
  ['401 non-JSON', { status: 401, jsonError: new SyntaxError('PRIVATE_HTML_MARKER') }, 'server'],
  ['500 non-JSON', { status: 500, jsonError: new SyntaxError('PRIVATE_HTML_MARKER') }, 'server'],
  ['502 validation error', { status: 502, body: { code: 'INVALID_LOVE_READING', answer: 'PRIVATE_ERROR_MARKER' } }, 'invalid'],
  ['502 non-JSON', { status: 502, jsonError: new SyntaxError('PRIVATE_HTML_MARKER') }, 'server'],
  ['interrupted successful body', { jsonError: new TypeError('PRIVATE_TRANSPORT_MARKER') }, 'network'],
  ['malformed successful JSON', { jsonError: new SyntaxError('PRIVATE_OUTPUT_MARKER') }, 'invalid'],
  ['missing required section', { body: { readingType: 'love_3_card', sections: validSections().slice(1) } }, 'invalid'],
  ['failed connection', { fetchError: new TypeError('PRIVATE_TRANSPORT_MARKER') }, 'network'],
]) {
  test(`classification: ${name} is ${category}, with content-free client diagnostics`, async () => {
    const outcome = await clientProbe(options);
    assert.equal(outcome.error.code, category);
    assert.equal(outcome.result, undefined);
    assert.equal(outcome.diagnostics.length, 1);
    const event = outcome.diagnostics[0];
    assert.equal(event.category, category);
    assert.equal(event.httpStatus, options.fetchError ? null : options.status ?? 200);
    assert.ok(Number.isFinite(event.durationMs) && event.durationMs >= 0);
    assert.deepEqual(Object.keys(event).sort(), ['category', 'durationMs', 'httpStatus', 'tag']);
    assert.doesNotMatch(JSON.stringify(event), /PRIVATE_/);
    assert.doesNotMatch(JSON.stringify(outcome.logs), /PRIVATE_/);
    if ([401, 500, 504].includes(options.status)) assert.equal(outcome.jsonReads, 0);
  });
}

for (const synthesis of [undefined, 'PRIVATE_SYNTHESIS_MARKER']) {
  test(`valid HTTP 200 ${synthesis ? 'with' : 'without'} synthesis preserves reading and logs only metadata`, async () => {
    const reading = { ...validReading(), synthesis };
    reading.sections[0].text = 'PRIVATE_INTERPRETATION_MARKER';
    const { result, error, diagnostics, logs } = await clientProbe({ body: reading });
    assert.equal(error, undefined);
    assert.equal(result.sections.length, 3);
    assert.equal(result.synthesis, synthesis);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].category, 'success');
    assert.doesNotMatch(JSON.stringify(diagnostics), /PRIVATE_/);
    assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_/);
  });
}

for (const [reason, rawText] of [
  ['json_parse', 'PRIVATE_BAD_JSON_MARKER'],
  ['root_shape', JSON.stringify({ sections: validSections(), private: 'PRIVATE_MARKER' })],
  ['section_count', JSON.stringify({ sections: validSections().slice(1) })],
  ['section_shape', JSON.stringify({ sections: [null, ...validSections().slice(1)] })],
  ['section_key', JSON.stringify({ sections: [{ key: 'PRIVATE_KEY_MARKER', text: 'Mock' }, ...validSections().slice(1)] })],
  ['duplicate_key', JSON.stringify({ sections: [validSections()[0], validSections()[0], validSections()[2]] })],
  ['section_text', JSON.stringify({ sections: [{ key: 'ty', text: '' }, ...validSections().slice(1)] })],
]) {
  test(`backend diagnostics explain ${reason} without weakening validation or logging content`, async () => {
    const api = backend(rawText);
    const { status, body } = await api.request();
    assert.equal(status, 502);
    assert.equal(body.code, 'INVALID_LOVE_READING');
    assert.equal(api.calls.length, 1);
    assert.equal(api.diagnostics.length, 1);
    const event = api.diagnostics[0];
    assert.equal(event.httpStatus, 502);
    assert.equal(event.category, 'invalid');
    assert.equal(event.validationFailure, reason);
    assert.equal(event.stopReason, 'end_turn');
    assert.equal(event.outputTokens, 123);
    assert.ok(Number.isFinite(event.durationMs) && event.durationMs >= 0);
    assert.doesNotMatch(JSON.stringify(event), /PRIVATE_|Mock question/);
    assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_|Mock question/);
  });
}

for (const stopReason of ['max_tokens', 'refusal', 'PRIVATE_STOP_MARKER']) {
  test(`backend diagnostics distinguish model stopping: ${stopReason}`, async () => {
    const api = backend(JSON.stringify({ sections: validSections() }), stopReason);
    assert.equal((await api.request()).status, 502);
    assert.equal(api.diagnostics[0].validationFailure, 'stop_reason');
    assert.equal(api.diagnostics[0].stopReason, stopReason.startsWith('PRIVATE_') ? 'unknown' : stopReason);
    assert.doesNotMatch(JSON.stringify(api.diagnostics), /PRIVATE_/);
    assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_/);
  });
}

test('backend diagnostics cover unexpected content and provider failure without raw errors', async () => {
  const content = backend('', 'end_turn', { content: [] });
  assert.equal((await content.request()).status, 502);
  assert.equal(content.diagnostics[0].validationFailure, 'content_shape');
  for (const [name, category] of [['APIConnectionTimeoutError', 'provider_timeout'], ['APIConnectionError', 'provider_network'], ['Error', 'provider_error']]) {
    const error = new Error('PRIVATE_PROVIDER_ERROR_MARKER'); error.name = name;
    const api = backend('', 'end_turn', { providerError: error });
    assert.equal((await api.request()).status, 500);
    assert.equal(api.calls.length, 1);
    assert.equal(api.diagnostics[0].category, category);
    assert.equal(api.diagnostics[0].stopReason, null);
    assert.equal(api.diagnostics[0].outputTokens, null);
    assert.doesNotMatch(JSON.stringify(api.diagnostics), /PRIVATE_/);
    assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_/);
  }
});

test('successful backend diagnostics contain metadata only; other modes keep their contracts', async () => {
  const api = backend(JSON.stringify({ sections: validSections(), synthesis: 'PRIVATE_SYNTHESIS_MARKER' }));
  const { body, status } = await api.request();
  assert.equal(status, 200);
  assert.equal(body.synthesis, 'PRIVATE_SYNTHESIS_MARKER');
  assert.equal(api.diagnostics[0].category, 'success');
  assert.equal(api.diagnostics[0].httpStatus, 200);
  assert.equal(api.diagnostics[0].outputTokens, 123);
  assert.doesNotMatch(JSON.stringify(api.diagnostics), /PRIVATE_/);
  assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_/);
  const nonLove = await clientProbe({ mode: 'daily', body: { answer: 'Mock daily' } });
  assert.equal(nonLove.result.answer, 'Mock daily');
  assert.equal(nonLove.diagnostics.length, 0);
});
