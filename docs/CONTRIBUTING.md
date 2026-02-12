# Contributing — Storage, Migrations & Assets

Thank you for contributing! This page documents recommended practices for persisted state, migrations, and asset updates.

## Persisted State
- Persist application state using the existing Zustand + AsyncStorage setup.
- Include a top-level version field in persisted state (e.g., `_version` or `persistVersion`).

## Adding a Migration
1. Create or update `src/store/migrations.ts` with a deterministic migration function.
2. Bump the persisted version constant (e.g., `PERSIST_VERSION`) used on load.
3. Add unit tests under `__tests__/` that run the migration on older fixtures and assert the new shape.
4. Add a short entry to `docs/CHANGELOG.md` describing the migration.

### Example checklist for migrate-safe changes
- [ ] No secrets leaked into persisted state
- [ ] Field renames are idempotent
- [ ] Backwards-compatibility: app can still read older saves until migration completes
- [ ] Add automated tests for the migration

## Asset updates
- Store card images in `assets/cards/` and map them via `src/data/cardImages.ts`.
- When replacing an image file, keep the mapping key stable so existing saved draws continue to reference the correct card.
- If you change mapping keys, provide a migration that rewrites saved draws to the new key names.

## Testing locally
- To simulate older persisted state, write the JSON into AsyncStorage under the same key used by the persistence middleware, then start the app in dev mode and verify migrations run.

## Backups & Exports
- Prefer adding an export feature that writes JSON to device storage for user-driven backups.
- For risky migrations, recommend users export their data first.

## Secrets & Sensitive Data

- Never commit real API keys, tokens, or credentials into the repository. Use environment variables and CI/CD secret storage instead.
- If a secret is accidentally committed:
	1. Revoke/rotate the compromised key immediately in the provider dashboard (Anthropic, Vercel, etc.).
	2. Remove the file from the repository and add it to `.gitignore` (already configured for `.env*.local`).
	3. Remove the secret from git history using a history-rewrite tool (examples below). Inform collaborators to re-clone after a forced-push.

### Example history cleanup (recommended: follow backup steps first)

Using `git filter-repo` (preferred):

```bash
# clone a mirror
git clone --mirror <repo-url> repo-mirror.git
cd repo-mirror.git
git filter-repo --path .env.local --invert-paths
git push --force
```

Or using the BFG Repo-Cleaner:

```bash
# run from a local mirror clone
bfg --delete-files .env.local repo.git
cd repo.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

After either method, ask all contributors to re-clone the repository.

## Where to document changes
- Add operational notes to `docs/CHANGELOG.md` and reference them in PR descriptions.

Thanks — please create small, well-tested changes and reference this doc in PRs.
