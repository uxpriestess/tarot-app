const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.createSourceFile('App.tsx',
  fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['singleCardReading', 'singleCardMounted', 'handleDrawCard', 'handleClose', 'handleDailyDraw'];
const declarations = [];
let lifecycle;
function visit(node) {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) {
    declarations.push(`const ${node.getText(source)};`);
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
      node.getText(source).includes('singleCardMounted.current')) lifecycle = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.equal(declarations.length, names.length);
assert.ok(lifecycle);
const code = ts.transpileModule(`${declarations.join('\n')}\n${lifecycle};
  exports.api = { draw: handleDrawCard, close: handleClose, daily: handleDailyDraw };`,
  { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Execute the real App handlers with state setters that can also defer updater
// execution, exercising ownership checks beyond the async response boundary.
function session({ onboarding = false } = {}) {
  const calls = [], draws = [], errors = [], updates = [], transitions = [];
  let current = null, cleanup, queueUpdates = false, dailyDraws = 0;
  const deckCard = { id: 'card', name: 'The Fool', nameCzech: 'Blázen', keywords: ['start'] };
  const context = {
    exports: {}, useRef: value => ({ current: value }),
    useEffect: effect => { cleanup = effect(); },
    drawCard: subset => {
      draws.push(subset);
      return { card: deckCard, position: draws.length % 2 ? 'reversed' : 'upright' };
    },
    askUniverse: (question, mode, cards) => {
      const pending = deferred();
      calls.push({ question, mode, cards, ...pending });
      return pending.promise;
    },
    setCurrentCard: value => {
      if (typeof value !== 'function') current = value;
      else if (queueUpdates) updates.push(value);
      else current = value(current);
    },
    dailyDraw: { reset() {}, drawDailyCard() { dailyDraws++; } },
    isFirstCardDraw: onboarding, onboardingStep: onboarding ? 'firstCard' : '',
    setIsFirstCardDraw: value => transitions.push(value),
    setOnboardingStep: value => transitions.push(value),
    console: { error: (...args) => errors.push(args) },
  };
  vm.runInNewContext(code, context);
  return {
    ...context.exports.api, calls, draws, errors, transitions, deckCard,
    unmount: () => cleanup(),
    deferUpdates: () => { queueUpdates = true; },
    flush: () => { for (const update of updates.splice(0)) current = update(current); },
    get current() { return current; }, get dailyDraws() { return dailyDraws; },
  };
}

for (const mode of ['daily', 'tomorrow']) {
  test(`${mode}: duplicate taps draw once and preserve immutable snapshot/payload`, async () => {
    const s = session();
    const subset = ['allowed'];
    const running = s.draw(subset, mode);
    const snapshot = s.current;
    await s.draw(subset, mode);
    assert.equal(s.draws.length, 1);
    assert.equal(s.draws[0], subset);
    assert.equal(s.calls.length, 1);
    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.card));
    assert.ok(Object.isFrozen(snapshot.card.keywords));
    assert.equal(Object.isFrozen(s.deckCard), false);
    s.deckCard.nameCzech = 'changed';
    s.deckCard.keywords.push('changed');
    assert.equal(snapshot.card.nameCzech, 'Blázen');
    assert.equal(snapshot.card.keywords.length, 1);
    assert.equal(s.calls[0].mode, mode);
    assert.equal(s.calls[0].question, 'Výklad pro kartu: Blázen (obrácená)');
    assert.equal(JSON.stringify(s.calls[0].cards), JSON.stringify([
      { name: 'The Fool', nameCzech: 'Blázen', position: 'reversed' },
    ]));
    s.calls[0].resolve({ answer: 'own meaning' }); await running;
    assert.equal(s.current.aiMeaning, 'own meaning');
    assert.equal(s.current.card, snapshot.card);
    await s.draw();
    assert.equal(s.calls.length, 1); // completion does not unlock an open reading
  });
}

for (const staleFailure of [false, true]) {
  for (const oldFirst of [false, true]) {
    test(`close/reopen: old ${staleFailure ? 'error' : 'success'} ${oldFirst ? 'before' : 'after'} new response cannot overwrite or unlock`, async () => {
      const s = session();
      const old = s.draw(); s.close();
      assert.equal(s.current, null);
      const fresh = s.draw(undefined, 'tomorrow');
      const snapshot = s.current;
      const settleOld = async () => {
        if (staleFailure) s.calls[0].reject(new Error('old error'));
        else s.calls[0].resolve({ answer: 'old meaning' });
        await old;
      };
      if (oldFirst) {
        await settleOld();
        assert.equal(s.current, snapshot);
        await s.draw();
        assert.equal(s.calls.length, 2);
      }
      s.calls[1].resolve({ answer: 'new meaning' }); await fresh;
      if (!oldFirst) await settleOld();
      assert.equal(s.current.card, snapshot.card);
      assert.equal(s.current.position, 'upright');
      assert.equal(s.current.aiMeaning, 'new meaning');
      assert.equal(s.errors.length, 0);
      await s.draw();
      assert.equal(s.calls.length, 2);
    });
  }
}

test('current error keeps ownership until close; closing permits another draw', async () => {
  const s = session();
  const running = s.draw();
  const snapshot = s.current;
  s.calls[0].reject(new Error('current error')); await running;
  assert.equal(s.errors.length, 1);
  assert.equal(s.current, snapshot);
  await s.draw(); assert.equal(s.calls.length, 1);
  s.close(); const fresh = s.draw();
  assert.equal(s.calls.length, 2);
  s.calls[1].resolve({ answer: 'reopened' }); await fresh;
  assert.equal(s.current.aiMeaning, 'reopened');
});

test('response updater queued before close cannot modify reopened reading', async () => {
  const s = session();
  s.deferUpdates();
  const old = s.draw();
  s.calls[0].resolve({ answer: 'old meaning' }); await old;
  s.close(); const fresh = s.draw(); const snapshot = s.current;
  s.flush(); assert.equal(s.current, snapshot);
  s.calls[1].resolve({ answer: 'new meaning' }); await fresh;
  s.flush(); assert.equal(s.current.aiMeaning, 'new meaning');
});

test('switching to Daily invalidates shared single-card response', async () => {
  const s = session(); const running = s.draw();
  s.daily(); assert.equal(s.current, null); assert.equal(s.dailyDraws, 1);
  s.calls[0].resolve({ answer: 'old meaning' }); await running;
  assert.equal(s.current, null);
});

for (const fail of [false, true]) {
  test(`unmount invalidates late ${fail ? 'error' : 'success'} and blocks starts`, async () => {
    const s = session(); const running = s.draw(); const snapshot = s.current;
    s.unmount();
    if (fail) s.calls[0].reject(new Error('late error'));
    else s.calls[0].resolve({ answer: 'late meaning' });
    await running; await s.draw();
    assert.equal(s.current, snapshot);
    assert.equal(s.calls.length, 1); assert.equal(s.errors.length, 0);
  });
}

test('First Card close preserves the existing signup transition', async () => {
  const s = session({ onboarding: true }); const running = s.draw();
  s.close(); assert.deepEqual(s.transitions, [false, 'signUp']);
  s.calls[0].resolve({ answer: 'late meaning' }); await running;
  assert.equal(s.current, null);
});
