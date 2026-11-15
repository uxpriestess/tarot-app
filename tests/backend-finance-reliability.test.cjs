const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const SDK = require('../my-ai-backend/node_modules/@anthropic-ai/sdk').default;
const source = fs.readFileSync(path.join(__dirname, '../my-ai-backend/api/chat.js'), 'utf8');
const raw = JSON.stringify({ sections: ['dnes', 'vyzva', 'vysledek'].map(key => ({ key, text: 'Mock interpretation' })) });
const response = () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: raw }] });
const body = (mode = 'finance_3_card') => ({ mode, cards: [0, 1, 2].map(index => ({ name: `Mock ${index}`, position: index === 1 ? 'reversed' : 'upright' })) });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function load(provider, clock = true) {
  const timers = new Map(), calls = [], constructors = [], logs = [];
  let nextTimer = 0;
  class Client {
    constructor(options) {
      constructors.push(options);
      this.messages = { create: (input, options) => { calls.push({ input, options }); return provider(input, options); } };
    }
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source + '\nexport { buildSystemPrompt, buildUserPrompt, FINANCE_OUTPUT_FORMAT };', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, require: name => { assert.equal(name, '@anthropic-ai/sdk'); return Client; },
    process: { env: { ANTHROPIC_API_KEY: 'mock-only' } }, AbortController,
    setTimeout: clock ? (callback, delay) => { assert.equal(delay, 40000); timers.set(++nextTimer, callback); return nextTimer; } : setTimeout,
    clearTimeout: clock ? id => timers.delete(id) : clearTimeout,
    console: { info: (tag, event) => logs.push({ tag, ...event }), error() {}, warn() {}, log() {} },
  });
  function request(mode = 'finance_3_card') {
    const req = Object.assign(new EventEmitter(), { method: 'POST', body: body(mode), aborted: false });
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200, writableEnded: false, destroyed: false,
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; this.writableEnded = true; return this; },
    });
    return { req, res, run: () => exports.default(req, res) };
  }
  return { ...exports, request, calls, constructors, logs, timers,
    fire() { for (const callback of [...timers.values()]) callback(); },
  };
}
function clean(api, request) {
  assert.equal(api.timers.size, 0);
  assert.equal(request.req.listenerCount('aborted'), 0);
  assert.equal(request.req.listenerCount('close'), 0);
  assert.equal(request.res.listenerCount('close'), 0);
  assert.doesNotMatch(JSON.stringify(api.logs), /PRIVATE_/);
}

test('Finance passes a 40s timeout, zero retries and dedicated AbortSignal to SDK', async () => {
  const api = load(async () => response()), request = api.request();
  await request.run();
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0].options.timeout, 40000);
  assert.equal(api.calls[0].options.maxRetries, 0);
  assert.equal(api.calls[0].options.signal.aborted, false);
  assert.equal(request.res.statusCode, 200); clean(api, request);
});
test('normal request-body close and completed response close do not abort Finance', async () => {
  const pending = deferred(), api = load(() => pending.promise), request = api.request();
  const running = request.run(); await tick();
  request.req.emit('close');
  request.res.writableEnded = true; request.res.emit('close');
  assert.equal(api.calls[0].options.signal.aborted, false);
  pending.resolve(response()); await running;
  assert.equal(request.res.statusCode, 200); clean(api, request);
});
for (const event of ['request-aborted', 'response-close', 'request-signal']) {
  test(`${event} cancels only its own Finance operation and removes listeners`, async () => {
    const pending = [deferred(), deferred()]; let index = 0;
    const api = load(() => pending[index++].promise), first = api.request(), second = api.request();
    const external = new AbortController();
    const signal = external.signal;
    let added = 0, removed = 0;
    first.req.signal = {
      get aborted() { return signal.aborted; },
      addEventListener(...args) { added++; return signal.addEventListener(...args); },
      removeEventListener(...args) { removed++; return signal.removeEventListener(...args); },
    };
    const one = first.run(), two = second.run(); await tick();
    if (event === 'request-aborted') first.req.emit('aborted');
    else if (event === 'response-close') { first.res.destroyed = true; first.res.emit('close'); }
    else external.abort();
    await one;
    assert.equal(api.calls[0].options.signal.aborted, true);
    assert.equal(api.calls[1].options.signal.aborted, false);
    assert.equal(first.res.statusCode, 499);
    assert.equal(first.res.body?.sections, undefined);
    assert.equal(api.logs[0].category, 'aborted');
    assert.equal(added, 1); assert.equal(removed, 1);
    pending[1].resolve(response()); await two;
    pending[0].resolve(response()); await tick();
    assert.equal(first.res.statusCode, 499); assert.equal(second.res.statusCode, 200);
    clean(api, first); clean(api, second);
  });
}
test('already disconnected request never invokes the SDK', async () => {
  const api = load(async () => response()), request = api.request();
  request.req.signal = AbortSignal.abort();
  await request.run(); assert.equal(api.calls.length, 0);
  assert.equal(request.res.statusCode, 499); clean(api, request);
});
test('whole-operation deadline works without disconnect APIs and ignores late provider success', async () => {
  const pending = deferred(), api = load(() => pending.promise), request = api.request();
  request.req.on = undefined; request.res.on = undefined;
  const running = request.run(); await tick(); api.fire(); await running;
  assert.equal(request.res.statusCode, 504);
  assert.equal(request.res.body.sections, undefined);
  assert.equal(api.calls[0].options.signal.aborted, true);
  assert.equal(api.logs[0].category, 'provider_timeout');
  pending.resolve(response()); await tick();
  assert.equal(request.res.statusCode, 504); assert.equal(api.logs.length, 1); clean(api, request);
});
test('provider rejection cleans up cancellation listeners and deadline', async () => {
  const api = load(async () => { throw new Error('PRIVATE_PROVIDER_FAILURE'); }), request = api.request();
  await request.run(); assert.equal(request.res.statusCode, 500);
  assert.equal(api.calls.length, 1); clean(api, request);
});
for (const mode of ['daily', 'tomorrow', 'reading-screen', 'custom_question', 'moon_phase', 'body_mind_spirit', 'love_3_card']) {
  test(`${mode} retains default provider policy and no Finance listeners`, async () => {
    const text = mode === 'love_3_card' ? JSON.stringify({ sections: ['ty', 'partner', 'vztah'].map(key => ({ key, text: 'mock' })) }) : 'Mock text';
    const api = load(async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] })), request = api.request(mode);
    await request.run();
    assert.equal(api.calls[0].options, undefined);
    assert.deepEqual(Object.keys(api.constructors[0]), ['apiKey']);
    assert.equal(request.res.statusCode, 200); clean(api, request);
  });
}
test('installed SDK really performs only one fetch on Finance HTTP 500 and network failure', async () => {
  for (const network of [false, true]) {
    let fetches = 0;
    const client = new SDK({ apiKey: 'mock-only', fetch: async () => {
      fetches++;
      if (network) throw new TypeError('PRIVATE_NETWORK');
      return new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } });
    } });
    assert.equal(client.maxRetries, 2); assert.equal(client.timeout, 600000);
    const api = load((input, options) => client.messages.create(input, options)), request = api.request();
    await request.run(); assert.equal(fetches, 1); assert.equal(request.res.statusCode, 500); clean(api, request);
  }
});
for (const bodyStalled of [false, true]) {
  test(`installed SDK Finance deadline bounds stalled ${bodyStalled ? 'body after headers' : 'fetch before headers'}`, async () => {
    const pending = deferred(); let upstreamSignal;
    const client = new SDK({ apiKey: 'mock-only', fetch: async (_, init) => {
      upstreamSignal = init.signal;
      if (!bodyStalled) return pending.promise;
      return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: () => pending.promise };
    } });
    const api = load((input, options) => client.messages.create(input, options)), request = api.request();
    const running = request.run();
    while (!upstreamSignal) await tick();
    if (bodyStalled) await tick();
    api.fire(); await running;
    assert.equal(request.res.statusCode, 504); assert.equal(upstreamSignal.aborted, true);
    pending.resolve(bodyStalled ? response() : new Response(JSON.stringify(response()), { status: 200, headers: { 'content-type': 'application/json' } }));
    await tick(); clean(api, request);
  });
}
test('real Node client disconnect propagates after ordinary body completion', async () => {
  const started = deferred(), finished = deferred();
  let signal, bodyClosedWithoutAbort = false;
  const api = load((_, options) => {
    signal = options.signal; started.resolve();
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('cancelled'), { name: 'APIUserAbortError' })), { once: true }));
  }, false);
  const server = http.createServer(async (req, res) => {
    req.on('close', () => { bodyClosedWithoutAbort = !signal?.aborted; });
    let text = ''; for await (const chunk of req) text += chunk;
    req.body = JSON.parse(text);
    res.status = function (code) { this.statusCode = code; return this; };
    res.json = function (value) { this.end(JSON.stringify(value)); return this; };
    await api.default(req, res); finished.resolve();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let client;
  try {
    client = http.request({ hostname: '127.0.0.1', port: server.address().port, path: '/api/chat', method: 'POST', headers: { 'content-type': 'application/json' } });
    client.on('error', () => {}); client.end(JSON.stringify(body()));
    await started.promise;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(signal.aborted, false); assert.equal(bodyClosedWithoutAbort, true);
    client.destroy(); await finished.promise;
    assert.equal(signal.aborted, true); assert.equal(api.logs[0].category, 'aborted');
  } finally {
    client?.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});

// Digests captured from the actual uncommitted pre-task source, not HEAD.
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('shared prompt, all non-Finance guidance, user prompts and Finance schema are byte-for-byte unchanged', () => {
  const api = load(async () => response());
  const modes = ['daily', 'tomorrow', 'reading-screen', 'custom_question', 'love_3_card', 'moon_phase', 'body_mind_spirit', 'unknown'];
  const contexts = [undefined, { genderPreference: 'feminine', zodiacSign: 'Býk' }, { genderPreference: 'masculine' }, { genderPreference: 'neutral' }];
  assert.equal(hash(modes.flatMap(mode => contexts.map(context => api.buildSystemPrompt(mode, 'Mock moon', context)))), '6d592798d40a5c5754ff80e86d52d0248b1e88a7a01b6e69c6ff6cd538400439');
  assert.equal(hash(api.buildSystemPrompt('finance_3_card').replace(/<reading_mode name="finance_3_card">[\s\S]*?<\/reading_mode>/, '')), '28deae1c59eb178e82ddd9bd990e9f671694c321298becba147cc68256ee595d');
  assert.equal(hash(api.FINANCE_OUTPUT_FORMAT), '9a3179e56a6c5c943e315eb5631f81ed9936b79db1dd0b6b523fbc76ceb5842b');
  assert.equal(hash([...modes, 'finance_3_card'].map(mode => api.buildUserPrompt('Mock question', [{ name: 'Mock card', position: 'reversed', label: 'Mock label' }], 'Mock spread', mode, 'Mock moon'))), '05d7c997ef8a02540bb3661e9866ebfad7e0a6ca86db971bce2db8214a73a32d');
});
test('Finance guidance separates symbolism from facts without mechanical hedging or questions', () => {
  const prompt = load(async () => response()).buildSystemPrompt('finance_3_card');
  for (const text of ['karta není důkaz o životě uživatele', 'Rovnováha zatím funguje.', 'Práce proběhla.',
    'podmíněné nebo průzkumné vyjádření', 'O symbolice a tématu výkladu mluv přímo',
    'Nezačínej každou větu slovem „možná“', 'nepřeváděj celý výklad na otázky']) assert.ok(prompt.includes(text), text);
});
