const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function evaluate(source, requireMock = name => { throw new Error(`Unexpected import ${name}`); }, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: requireMock, AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const valid = () => ({ readingType: 'finance_3_card', sections: ['vysledek', 'dnes', 'vyzva'].map(key => ({ key, text: `PRIVATE_${key}` })) });
const finance = evaluate(read('src/services/financeReading.ts'));
const love = evaluate(read('src/services/loveReading.ts'));

function service(fetchMock) {
  const calls = [], logs = [], timers = new Map();
  let timerId = 0, jsonReads = 0;
  const contract = evaluate(read('src/services/financeReading.ts'), undefined, {
    setTimeout(callback, delay) { assert.equal(delay, 45000); timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  const api = evaluate(read('src/services/universe.ts'), name => {
    if (name === './financeReading') return contract;
    if (name === './loveReading') return love;
    if (name === '../data') return {};
    if (name === '../store/appStore') return { useAppStore: { getState: () => ({ getUserContext: () => ({ zodiacSign: 'store', name: 'PRIVATE_NAME' }) }) } };
    throw new Error(`Unexpected import ${name}`);
  }, {
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      return fetchMock ? fetchMock(options) : { ok: true, status: 200, json: async () => { jsonReads++; return valid(); } };
    },
    console: { info: (...args) => logs.push(args), error: (...args) => logs.push(args) },
  });
  const request = { mode: 'finance_3_card', spreadName: 'Zázemí', cards: [], question: 'PRIVATE_QUESTION' };
  return { ...api, contract, calls, logs, timers, request,
    fire() { for (const callback of [...timers.values()]) callback(); },
    get jsonReads() { return jsonReads; },
  };
}
function assertSafeLogs(api, category) {
  assert.equal(api.logs.length, 1);
  assert.equal(api.logs[0][0], '[finance-reading:client]');
  assert.equal(api.logs[0][1].category, category);
  assert.deepEqual(Object.keys(api.logs[0][1]).sort(), ['category', 'durationMs', 'httpStatus']);
  assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_/);
  assert.equal(api.timers.size, 0);
}

test('transport validates original response, canonicalizes keys and whitelists frozen context', async () => {
  const api = service();
  const result = await api.performReading({ ...api.request, userContext: { zodiacSign: 'snapshot', genderPreference: 'neutral', name: 'PRIVATE_NAME' } });
  assert.deepEqual(Array.from(result.sections, section => section.key), ['dnes', 'vyzva', 'vysledek']);
  const sent = JSON.parse(api.calls[0].body);
  assert.deepEqual(sent.userContext, { zodiacSign: 'snapshot', genderPreference: 'neutral' });
  assert.equal(sent.mode, 'finance_3_card');
  assert.equal(api.calls.length, 1); assertSafeLogs(api, 'success');
});
test('explicitly absent snapshot context does not pick up a later profile', async () => {
  const api = service(); await api.performReading({ ...api.request, userContext: undefined });
  assert.equal('userContext' in JSON.parse(api.calls[0].body), false);
});
for (const [status, body, expected] of [
  [408, null, 'timeout'], [504, null, 'timeout'], [400, null, 'server'], [401, null, 'server'], [500, null, 'server'],
  [502, { code: 'INVALID_FINANCE_READING' }, 'invalid'], [502, null, 'server'],
]) {
  test(`HTTP ${status} yields typed ${expected}, never interpretation sections`, async () => {
    const api = service(async () => ({ ok: false, status, json: async () => { if (!body) throw new SyntaxError('PRIVATE_HTML'); return body; } }));
    await assert.rejects(api.performReading(api.request), error => error instanceof api.contract.FinanceReadingError && error.code === expected && !error.sections);
    assert.equal(api.calls.length, 1); assertSafeLogs(api, expected);
  });
}
for (const [name, response] of [
  ['missing reading type', { sections: valid().sections }],
  ['wrong reading type', { ...valid(), readingType: 'love_3_card' }],
  ['missing sections', { readingType: 'finance_3_card', answer: 'PRIVATE_FALLBACK' }],
  ['incomplete sections', { ...valid(), sections: valid().sections.slice(1) }],
  ['duplicate sections', { ...valid(), sections: [valid().sections[0], valid().sections[0], valid().sections[2]] }],
  ['error envelope', { readingType: 'error', sections: [{ key: 'error', text: 'PRIVATE_ERROR' }] }],
]) {
  test(`transport rejects ${name} before generic fallback`, async () => {
    const api = service(async () => ({ ok: true, status: 200, json: async () => response }));
    await assert.rejects(api.performReading(api.request), error => error.code === 'invalid');
    assertSafeLogs(api, 'invalid');
  });
}
for (const [name, fetchMock, category] of [
  ['network error', async () => { throw new TypeError('PRIVATE_NETWORK'); }, 'network'],
  ['invalid JSON', async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('PRIVATE_JSON'); } }), 'invalid'],
  ['interrupted body', async () => ({ ok: true, status: 200, json: async () => { throw new TypeError('PRIVATE_BODY'); } }), 'network'],
]) {
  test(`${name} is a typed failure with metadata-only diagnostics`, async () => {
    const api = service(fetchMock);
    await assert.rejects(api.performReading(api.request), error => error.code === category);
    assertSafeLogs(api, category);
  });
}
for (const bodyStalled of [false, true]) {
  test(`45-second deadline settles stalled ${bodyStalled ? 'body parsing' : 'fetch'} even if abort is ignored`, async () => {
    const pending = deferred();
    const api = service(async () => bodyStalled ? { ok: true, status: 200, json: () => pending.promise } : pending.promise);
    const running = api.performReading(api.request);
    const rejected = assert.rejects(running, error => error.code === 'timeout');
    await tick(); api.fire(); await rejected;
    assert.equal(api.calls[0].signal.aborted, true); assertSafeLogs(api, 'timeout');
    pending.resolve(bodyStalled ? valid() : { ok: true, status: 200, json: async () => valid() });
    await tick(); assert.equal(api.logs.length, 1);
  });
}
test('external cancellation aborts transport, clears deadline and ignores late results', async () => {
  const pending = deferred(), controller = new AbortController();
  const api = service(() => pending.promise);
  const running = api.performReading(api.request, { signal: controller.signal });
  const rejected = assert.rejects(running, error => error.code === 'aborted');
  await tick(); controller.abort(); await rejected;
  assert.equal(api.calls[0].signal.aborted, true); assertSafeLogs(api, 'aborted');
  pending.resolve({ ok: true, status: 200, json: async () => valid() }); await tick();
  assert.equal(api.logs.length, 1);
});
test('already aborted request never starts fetch', async () => {
  const api = service(), controller = new AbortController(); controller.abort();
  await assert.rejects(api.performReading(api.request, { signal: controller.signal }), error => error.code === 'aborted');
  assert.equal(api.calls.length, 0); assertSafeLogs(api, 'aborted');
});

function hookHarness(reader) {
  const states = [], refs = [], cleanups = [], calls = [], draws = [];
  let stateIndex = 0, refIndex = 0, mounting = true;
  let context = { zodiacSign: 'original', genderPreference: 'feminine', name: 'PRIVATE_NAME' };
  const originalCard = { id: 'same-card', name: 'The Fool', nameCzech: 'Blázen', keywords: ['start'] };
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
    useEffect(effect) { if (mounting) cleanups.push(effect()); },
  };
  const api = evaluate(read('src/hooks/useFinanceReading.ts'), name => {
    if (name === 'react') return react;
    if (name === '../services/financeReading') return finance;
    if (name === '../store/appStore') return { useAppStore: { getState: () => ({ getUserContext: () => context }) } };
    if (name === '../data') return { drawCard: () => {
      const draw = { card: originalCard, position: draws.length % 2 ? 'upright' : 'reversed' };
      draws.push(draw); return draw;
    } };
    if (name === '../services/universe') return { performReading: (request, options) => {
      if (reader) { calls.push({ request, ...options }); return reader(request, options); }
      const pending = deferred(); calls.push({ request, ...options, ...pending }); return pending.promise;
    } };
    throw new Error(`Unexpected import ${name}`);
  });
  return { calls, draws, originalCard,
    render() { stateIndex = refIndex = 0; const result = api.useFinanceReading(); mounting = false; return result; },
    unmount() { for (const cleanup of cleanups) cleanup?.(); },
    changeContext(value) { context = value; },
  };
}

test('controller starts once, freezes complete snapshot, keeps repeats/orientations and caches by key', async () => {
  const h = hookHarness(), controller = h.render();
  assert.equal(controller.status, 'idle'); assert.equal(h.calls.length, 0);
  const snapshot = controller.start();
  controller.start(); h.render().start();
  assert.equal(h.draws.length, 3); assert.equal(h.calls.length, 1);
  assert.equal(h.render().status, 'pending');
  assert.deepEqual(Array.from(snapshot.cards, draw => draw.key), ['dnes', 'vyzva', 'vysledek']);
  assert.deepEqual(Array.from(snapshot.cards, draw => draw.card.id), ['same-card', 'same-card', 'same-card']);
  assert.deepEqual(Array.from(snapshot.request.cards, card => card.position), ['reversed', 'upright', 'reversed']);
  assert.deepEqual(Array.from(snapshot.request.cards, card => card.label), ['Dnes', 'Výzva', 'Výsledek']);
  for (const object of [snapshot, snapshot.cards, snapshot.request, snapshot.request.cards, snapshot.request.userContext,
    ...snapshot.cards, ...snapshot.cards.map(draw => draw.card), ...snapshot.cards.map(draw => draw.card.keywords), ...snapshot.request.cards]) assert.ok(Object.isFrozen(object));
  assert.equal(Object.isFrozen(h.originalCard), false);
  h.originalCard.keywords.push('changed'); h.originalCard.nameCzech = 'changed';
  assert.equal(snapshot.cards[0].card.nameCzech, 'Blázen'); assert.equal(snapshot.cards[0].card.keywords.length, 1);
  assert.equal('name' in snapshot.request.userContext, false);
  h.calls[0].resolve(valid()); await tick();
  assert.equal(h.render().status, 'ready');
  assert.deepEqual({ ...h.render().meanings }, { dnes: 'PRIVATE_dnes', vyzva: 'PRIVATE_vyzva', vysledek: 'PRIVATE_vysledek' });
  assert.ok(Object.isFrozen(h.render().meanings));
  h.render().start(); h.render().retry();
  assert.equal(h.calls.length, 1);
});
for (const failure of ['network', 'timeout', 'invalid', 'server']) {
  test(`explicit retry after ${failure} reuses exact snapshot and context with synchronous guards`, async () => {
    const h = hookHarness(); h.render().start();
    const snapshot = h.render().snapshot, payload = JSON.stringify(h.calls[0].request);
    if (failure === 'invalid') h.calls[0].resolve({ ...valid(), sections: [] });
    else h.calls[0].reject(new finance.FinanceReadingError(failure));
    await tick(); assert.equal(h.render().status, 'error'); assert.equal(h.render().error.code, failure);
    h.changeContext({ zodiacSign: 'changed', genderPreference: 'masculine' });
    const errorController = h.render(); const retry = errorController.retry();
    errorController.retry(); h.render().retry();
    assert.equal(h.calls.length, 2); assert.equal(h.draws.length, 3);
    assert.equal(h.calls[1].request, h.calls[0].request);
    assert.equal(JSON.stringify(h.calls[1].request), payload);
    assert.equal(h.render().snapshot, snapshot); assert.equal(h.render().error, null);
    h.calls[1].resolve(valid()); await retry;
    assert.equal(h.render().status, 'ready');
  });
}
for (const fail of [false, true]) {
  for (const oldFirst of [false, true]) {
    test(`reset/new reading rejects stale ${fail ? 'error' : 'success'} and cleanup ${oldFirst ? 'before' : 'after'} current completion`, async () => {
      const h = hookHarness(); h.render().start();
      h.render().reset(); assert.equal(h.calls[0].signal.aborted, true);
      assert.equal(h.render().status, 'idle');
      h.render().start(); const current = h.render();
      const settleOld = async () => { if (fail) h.calls[0].reject(new Error('PRIVATE_OLD')); else h.calls[0].resolve(valid()); await tick(); };
      if (oldFirst) {
        await settleOld(); assert.equal(h.render().status, 'pending');
        assert.equal(h.render().snapshot, current.snapshot); h.render().retry(); h.render().start();
        assert.equal(h.calls.length, 2); // stale finally cannot unlock this attempt
      }
      h.calls[1].resolve(valid()); await tick();
      if (!oldFirst) await settleOld();
      assert.equal(h.render().status, 'ready'); assert.equal(h.render().snapshot, current.snapshot);
      assert.equal(h.render().error, null);
    });
  }
}
test('stale cleanup cannot release a newer retry after reset', async () => {
  const h = hookHarness(); h.render().start(); h.render().reset(); h.render().start();
  h.calls[1].reject(new finance.FinanceReadingError('network')); await tick();
  const running = h.render().retry();
  h.calls[0].resolve(valid()); await tick();
  assert.equal(h.render().status, 'pending');
  h.render().retry(); h.render().start(); assert.equal(h.calls.length, 3);
  h.calls[2].resolve(valid()); await running; assert.equal(h.render().status, 'ready');
});
for (const fail of [false, true]) {
  test(`unmount aborts and suppresses late ${fail ? 'error' : 'success'}`, async () => {
    const h = hookHarness(); h.render().start();
    const before = h.render(); h.unmount(); assert.equal(h.calls[0].signal.aborted, true);
    if (fail) h.calls[0].reject(new Error('late')); else h.calls[0].resolve(valid()); await tick();
    const after = h.render();
    assert.equal(after.status, before.status); assert.equal(after.snapshot, before.snapshot);
    after.start(); assert.equal(h.calls.length, 1);
  });
}
test('ordinary rerenders/tab visibility changes preserve reading and cached state', async () => {
  const h = hookHarness(); h.render().start(); const snapshot = h.render().snapshot;
  for (let i = 0; i < 5; i++) assert.equal(h.render().snapshot, snapshot);
  assert.equal(h.calls[0].signal.aborted, false);
  h.calls[0].resolve(valid()); await tick();
  const meanings = h.render().meanings;
  assert.equal(h.render().meanings, meanings); assert.equal(h.calls.length, 1);
});

test('real controller and transport send byte-identical payload on same-reading retry', async () => {
  let attempt = 0;
  const api = service(async () => {
    if (++attempt === 1) throw new TypeError('PRIVATE_NETWORK');
    return { ok: true, status: 200, json: async () => valid() };
  });
  const h = hookHarness(api.performReading);
  h.render().start(); await tick();
  assert.equal(h.render().status, 'error');
  h.changeContext({ zodiacSign: 'new profile', genderPreference: 'masculine' });
  await h.render().retry();
  assert.equal(h.render().status, 'ready');
  assert.equal(api.calls.length, 2);
  assert.equal(api.calls[0].body, api.calls[1].body);
  assert.equal(JSON.parse(api.calls[1].body).userContext.zodiacSign, 'original');
  assert.equal(h.draws.length, 3); assert.equal(api.timers.size, 0);
});

// Execute actual screen event handlers against the real controller; no native UI.
function screenHandlers(controller) {
  const source = ts.createSourceFile('screen.tsx', read('src/screens/TarotReadingScreen.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['SPREADS', 'startReading', 'resetReading', 'flipCard'];
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(declarations.length, names.length);
  const logs = [], drawn = [], stages = [], progressUpdates = [], sharedMeanings = [];
  const api = evaluate(`${declarations.join('\n')}\nexports.api = { startReading, resetReading, flipCard, SPREADS };`, name => name, {
    financeReading: controller, selectedSpread: { id: 'finance' }, revealedCount: 0, flippedCards: [],
    setDrawnCards: cards => drawn.push(cards), setSelectedSpread() {},
    setFlippedCards: value => progressUpdates.push(value), setRevealedCount: value => progressUpdates.push(value),
    setCardMeanings: value => sharedMeanings.push(value), setStage: stage => stages.push(stage),
    fadeAnim: { setValue() {} }, Animated: { timing: () => ({ start() {} }) },
    drawCard() { throw new Error('Finance must draw only through its controller'); },
    console: { log: (...args) => logs.push(args) },
  }).api;
  return { ...api, logs, drawn, stages, progressUpdates, sharedMeanings };
}
test('selecting Zázemí starts once; pending flips do not fetch, log readings or block', async () => {
  const h = hookHarness(), screen = screenHandlers(h.render());
  const spread = screen.SPREADS.find(spread => spread.id === 'finance');
  assert.equal(spread.name, 'Zázemí');
  assert.equal(spread.description, 'Peníze, práce, stabilita.');
  screen.startReading(spread); screen.startReading(spread);
  assert.equal(h.calls.length, 1); assert.equal(h.draws.length, 3); assert.equal(screen.drawn.length, 1);
  const logCount = screen.logs.length; screen.flipCard(0);
  assert.equal(screen.logs.length, logCount); assert.equal(h.calls.length, 1);
  assert.deepEqual(screen.stages, ['reading']);
  screen.resetReading(); assert.equal(h.calls[0].signal.aborted, true);
  h.calls[0].resolve(valid()); await tick(); assert.equal(h.render().status, 'idle');
});

test('retry and response keep existing reveal progress and never publish Finance text to shared meanings', async () => {
  const h = hookHarness(), screen = screenHandlers(h.render());
  screen.startReading(screen.SPREADS.find(spread => spread.id === 'finance'));
  screen.flipCard(0);
  const progressCount = screen.progressUpdates.length;
  h.calls[0].reject(new finance.FinanceReadingError('timeout')); await tick();
  const retry = h.render().retry();
  assert.equal(screen.progressUpdates.length, progressCount);
  h.calls[1].resolve(valid()); await retry;
  assert.equal(screen.progressUpdates.length, progressCount);
  assert.equal(h.render().status, 'ready');
  assert.equal(screen.sharedMeanings.length, 1);
  assert.equal(screen.sharedMeanings[0].length, 0); // only the preexisting start reset
  assert.equal(screen.drawn.length, 1);
  assert.equal(h.draws.length, 3);
});
