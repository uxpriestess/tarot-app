const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function evaluate(source, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, ...globals });
  return exports;
}
const contract = evaluate(read('src/services/financeReading.ts'));
const keys = ['dnes', 'vyzva', 'vysledek'];
const valid = () => ({ readingType: 'finance_3_card', sections: keys.map(key => ({ key, text: `  ${key} text  ` })) });

for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
  test(`normalizes section order ${order}`, () => {
    const input = valid();
    input.sections = order.map(index => input.sections[index]);
    const before = JSON.stringify(input);
    const result = contract.parseFinanceReading(input);
    assert.equal(result.readingType, 'finance_3_card');
    assert.deepEqual(Array.from(result.sections, s => s.key), keys);
    assert.deepEqual(Array.from(result.sections, s => s.label), ['Dnes', 'Výzva', 'Výsledek']);
    assert.deepEqual(Array.from(result.sections, s => s.text), keys.map(key => `${key} text`));
    assert.equal(JSON.stringify(input), before);
  });
}

const malformed = [null, undefined, false, 7, 'not JSON', JSON.stringify(valid()), [],
  { ...valid(), readingType: 'love_3_card' }, { ...valid(), readingType: 'week_7_card' },
  { sections: valid().sections }, { readingType: 'finance_3_card' },
  { ...valid(), sections: {} }, { ...valid(), sections: [] },
  { ...valid(), sections: valid().sections.slice(1) },
  { ...valid(), sections: [...valid().sections, { key: 'extra', text: 'extra' }] },
  { ...valid(), sections: [valid().sections[0], valid().sections[0], valid().sections[2]] },
  { ...valid(), error: 'failure' }, { ...valid(), synthesis: 'unapproved' },
  { readingType: 'error', sections: [{ key: 'error', text: 'failure' }] },
];
for (const section of [null, [], {}, { key: 'unknown', text: 'text' },
  { key: 'dnes', text: '' }, { key: 'dnes', text: ' \n ' },
  ...[null, 0, false, [], {}].map(text => ({ key: 'dnes', text })),
  { key: 'dnes', text: 'text', label: 42 }, { key: 'dnes', text: 'text', error: 'failure' }]) {
  malformed.push({ ...valid(), sections: [section, ...valid().sections.slice(1)] });
}
malformed.forEach((input, index) => test(`rejects malformed response ${index} with a separate typed error`, () => {
  assert.throws(() => contract.parseFinanceReading(input), error =>
    error instanceof contract.FinanceReadingError && error.code === 'invalid' && !('sections' in error));
}));

test('accepts existing envelope metadata and canonicalizes optional labels', () => {
  const input = { ...valid(), meta: { cardCount: 3, timestamp: 'mock' }, answer: 'raw transport text' };
  input.sections[0].label = 'untrusted label';
  input.sections[1].label = null;
  const output = contract.parseFinanceReading(input);
  assert.equal(output.sections[0].label, 'Dnes');
  assert.equal(output.sections[1].label, 'Výzva');
  assert.deepEqual(Object.keys(output).sort(), ['readingType', 'sections']);
});

// Render the actual legacy JSX and card component without native dependencies
// or network calls, matching the repository's TypeScript/VM test convention.
const screenSource = ts.createSourceFile('screen.tsx', read('src/screens/TarotReadingScreen.tsx'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const wanted = ['SPREADS', 'FINANCE_POSITION_DESCRIPTIONS', 'CARD_POSITIONS', 'renderLegacyReading', 'CardComponent'];
const declarations = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && wanted.includes(node.name.getText(screenSource))) {
    declarations.push(`const ${node.getText(screenSource)};`);
  }
  ts.forEachChild(node, visit);
}
visit(screenSource);
assert.equal(declarations.length, wanted.length);
function renderSpread(id) {
  const jsx = (type, props) => ({ type, props: props || {} });
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView'].map(name => [name, name]));
  const api = evaluate(`${declarations.join('\n')}
    selectedSpread = SPREADS.find(s => s.id === '${id}');
    drawnCards = selectedSpread.labels.map(() => ({ card: {} }));
    exports.tree = renderLegacyReading(); exports.CardComponent = CardComponent;
    exports.positions = CARD_POSITIONS['${id}'];`, {
    ...native, require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name,
    styles: new Proxy({}, { get: (_, name) => name }),
    Animated: { View: 'Animated.View', Value: class { interpolate() {} } },
    useRef: value => ({ current: value }), useEffect() {}, width: 390,
    selectedSpread: null, drawnCards: [], flippedCards: id === 'finance' ? [0, 1, 2] : [], revealedCount: 0,
    cardMeanings: id === 'finance' ? [{ key: 'reading', text: 'PRIVATE_STALE_OTHER_MODE' }] : [], isLoadingMeanings: id === 'finance', fadeAnim: 1,
    resetReading() {}, flipCard() {}, Ionicons: 'Ionicons', CardImage: 'CardImage',
  });
  return api;
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
test('Finance shows approved descriptions on corresponding positions without generic subtitle', () => {
  const api = renderSpread('finance');
  assert.equal(nodes(api.tree, n => n.type === 'Text' && n.props.children === 'Zázemí').length, 1);
  assert.equal(nodes(api.tree, n => n.type === 'Text' && n.props.children === 'Peníze, práce, stabilita.').length, 1);
  assert.equal(nodes(api.tree, n => n.type === 'ScrollView').length, 0);
  assert.doesNotMatch(JSON.stringify(api.tree), /PRIVATE_STALE_OTHER_MODE/);
  assert.equal(nodes(api.tree, n => n.type === 'Text' && n.props.children === 'Ponořte se do své otázky...').length, 0);
  const cards = nodes(api.tree, n => n.type === api.CardComponent);
  assert.deepEqual(cards.map(c => c.props.label), ['Dnešní situace', 'Komplikace', 'Řešení']);
  assert.deepEqual(cards.map(c => c.props.description), ['Aktuální situace', 'Co vyžaduje pozornost', 'Možný směr vývoje']);
  cards.forEach((card, index) => {
    assert.equal(card.props.position, api.positions[index]);
    const rendered = api.CardComponent(card.props);
    assert.equal(nodes(rendered, n => n.type === 'Text' && n.props.children === card.props.description).length, 1);
    assert.equal(nodes(rendered, n => n.type === 'Text' && n.props.children === card.props.label).length, 1);
  });
});
test('7 Days retains its generic subtitle and receives no Finance descriptions', () => {
  const api = renderSpread('week');
  assert.equal(nodes(api.tree, n => n.type === 'Text' && n.props.children === 'Ponořte se do své otázky...').length, 1);
  const cards = nodes(api.tree, n => n.type === api.CardComponent);
  assert.equal(cards.length, 7);
  cards.forEach(card => {
    assert.equal(card.props.description, undefined);
    assert.equal(nodes(api.CardComponent(card.props), n => n.props.style?.[0] === 'financePositionDescription').length, 0);
  });
});
