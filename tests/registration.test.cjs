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
  vm.runInNewContext(code, { exports, require: requireMock, Date, ...globals });
  return exports;
}
function service(supabase) {
  return evaluate(fs.readFileSync(path.join(root, 'src/services/registration.ts'), 'utf8'),
    () => ({ supabase }));
}
const session = { user: { id: 'test-user', email: 'test@example.invalid' } };
const draft = { displayName: 'Test', birthDate: '2000-02-29', zodiacSign: 'Ryby', email: session.user.email };
const existing = { id: session.user.id, display_name: 'Existing', zodiac_sign: 'Lev' };
function backend({ profiles = [null, existing], insertError = null, sessionValue = session, readError = null } = {}) {
  const inserts = [], reads = [];
  return {
    inserts, reads,
    auth: { getSession: async () => ({ data: { session: sessionValue }, error: null }) },
    from(table) {
      assert.equal(table, 'profiles');
      return {
        select() { return { eq(column, id) {
          assert.equal(column, 'id'); assert.equal(id, session.user.id); reads.push(id);
          return { maybeSingle: async () => ({ data: profiles.shift() ?? null, error: readError }) };
        } }; },
        async insert(payload) { inserts.push(payload); return { error: insertError }; },
      };
    },
  };
}

test('existing profile is returned without any write or requiring a draft', async () => {
  const db = backend({ profiles: [existing] });
  assert.equal(await service(db).recoverRegistration({}), existing);
  assert.equal(db.inserts.length, 0);
});
test('missing profile uses the session id and leaves created_at to the database', async () => {
  const db = backend();
  assert.equal(await service(db).recoverRegistration(draft), existing);
  assert.equal(db.inserts.length, 1);
  assert.equal(db.inserts[0].id, session.user.id);
  assert.equal(db.inserts[0].birth_date, '2000-02-29');
  assert.equal('created_at' in db.inserts[0], false);
});
test('duplicate insert is accepted only after reading the current user profile', async () => {
  const db = backend({ insertError: { code: '23505' } });
  assert.equal(await service(db).recoverRegistration(draft), existing);
  const invisible = backend({ profiles: [null, null], insertError: { code: '23505' } });
  await assert.rejects(service(invisible).recoverRegistration(draft), { kind: 'profile' });
});
test('missing session, read failure, and insert failure do not succeed', async () => {
  for (const [options, kind] of [
    [{ sessionValue: null }, 'session'],
    [{ readError: { code: '42501' } }, 'profile'],
    [{ insertError: { code: '23502' } }, 'profile'],
  ]) await assert.rejects(service(backend(options)).recoverRegistration(draft), { kind });
});
test('missing, invalid, or different-account draft cannot create a profile', async () => {
  for (const bad of [{ ...draft, birthDate: '' }, { ...draft, birthDate: '2023-02-29' },
    { ...draft, email: 'other@example.invalid' }]) {
    const db = backend();
    await assert.rejects(service(db).recoverRegistration(bad), { kind: 'details' });
    assert.equal(db.inserts.length, 0);
  }
});
test('account changes during recovery prevent completion', async () => {
  const db = backend({ profiles: [existing] }); let calls = 0;
  db.auth.getSession = async () => ({ data: { session: ++calls === 1 ? session : { user: { id: 'other' } } } });
  await assert.rejects(service(db).recoverRegistration(draft), { kind: 'session' });
});

// Exercise the real App callbacks without rendering React Native or contacting Supabase.
function appHarness(options = {}) {
  const db = backend(options);
  let currentDraft = { ...draft }, clears = 0, step, recovering = false;
  const writes = [], alerts = [], localProfiles = [], removals = [];
  const store = {
    get data() { return currentDraft; },
    async saveDraft(email) { currentDraft = { ...currentDraft, email }; },
    async clearDraft() { clears++; currentDraft = {}; },
    async restoreDraft() {},
  };
  const src = ts.createSourceFile('App.tsx', fs.readFileSync(path.join(root, 'App.tsx'), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['finishRegistration', 'showRecoveryError', 'handleRecoverProfile', 'showAuthError', 'handleSignUp', 'handleLogin', 'checkOnboardingStatus'];
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(src))) {
      declarations.push('const ' + node.getText(src) + ';');
    }
    ts.forEachChild(node, visit);
  }
  visit(src); assert.equal(declarations.length, names.length);
  const globals = {
    ...service(db), supabase: db,
    AsyncStorage: {
      async setItem(key, value) { writes.push([key, value]); },
      async getItem() { return 'true'; },
      async removeItem(key) { removals.push(key); },
    },
    useOnboardingStore: { getState: () => store },
    useAppStore: { getState: () => ({ setUserProfile: (...args) => localProfiles.push(args) }) },
    setOnboardingStep: value => step = value,
    setIsRecoveringProfile: value => recovering = value,
    active: true, setIsCheckingOnboarding() {},
    setAuthSession() {}, Alert: { alert: (...args) => alerts.push(args) },
  };
  const actions = evaluate(declarations.join('\n') + '\n' + names.map(n => `exports.${n} = ${n};`).join('\n'),
    () => { throw Error('Unexpected import'); }, globals);
  return { db, actions, writes, alerts, localProfiles, store, removals,
    get clears() { return clears; }, get step() { return step; }, get recovering() { return recovering; } };
}
test('profile failure retains draft and does not mark onboarding complete; retry succeeds', async () => {
  const h = appHarness({ profiles: [null, existing], insertError: { code: '23502' } });
  await h.actions.handleRecoverProfile();
  assert.equal(h.writes.length, 0); assert.equal(h.clears, 0);
  assert.equal(h.store.data.birthDate, draft.birthDate); assert.equal(h.step, 'signUp');
  // Profile now exists (e.g. the previous insert was committed despite a lost response).
  await h.actions.handleRecoverProfile();
  assert.equal(h.writes.length, 1); assert.equal(h.clears, 1); assert.equal(h.step, '');
});
test('failed login keeps draft and never queries or creates a profile', async () => {
  const h = appHarness();
  h.db.auth.signInWithPassword = async () => ({ data: { session: null }, error: { code: 'invalid_credentials' } });
  await h.actions.handleLogin('test@example.invalid', 'synthetic-test-password');
  assert.equal(h.db.reads.length, 0); assert.equal(h.writes.length, 0); assert.equal(h.clears, 0);
});
test('confirmation-required signup saves draft and does not force sign-in or insert', async () => {
  const h = appHarness({ sessionValue: null });
  h.db.auth.signUp = async () => ({ data: { user: session.user, session: null }, error: null });
  h.db.auth.signInWithPassword = () => { throw Error('Must not force sign-in'); };
  await h.actions.handleSignUp('TEST@example.invalid', 'synthetic-test-password');
  assert.equal(h.step, 'login'); assert.equal(h.store.data.email, 'test@example.invalid');
  assert.equal(h.writes.length, 0); assert.equal(h.clears, 0); assert.equal(h.db.inserts.length, 0);
});
test('authenticated signup attempt recovers existing user instead of calling signup', async () => {
  const h = appHarness({ profiles: [existing] });
  h.db.auth.signUp = () => { throw Error('Must preserve existing Auth user'); };
  await h.actions.handleSignUp('test@example.invalid', 'synthetic-test-password');
  assert.equal(h.writes.length, 1); assert.equal(h.db.inserts.length, 0);
});
test('login with a missing profile and lost draft offers recollection without completion', async () => {
  const h = appHarness();
  await h.store.clearDraft();
  h.db.auth.signInWithPassword = async () => ({ data: { session }, error: null });
  await h.actions.handleLogin('test@example.invalid', 'synthetic-test-password');
  assert.equal(h.writes.length, 0); assert.equal(h.db.inserts.length, 0); assert.equal(h.recovering, true);
  const buttons = h.alerts.at(-1)[2]; buttons[0].onPress(); assert.equal(h.step, 'name');
});

test('successful login repairs missing profile and completes onboarding', async () => {
  const h = appHarness();
  h.db.auth.signInWithPassword = async () => ({ data: { session }, error: null });
  await h.actions.handleLogin('test@example.invalid', 'synthetic-test-password');
  assert.equal(h.db.inserts.length, 1); assert.equal(h.writes.length, 1);
  assert.equal(h.clears, 1); assert.equal(h.step, '');
});
test('email-not-confirmed login does not create a profile or clear the draft', async () => {
  const h = appHarness({ sessionValue: null });
  h.db.auth.signInWithPassword = async () => ({ data: { session: null }, error: { code: 'email_not_confirmed' } });
  await h.actions.handleLogin('test@example.invalid', 'synthetic-test-password');
  assert.equal(h.db.reads.length, 0); assert.equal(h.clears, 0); assert.equal(h.writes.length, 0);
  assert.match(h.alerts[0][1], /potvrď e-mail/);
});
test('existing-account signup error offers login without losing the draft', async () => {
  const h = appHarness({ sessionValue: null });
  h.db.auth.signUp = async () => ({ data: {}, error: { code: 'user_already_exists' } });
  await h.actions.handleSignUp('test@example.invalid', 'synthetic-test-password');
  assert.equal(h.step, 'login'); assert.equal(h.clears, 0); assert.equal(h.writes.length, 0);
});
test('startup detects missing profile despite old onboarding-complete flag', async () => {
  const h = appHarness({ profiles: [null] });
  await h.actions.checkOnboardingStatus();
  assert.equal(h.step, 'signUp'); assert.equal(h.recovering, true);
  assert.deepEqual(h.removals, ['onboarding_complete']);
  assert.equal(h.db.inserts.length, 0); assert.equal(h.clears, 0);
});
test('startup restores confirmed existing profile without inserting', async () => {
  const h = appHarness({ profiles: [existing, existing] });
  await h.actions.checkOnboardingStatus();
  assert.equal(h.step, ''); assert.equal(h.writes.length, 1); assert.equal(h.db.inserts.length, 0);
});
test('startup profile-read failure offers retry without completing or clearing draft', async () => {
  const h = appHarness({ readError: { code: '42501' } });
  await h.actions.checkOnboardingStatus();
  assert.equal(h.step, 'login'); assert.equal(h.writes.length, 0); assert.equal(h.clears, 0);
  assert.equal(typeof h.alerts[0][2][0].onPress, 'function');
});
test('registration draft survives restart and is removed only explicitly', async () => {
  const storage = new Map();
  const asyncStorage = {
    async getItem(key) { return storage.get(key) ?? null; },
    async setItem(key, value) { storage.set(key, value); },
    async removeItem(key) { storage.delete(key); },
  };
  function loadStore() {
    return evaluate(fs.readFileSync(path.join(root, 'src/store/onboardingStore.ts'), 'utf8'), id => {
      if (id === 'zustand') return { create: require('zustand').create };
      return asyncStorage;
    }).useOnboardingStore;
  }
  const first = loadStore();
  first.setState({ data: { ...draft, password: 'must-not-be-persisted' } });
  await first.getState().saveDraft(draft.email);
  assert.equal([...storage.values()][0].includes('must-not-be-persisted'), false);
  const second = loadStore(); await second.getState().restoreDraft();
  assert.equal(second.getState().data.birthDate, draft.birthDate);
  await second.getState().clearDraft();
  assert.equal(storage.size, 0); assert.equal(second.getState().data.email, '');
});
