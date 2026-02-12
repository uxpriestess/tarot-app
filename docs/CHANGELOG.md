# Changelog — Data & Migrations

Last updated: 2026-02-12

This document contains operational notes extracted from the README about persisted state, migrations, and related changes.

## Versioned State & Migrations
- Persisted state includes a version key (e.g., `_version` or `persistVersion`) so the app can run lightweight migrations on startup.
- Migrations should be deterministic and idempotent: running the same migration twice must not break data.

### Minimal migration example (TypeScript)

```ts
// src/store/migrations.ts
export function migrate(state: any) {
  if (!state._version) state._version = 1;

  // upgrade from v1 -> v2
  if (state._version === 1) {
    // example: rename 'streakCount' -> 'streak'
    if (state.user?.streakCount != null) {
      state.user.streak = state.user.streakCount;
      delete state.user.streakCount;
    }
    state._version = 2;
  }

  return state;
}
```

## Testing migrations
- Add unit tests that feed old-state fixtures into the migration functions and assert the expected new shape.
- Keep example fixtures in `__tests__/fixtures/migrations/`.

## Notes
- Record the migration in this changelog when you ship it, with the date and version.
- If a migration might lose user-visible data, notify users via release notes or an in-app banner.
