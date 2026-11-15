const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function evaluate(source, requireMock, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: requireMock, AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
const contract = evaluate(read('src/services/financeReading.ts'), () => { throw new Error('Unexpected import'); });
const keys = ['dnes', 'vyzva', 'vysledek'];
const labels = ['Dnes', 'Výzva', 'Výsledek'];
const validOutput = () => ({ sections: keys.map(key => ({ key, text: `  PRIVATE_TEXT_${key}  ` })) });
const cards = () => [
  { name: 'The Fool', nameCzech: 'Blázen', position: 'reversed', label: 'WRONG_FIRST' },
  { name: 'The Star', nameCzech: 'Hvězda', position: 'upright', label: 'WRONG_SECOND' },
  { name: 'The Tower', nameCzech: 'Věž', position: 'reversed', label: 'WRONG_THIRD' },
];
function backend(options = {}) {
  const calls = [], logs = [], diagnostics = [];
  class AnthropicMock {
    constructor() {
      this.messages = { create: async input => {
        calls.push(input);
        if (options.providerError) throw options.providerError;
        return Object.hasOwn(options, 'response') ? options.response : {
          stop_reason: options.stopReason ?? 'end_turn', usage: { output_tokens: 321 },
          content: options.content ?? [{ type: 'text', text: options.raw ?? JSON.stringify(validOutput()) }],
        };
      } };
    }
  }
  const api = evaluate(read('my-ai-backend/api/chat.js') + '\nexport { buildSystemPrompt, buildUserPrompt };', name => {
    assert.equal(name, '@anthropic-ai/sdk'); return AnthropicMock;
  }, {
    process: { env: options.noKey ? {} : { ANTHROPIC_API_KEY: 'mock-only' } },
    console: {
      log: (...args) => logs.push(args), warn: (...args) => logs.push(args), error: (...args) => logs.push(args),
      info: (tag, event) => { diagnostics.push({ tag, ...event }); logs.push([tag, event]); },
    },
  });
  return { calls, logs, diagnostics, ...api, async request(overrides = {}, method = 'POST') {
    let body;
    const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { body = value; return this; } };
    await api.default({ method, body: {
      mode: 'finance_3_card', spreadName: 'Finance', question: 'PRIVATE_QUESTION', cards: cards(), ...overrides,
    } }, res);
    return { status: res.statusCode, body };
  } };
}
function assertPrivateLogs(api) {
  assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_|WRONG_|Blázen|Hvězda|Věž/);
  for (const event of api.diagnostics) {
    assert.deepEqual(Object.keys(event).sort(), ['category', 'durationMs', 'httpStatus', 'outputTokens', 'stopReason', 'tag', 'validationFailure']);
    assert.ok(Number.isFinite(event.durationMs) && event.durationMs >= 0);
    assert.equal(event.tag, '[finance-reading:backend]');
  }
}

for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
  test(`Finance normalizes ${order} and matches the actual frontend validator`, async () => {
    const output = validOutput(); output.sections = order.map(index => output.sections[index]);
    const api = backend({ raw: JSON.stringify(output) });
    const { status, body } = await api.request();
    assert.equal(status, 200); assert.equal(api.calls.length, 1);
    const parsed = contract.parseFinanceReading(body);
    assert.deepEqual(Array.from(parsed.sections, s => s.key), keys);
    assert.deepEqual(Array.from(parsed.sections, s => s.label), labels);
    assert.deepEqual(Array.from(parsed.sections, s => s.text), keys.map(key => `PRIVATE_TEXT_${key}`));
    assert.deepEqual(Object.keys(body).sort(), ['answer', 'meta', 'readingType', 'sections']);
    assert.equal(body.meta.cardCount, 3);
    assert.ok(Number.isFinite(Date.parse(body.meta.timestamp)));
    assert.equal(body.answer, JSON.stringify(output));
    assert.equal(api.diagnostics[0].category, 'success');
    assert.equal(api.diagnostics[0].outputTokens, 321);
    assertPrivateLogs(api);
  });
}

test('Finance makes one unchanged-model request with a supported strict schema and ordered card assignments', async () => {
  const api = backend(); await api.request();
  const request = api.calls[0];
  assert.equal(api.calls.length, 1);
  assert.equal(request.model, 'claude-sonnet-4-6');
  assert.equal(request.max_tokens, 2048);
  assert.equal(request.temperature, 0.7);
  assert.equal(request.messages.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(request.output_config)), { format: {
    type: 'json_schema', schema: {
      type: 'object', properties: { sections: {
        type: 'array', items: {
          type: 'object', properties: { key: { type: 'string', enum: keys }, text: { type: 'string' } },
          required: ['key', 'text'], additionalProperties: false,
        },
      } }, required: ['sections'], additionalProperties: false,
    },
  } });
  const prompt = request.messages[0].content;
  assert.ok(prompt.includes('Karta 1 (Dnes): Blázen (Obrácená)'));
  assert.ok(prompt.includes('Karta 2 (Výzva): Hvězda (Vzpřímená)'));
  assert.ok(prompt.includes('Karta 3 (Výsledek): Věž (Obrácená)'));
  assert.ok(prompt.includes('TYP VÝKLADU: Zázemí'));
  assert.ok(prompt.includes('PRIVATE_QUESTION'));
  assert.doesNotMatch(prompt, /WRONG_|TYP VÝKLADU: Finance/);
  assertPrivateLogs(api);
});

test('Finance retains shared Character First, gender, safety and approved Zázemí scope', async () => {
  const api = backend();
  await api.request({ userContext: { genderPreference: 'feminine', zodiacSign: 'Býk' } });
  const prompt = api.calls[0].system;
  for (const text of ['v10 (Character First)', 'Zázemí', 'materiální zdroje', 'osobní hodnota',
    'Hodnota nemusí být peněžní', 'Nepředpokládej ani hojnost, ani nouzi',
    'příjmu, dluzích, zaměstnání, bydlení ani úsporách', 'personalizovaná investiční doporučení',
    'manifestační jazyk', 'finanční moralizování', 'zbytečný terapeutický rámec',
    'Výsledek nikdy není zaručený', 'GRAMATICKÝ ROD: ŽENSKÝ',
    'Bezpečnostní pravidla mají přednost před stylem', 'Karta počká, člověk ne',
    'dnes = první dodaná karta', 'vyzva = druhá dodaná karta', 'vysledek = třetí dodaná karta',
    'I bezpečnou reakci na krizovou otázku', 'Žádná synthesis ani čtvrtá sekce']) assert.ok(prompt.includes(text), text);
  assert.ok(prompt.includes('<reading_mode name="finance_3_card">'));
  for (const [gender, expected] of [['masculine', 'MUŽSKÝ'], ['neutral', 'NEUTRÁLNÍ'], [undefined, 'NEZNÁMÝ']]) {
    assert.ok(api.buildSystemPrompt('finance_3_card', undefined, { genderPreference: gender }).includes(`GRAMATICKÝ ROD: ${expected}`));
  }
  assertPrivateLogs(api);
});

const malformed = [
  ['invalid JSON', 'not JSON', 'json_parse'],
  ['fenced JSON', '```json\n' + JSON.stringify(validOutput()) + '\n```', 'json_parse'],
  ...[null, [], {}, 'text', { ...validOutput(), synthesis: 'PRIVATE_SYNTHESIS' }, { sections: {} }]
    .map((value, index) => [`root ${index}`, JSON.stringify(value), 'root_shape']),
  ['missing section', JSON.stringify({ sections: validOutput().sections.slice(1) }), 'section_count'],
  ['extra section', JSON.stringify({ sections: [...validOutput().sections, { key: 'extra', text: 'text' }] }), 'section_count'],
  ['duplicate', JSON.stringify({ sections: [validOutput().sections[0], validOutput().sections[0], validOutput().sections[2]] }), 'duplicate_key'],
];
for (const [name, section, category] of [
  ['null section', null, 'section_shape'], ['array section', [], 'section_shape'],
  ['missing text', { key: 'dnes' }, 'section_shape'],
  ['wrong fields', { key: 'dnes', other: 'text' }, 'section_shape'],
  ['extra field', { key: 'dnes', text: 'text', label: 'Dnes' }, 'section_shape'],
  ['unknown key', { key: 'partner', text: 'text' }, 'section_key'],
  ...['', ' \n ', null, 5, false, [], {}].map((text, index) => [`text ${index}`, { key: 'dnes', text }, 'section_text']),
]) malformed.push([name, JSON.stringify({ sections: [section, ...validOutput().sections.slice(1)] }), category]);
for (const [name, raw, category] of malformed) {
  test(`Finance rejects ${name}, exposes no interpretation and logs metadata only`, async () => {
    const api = backend({ raw }); const { status, body } = await api.request();
    assert.equal(status, 502); assert.equal(body.code, 'INVALID_FINANCE_READING');
    assert.equal('sections' in body, false);
    assert.throws(() => contract.parseFinanceReading(body), contract.FinanceReadingError);
    assert.equal(api.calls.length, 1); // no silent repair call
    assert.equal(api.diagnostics.length, 1);
    assert.equal(api.diagnostics[0].validationFailure, category);
    assertPrivateLogs(api);
  });
}

for (const stopReason of ['max_tokens', 'refusal', 'tool_use', 'PRIVATE_UNKNOWN_REASON', null]) {
  test(`Finance rejects incomplete model stop ${stopReason}`, async () => {
    const api = backend({ response: { stop_reason: stopReason, content: [{ type: 'text', text: JSON.stringify(validOutput()) }] } });
    const { status, body } = await api.request();
    assert.equal(status, 502); assert.equal(body.code, 'INVALID_FINANCE_READING');
    assert.equal(api.diagnostics[0].validationFailure, 'stop_reason');
    assertPrivateLogs(api);
  });
}
for (const content of [[], {}, [null], [{ type: 'tool_use' }], [{ type: 'text', text: null }],
  [{ type: 'text', text: '{}' }, { type: 'text', text: '{}' }]]) {
  test(`Finance rejects malformed content ${JSON.stringify(content)}`, async () => {
    const api = backend({ content }); const { status } = await api.request();
    assert.equal(status, 502); assert.equal(api.diagnostics[0].validationFailure, 'content_shape');
    assertPrivateLogs(api);
  });
}
test('Finance rejects a null provider response without exposing raw errors', async () => {
  const api = backend({ response: null });
  assert.equal((await api.request()).status, 502); assertPrivateLogs(api);
});

for (const name of ['APIConnectionTimeoutError', 'APIConnectionError', 'Error']) {
  test(`Finance propagates ${name} as HTTP failure, not successful sections`, async () => {
    const error = new Error('PRIVATE_PROVIDER_ERROR'); error.name = name;
    const api = backend({ providerError: error }); const { status, body } = await api.request();
    assert.equal(status, name === 'APIConnectionTimeoutError' ? 504 : 500); assert.equal('sections' in body, false);
    assert.equal(api.calls.length, 1);
    assert.equal(api.diagnostics[0].category, name === 'Error' ? 'provider_error' : name === 'APIConnectionError' ? 'provider_network' : 'provider_timeout');
    assertPrivateLogs(api);
  });
}
for (const invalidCards of [null, {}, [], cards().slice(1), [...cards(), cards()[0]],
  [null, ...cards().slice(1)], [{ ...cards()[0], position: 'sideways' }, ...cards().slice(1)],
  [{ nameCzech: '', position: 'upright' }, ...cards().slice(1)],
  [{ nameCzech: 42, position: 'upright' }, ...cards().slice(1)],
]) {
  test(`Finance validates input before requesting AI: ${JSON.stringify(invalidCards)}`, async () => {
    const api = backend(); const { status } = await api.request({ cards: invalidCards });
    assert.equal(status, 400); assert.equal(api.calls.length, 0); assertPrivateLogs(api);
  });
}
test('Finance permits repeated cards and preserves each independent orientation', async () => {
  const api = backend();
  const input = cards().map(card => ({ ...card, name: 'The Fool', nameCzech: 'Blázen' }));
  assert.equal((await api.request({ cards: input })).status, 200);
  assert.equal(api.calls.length, 1);
  assert.equal(input[0].label, 'WRONG_FIRST'); // does not mutate incoming cards
});
test('missing configuration and unsupported HTTP methods make no AI calls', async () => {
  const api = backend({ noKey: true });
  assert.equal((await api.request()).status, 500);
  assert.equal((await api.request({}, 'GET')).status, 405);
  assert.equal(api.calls.length, 0); assertPrivateLogs(api);
});

test('Finance-only guidance/schema stays out of all existing modes', () => {
  const api = backend();
  for (const mode of ['daily', 'tomorrow', 'custom_question', 'reading-screen', 'moon_phase', 'body_mind_spirit', 'love_3_card']) {
    const prompt = api.buildSystemPrompt(mode);
    assert.doesNotMatch(prompt, /<finance_output_contract>|Zázemí/);
    assert.ok(prompt.includes('v10 (Character First)'));
    assert.ok(prompt.includes(`reading_mode name="${mode}"`));
  }
});
