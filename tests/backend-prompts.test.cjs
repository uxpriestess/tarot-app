const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Evaluate prompt builders without constructing an SDK client or making requests.
const source = fs.readFileSync(path.join(__dirname, '../my-ai-backend/api/chat.js'), 'utf8');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(source + '\nexport { buildSystemPrompt, buildUserPrompt, parseReading };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: exportsForTest,
  require: name => {
    assert.equal(name, '@anthropic-ai/sdk');
    return class ForbiddenSDK { constructor() { throw new Error('No AI calls permitted'); } };
  },
  console: { log() {}, warn() {}, error() {} },
});
const { buildSystemPrompt, buildUserPrompt, parseReading } = exportsForTest;
const modes = ['daily', 'tomorrow', 'reading-screen', 'custom_question', 'love_3_card', 'moon_phase', 'body_mind_spirit'];

test('every existing mode uses Character First with flexible length and optional advice', () => {
  for (const mode of modes) {
    const prompt = buildSystemPrompt(mode);
    assert.match(prompt, /v10 \(Character First\)/);
    assert.ok(prompt.includes(`<reading_mode name="${mode}">`));
    assert.match(prompt, /KBT není výchozí rámec/);
    assert.match(prompt, /Praktickou radu přidej jen tehdy/);
    assert.match(prompt, /nikoli povinné minimum nebo pevná osnova/);
    assert.match(prompt, /synchronicity, rituály, znamení/);
    assert.doesNotMatch(prompt, /<framework>|LENGTH LIMITS SUMMARY|CURRENT LIMIT:|\b[A-F]: /);
  }
});

test('gender instructions and non-gendered fallback remain in all modes', () => {
  for (const mode of modes) {
    assert.match(buildSystemPrompt(mode, undefined, { genderPreference: 'feminine' }), /GRAMATICKÝ ROD: ŽENSKÝ/);
    assert.match(buildSystemPrompt(mode, undefined, { genderPreference: 'masculine' }), /GRAMATICKÝ ROD: MUŽSKÝ/);
    assert.match(buildSystemPrompt(mode, undefined, { genderPreference: 'neutral' }), /GRAMATICKÝ ROD: NEUTRÁLNÍ/);
    assert.match(buildSystemPrompt(mode), /GRAMATICKÝ ROD: NEZNÁMÝ/);
  }
});

test('safety, actual cards and user question take precedence over personality', () => {
  for (const mode of modes) {
    const prompt = buildSystemPrompt(mode);
    assert.match(prompt, /Bezpečnostní pravidla mají přednost před stylem/);
    assert.match(prompt, /i tarotovou symboliku/);
    assert.match(prompt, /Karta počká, člověk ne/);
    assert.match(prompt, /Z karet nevyvozuj zdravotní diagnózy/);
    assert.match(prompt, /Použij dodané karty a jejich skutečnou orientaci, neměň je/);
    assert.match(prompt, /odpověz na skutečnou otázku/);
  }
});

test('tomorrow keeps its explicit temporal safeguards in both prompts', () => {
  const cards = [{ nameCzech: 'Věž', position: 'reversed', label: 'Zítřek' }];
  const user = buildUserPrompt('Mock otázka', cards, 'Mock rozklad', 'tomorrow');
  assert.match(user, /Mock otázka/);
  assert.match(user, /Věž \(Obrácená\)/);
  assert.match(user, /Nikdy nepoužívej slova dnes, dneska, dnešní/);
  assert.match(buildSystemPrompt('tomorrow'), /TOMORROW CHECK \(CRITICAL\)/);
  assert.doesNotMatch(buildSystemPrompt('daily'), /TOMORROW CHECK/);
});

test('love keeps the exact sections transport contract and optional advice', () => {
  const prompt = buildSystemPrompt('love_3_card');
  const contract = prompt.match(/<love_output_contract>([\s\S]*?)<\/love_output_contract>/)[1];
  const example = JSON.parse(contract.split('\n').find(line => line.startsWith('{')));
  assert.deepEqual(example.sections.map(section => section.key), ['ty', 'partner', 'vztah']);
  assert.match(contract, /každý klíč právě jednou/);
  assert.match(contract, /rada není povinná/);
  assert.match(contract, /I bezpečnou reakci na krizovou otázku/);
  assert.match(prompt, /O partnerových myšlenkách netvrď nic jako fakt/);
  const parsed = parseReading(JSON.stringify(example), [{}, {}, {}], 'love_3_card');
  assert.deepEqual(Array.from(parsed.sections, section => section.key), ['ty', 'partner', 'vztah']);
});

test('body JSON guidance matches the existing parser and moon context remains mode-specific', () => {
  const body = buildSystemPrompt('body_mind_spirit');
  const contract = body.match(/<body_output_contract>([\s\S]*?)<\/body_output_contract>/)[1];
  const example = JSON.parse(contract.split('\n').find(line => line.startsWith('{')));
  const parsed = parseReading(JSON.stringify(example), [{}, {}, {}], 'body_mind_spirit');
  assert.deepEqual(Array.from(parsed.sections, section => section.key), ['mysl', 'telo', 'duse']);
  assert.match(buildSystemPrompt('moon_phase', 'Mock moon context'), /Mock moon context/);
  assert.doesNotMatch(buildSystemPrompt('daily', 'Mock moon context'), /Mock moon context/);
});

test('unknown modes keep the previous daily prompt fallback', () => {
  assert.match(buildSystemPrompt('unknown'), /<reading_mode name="daily">/);
});
