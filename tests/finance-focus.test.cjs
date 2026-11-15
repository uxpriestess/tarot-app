const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, AbortController, require: name => { if (!(name in imports)) throw Error(name); return imports[name]; } });
  return exports;
}
const keys = ['dnes', 'vyzva', 'vysledek'];
const state = load('src/components/financeFocusState.ts', { '../services/financeReading': { FINANCE_SECTION_KEYS: keys } });
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(t => nodes(t, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function harness(status = 'pending', controller, layout = {}) {
  let progress = state.initialFinanceFocus(), tree, index = 0, mounted = true;
  const refs = [], animations = [], cleanups = [];
  let retryCount = 0;
  const reading = controller || {
    status, snapshot: { cards: keys.map((key, i) => ({ key, position: i === 1 ? 'reversed' : 'upright', card: { imageName: `${key}.png`, nameCzech: `CARD_${key}` } })) },
    meanings: { vysledek: 'TEXT_vysledek', dnes: 'TEXT_dnes', vyzva: 'TEXT_vyzva' },
    error: null,
    retry() { if (reading.status === 'error') { retryCount++; reading.status = 'pending'; } },
  };
  const react = {
    useContext: () => layout.tabBarHeight,
    useReducer: () => [progress, action => { progress = state.financeFocusReducer(progress, action); }],
    useRef: initial => refs[index++] ??= { current: initial },
    useEffect: effect => { if (mounted) cleanups.push(effect()); },
  };
  const jsx = (type, props) => ({ type, props });
  const rn = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'Modal', 'ScrollView', 'ActivityIndicator'].map(s => [s, s]));
  rn.Platform = { OS: 'ios' }; rn.StyleSheet = { create: value => value };
  rn.useWindowDimensions = () => layout.window ?? ({ width: 375, height: 667 });
  rn.Animated = { View: 'AnimatedView', Value: class { setValue() {} interpolate() { return '0deg'; } }, timing: () => {
    const animation = { start(callback) { animation.callback = callback; animations.push(animation); }, stop() { animation.stopped = true; animation.callback?.({ finished: false }); } };
    return animation;
  } };
  const { FinanceSpread } = load('src/components/FinanceSpread.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': rn,
    'react-native-safe-area-context': { useSafeAreaInsets: () => layout.insets ?? ({ top: 44, bottom: 34 }) },
    '@react-navigation/bottom-tabs': { BottomTabBarHeightContext: {} },
    '@expo/vector-icons': { Ionicons: 'Icon' }, './CardImage': { CardImage: 'CardImage' }, './financeFocusState': state,
  });
  const render = () => { index = 0; tree = FinanceSpread({ reading, onReset() {} }); mounted = false; return tree; };
  const buttons = () => nodes(render(), n => n.type === 'TouchableOpacity');
  const byText = text => buttons().find(n => nodes(n, child => child.type === 'Text' && child.props.children === text).length);
  return {
    reading, render, get progress() { return progress; }, get retryCount() { return retryCount; },
    open(i) { const button = buttons().filter(n => n.props.accessibilityLabel?.includes('otevřít kartu') || n.props.accessibilityLabel?.includes('přečíst výklad znovu'))[i]; if (!button.props.disabled) button.props.onPress(); },
    close() { byText('Zpět ke kartám').props.onPress(); },
    press(text) { const button = byText(text); assert.ok(button, text); button.props.onPress(); },
    finish() { const animation = animations.shift(); assert.ok(animation); if (!animation.stopped) animation.callback({ finished: true }); },
    flip(text) { this.press(text); this.finish(); render(); this.finish(); render(); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
    text() { return nodes(render(), n => n.type === 'Text').map(n => n.props.children).join(' '); },
  };
}

test('only the next position opens; focus does not reveal; closing and reopening preserve both incomplete faces', () => {
  const h = harness(); h.open(1); assert.equal(h.progress.focused, null);
  h.open(0); assert.equal(h.progress.faces.dnes, 'back'); h.close(); h.open(0);
  assert.equal(h.progress.faces.dnes, 'back'); h.flip('Odhalit kartu'); h.close(); h.open(0);
  assert.equal(h.progress.faces.dnes, 'illustration');
  h.flip('Přečíst výklad'); h.close(); h.open(1); assert.equal(h.progress.focused, null);
  h.open(0); assert.equal(h.progress.faces.dnes, 'interpretation');
});
test('pending interpretation shows loading; late response preserves face and maps keyed text', () => {
  const h = harness(); h.open(0); h.flip('Odhalit kartu'); h.flip('Přečíst výklad');
  assert.match(h.text(), /připravuje tvůj výklad/); assert.doesNotMatch(h.text(), /TEXT_/);
  h.reading.status = 'ready'; assert.match(h.text(), /TEXT_dnes/); assert.doesNotMatch(h.text(), /TEXT_vyzva|TEXT_vysledek/);
  assert.equal(h.progress.faces.dnes, 'interpretation');
});
test('early response never automatically flips; all completed cards reopen cached interpretations in canonical order', () => {
  const h = harness('ready');
  for (let i = 0; i < 3; i++) {
    h.open(i); assert.equal(h.progress.faces[keys[i]], 'back'); assert.doesNotMatch(h.text(), /TEXT_/);
    h.flip('Odhalit kartu'); assert.doesNotMatch(h.text(), /TEXT_/); h.flip('Přečíst výklad');
    assert.match(h.text(), new RegExp(`TEXT_${keys[i]}`)); h.close();
  }
  assert.deepEqual(Array.from(h.progress.completed), keys);
  h.open(1); assert.match(h.text(), /TEXT_vyzva/); assert.match(h.text(), /Obrácená poloha/);
  assert.equal(h.progress.faces.vyzva, 'interpretation'); assert.equal(h.retryCount, 0);
});
test('response arriving during flip does not skip the illustration', () => {
  const h = harness(); h.open(0); h.press('Odhalit kartu'); h.reading.status = 'ready'; h.finish(); h.render(); h.finish();
  assert.equal(h.progress.faces.dnes, 'illustration'); assert.doesNotMatch(h.text(), /TEXT_/);
});
test('rapid flip taps cannot skip a face, and closing cancels an unfinished flip', () => {
  const h = harness(); h.open(0); h.press('Odhalit kartu'); h.press('Odhalit kartu'); h.finish(); h.render();
  h.press('Přečíst výklad'); h.finish(); assert.equal(h.progress.faces.dnes, 'illustration');
  h.press('Přečíst výklad'); h.close(); h.finish(); h.open(0); assert.equal(h.progress.faces.dnes, 'illustration');
});
test('timeout/error exposes explicit retry, keeps progress, and duplicate retry taps start only once', () => {
  const h = harness('error'); h.reading.error = { code: 'timeout' };
  h.open(0); h.flip('Odhalit kartu'); h.flip('Přečíst výklad'); assert.match(h.text(), /příliš dlouho/);
  h.press('Zkusit znovu'); h.render(); assert.match(h.text(), /připravuje tvůj výklad/);
  assert.equal(h.retryCount, 1); assert.equal(h.progress.faces.dnes, 'interpretation');
  h.close(); h.open(0); assert.equal(h.progress.completed.length, 0);
});
test('Focus retains reversed artwork, safe areas, scrollable selectable text and accessible return', () => {
  const h = harness('ready'); h.open(0); h.flip('Odhalit kartu'); h.flip('Přečíst výklad'); h.close();
  h.open(1); h.flip('Odhalit kartu');
  const tree = h.render();
  assert.ok(nodes(tree, n => n.type === 'View' && n.props.style?.transform?.[0]?.rotate === '180deg').length);
  h.flip('Přečíst výklad');
  assert.ok(nodes(h.render(), n => n.type === 'Text' && n.props.selectable && n.props.children === 'TEXT_vyzva').length);
  assert.ok(nodes(h.render(), n => n.type === 'View' && n.props.accessibilityViewIsModal).length);
  h.unmount();
});

test('actual request controller: Focus reopen never requests, rapid same-snapshot retry is guarded and late cache stays keyed', async () => {
  const contract = load('src/services/financeReading.ts', {});
  const states = [], refs = [], calls = [];
  let si = 0, ri = 0;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = value; }]; },
    useRef(initial) { return refs[ri++] ??= { current: initial }; }, useEffect() {},
  };
  const { useFinanceReading } = load('src/hooks/useFinanceReading.ts', {
    react: hooks, '../services/financeReading': contract,
    '../data': { drawCard: () => ({ card: { id: 'same', name: 'Card', nameCzech: 'Karta', keywords: [], imageName: 'card.png' }, position: 'reversed' }) },
    '../store/appStore': { useAppStore: { getState: () => ({ getUserContext: () => undefined }) } },
    '../services/universe': { performReading(request) { return new Promise((resolve, reject) => calls.push({ request, resolve, reject })); } },
  });
  const renderController = () => { si = ri = 0; return useFinanceReading(); };
  const current = renderController(); const snapshot = current.start(); current.start();
  Object.assign(current, renderController());
  const h = harness('pending', current);
  h.open(0); h.flip('Odhalit kartu'); h.flip('Přečíst výklad'); h.close(); h.open(0);
  assert.equal(calls.length, 1);
  calls[0].reject(new contract.FinanceReadingError('timeout'));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  Object.assign(current, renderController());
  const retry = nodes(h.render(), n => n.type === 'TouchableOpacity' && nodes(n, c => c.type === 'Text' && c.props.children === 'Zkusit znovu').length)[0];
  retry.props.onPress(); retry.props.onPress();
  assert.equal(calls.length, 2); assert.equal(calls[1].request, snapshot.request);
  calls[1].resolve({ readingType: 'finance_3_card', sections: ['vysledek', 'vyzva', 'dnes'].map(key => ({ key, text: `CACHED_${key}` })) });
  for (let i = 0; i < 8; i++) await Promise.resolve();
  Object.assign(current, renderController());
  assert.match(h.text(), /CACHED_dnes/); h.close(); h.open(0);
  assert.match(h.text(), /CACHED_dnes/); assert.equal(calls.length, 2);
});

const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
for (const [name, layout, clearance] of [
  ['small iPhone inside tabs', { window: { width: 320, height: 568 }, tabBarHeight: 83 }, 99],
  ['standalone reading with home indicator', {}, 50],
  ['standalone reading without home indicator', { insets: { top: 20, bottom: 0 } }, 16],
]) {
  test(`${name}: spread viewport clears bottom controls and positions flow without fixed offsets`, () => {
    const h = harness('pending', undefined, layout);
    const tree = h.render();
    assert.equal(flatten(tree.props.style).paddingBottom, clearance);
    const positions = nodes(tree, n => n.type === 'View' && flatten(n.props.style).paddingHorizontal === 8 && ['50%', '100%'].includes(flatten(n.props.style).width));
    assert.deepEqual(positions.map(n => flatten(n.props.style).width), ['50%', '50%', '100%']);
    positions.forEach(n => { assert.notEqual(flatten(n.props.style).position, 'absolute'); assert.equal(flatten(n.props.style).top, undefined); });
  });
}
test('Focus masks underlying content and keeps small-screen illustration controls in a scrollable body', () => {
  const h = harness('ready', undefined, { window: { width: 320, height: 568 } });
  h.open(0);
  const tree = h.render();
  const modal = nodes(tree, n => n.type === 'Modal')[0];
  const surface = nodes(modal, n => n.props.accessibilityViewIsModal)[0];
  const surfaceStyle = flatten(surface.props.style);
  assert.equal(surfaceStyle.backgroundColor, '#100b1b');
  assert.equal(surfaceStyle.paddingTop, 52); assert.equal(surfaceStyle.paddingBottom, 42);
  const body = nodes(modal, n => n.type === 'ScrollView')[0];
  assert.ok(body); assert.equal(flatten(body.props.contentContainerStyle).flexGrow, 1);
  assert.ok(nodes(body, n => n.type === 'Text' && n.props.children === 'Odhalit kartu').length);
  h.flip('Odhalit kartu'); h.flip('Přečíst výklad');
  assert.equal(nodes(nodes(h.render(), n => n.type === 'Modal')[0], n => n.type === 'ScrollView').length, 1);
  assert.match(h.text(), /TEXT_dnes/);
});

test('approved spread copy removes progress instructions while preserving the next available card', () => {
  const h = harness('ready');
  assert.match(h.text(), /Peníze, práce, stabilita\./);
  assert.doesNotMatch(h.text(), /Pokračuj kartou|Ke kartám se můžeš kdykoli vrátit/);
  assert.doesNotMatch(JSON.stringify(h.render()), /Aktuální situace|Co vyžaduje pozornost|Možný směr vývoje/);
  const cards = nodes(h.render(), n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel?.includes('otevřít kartu'));
  assert.deepEqual(cards.map(n => n.props.accessibilityLabel.split(',')[0]), ['Dnešní situace', 'Komplikace', 'Řešení']);
  assert.deepEqual(cards.map(n => n.props.disabled), [false, true, true]);
  assert.deepEqual(cards.map(n => flatten(n.props.style).opacity), [1, 0.5, 0.5]);
});

test('each revealed Focus orders name, orientation, artwork, exact microcopy and interpretation action', () => {
  const h = harness('ready');
  const labels = ['Dnešní situace', 'Komplikace', 'Řešení'];
  const copy = ['Co je teď ve hře', 'Co ti stojí v cestě', 'Co s tím'];
  for (let i = 0; i < 3; i++) {
    h.open(i);
    let modal = nodes(h.render(), n => n.type === 'Modal')[0];
    assert.deepEqual(nodes(modal, n => n.type === 'Text').map(n => n.props.children), ['Zpět ke kartám', labels[i], 'Odhalit kartu']);
    assert.equal(nodes(modal, n => n.type === 'CardImage').length, 0);
    h.flip('Odhalit kartu');
    modal = nodes(h.render(), n => n.type === 'Modal')[0];
    const content = nodes(modal, n => n.type === 'Text' || n.type === 'CardImage')
      .map(n => n.type === 'CardImage' ? `IMAGE_${n.props.imageName}` : n.props.children);
    assert.deepEqual(content, ['Zpět ke kartám', `CARD_${keys[i]}`, i === 1 ? 'Obrácená poloha' : 'Přímá poloha', `IMAGE_${keys[i]}.png`, copy[i], 'Přečíst výklad']);
    assert.ok(!content.includes(labels[i]));
    h.flip('Přečíst výklad'); h.close();
  }
});
