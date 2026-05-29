# Phase 12 — External service authentication

**Status:** Complete  
**Started:** 2026-05-27  
**Completed:** 2026-05-27

Links: [build-plan](../build-plan.md) · [stack-setup](../stack-setup.md) · [external-auth](../external-auth.md)

**Blocks:** Phase 13 (README & doc compile) — scripts and pattern docs are ready.

---

## Goal

Enforce and document one **tooling auth ladder** for **Cloudflare**, **Supabase** (scripts/E2E), and **GitHub** (verify flow):

1. **Already authenticated?** → proceed (`wrangler whoami`, API reachability, `gh auth status`, etc.)
2. **`process.env` tokens/keys** → use if set and non-placeholder (CI/runtime injection; **overrides** file values)
3. **Dotenv files** → only if keys still missing; **do not require** a file on disk when all required keys are already in the environment
4. **Interactive OAuth** (where supported) → library default timeouts; detect success/failure and proceed or fail with clear env-var hints

**Not in this phase:** root README compile, `testing-guide.md`, `project-guide.md` full compile (Phase 13).

---

## Policy decisions (approved)

| Topic | Decision |
|-------|----------|
| Env vs files | `process.env` **wins** over file values when both set |
| Files optional | If all required keys for a service are in env, **skip** enforcing copy/existence of that env file |
| OAuth timeout | **No custom repo timeout** — use Wrangler/`gh`/tool defaults; check status after |
| `CI=true` | If set (common on GitHub Actions, GitLab CI, etc.), treat as **headless**: **fail fast** before OAuth with env-var instructions; do not use a custom `SINC_*` flag |
| Cloudflare OAuth | **Kept** — optional for desktop quick start; **not recommended** for production or CI/CD |
| GitHub auth ladder | `verify-github-actions.mjs` skips `gh` OAuth when `CI=true`; full desktop test deferred — [roadmap](../roadmap.md) |

---

## Tasks

### Shared infrastructure

- [x] Update `scripts/lib/load-stack-env.mjs`: merge `process.env` over file parse (env wins)
- [x] Document ladder in **`docs/external-auth.md`**: precedence, injectable env table, per-service matrix, app auth vs tooling auth
- [x] `setup-cloud.sh` / verify scripts: stop requiring file existence when env is complete (`require-stack-credentials.mjs`)

### Cloudflare

- [x] `ensure-cloudflare-auth.sh`: (1) whoami if already authed (2) token from env (3) token from `.cloudflare.env` (4) `wrangler login` without `ALLOW_WRANGLER_LOGIN` gate; `CI=true` fail fast before OAuth
- [x] **`docs/cloudflare-auth.md`**: token recommended; OAuth optional desktop; CI fail fast
- [x] **`docs/quick-start.md`**, **`docs/stack-setup.md`**, **`docs/roadmap.md`**: aligned
- [x] `verify-stack-setup.mjs` `verifyCloudflare()`: env-first; optional file

### Supabase (tooling — not app login)

- [x] `db:schema`, `db:seed`, E2E create/delete: env-first via `loadStackEnv`
- [x] Optional files: `.env`, `worker/.dev.vars`, `E2E_ENV_FILE` overlay
- [x] Document injectable vars in `external-auth.md` (link from `database-setup.md`)

### GitHub (optional in this phase)

- [x] Align `verify-github-actions.mjs` with ladder (`CI=true` fail fast before `gh` OAuth)
- [ ] Manual test on desktop; document in `external-auth.md` — deferred to roadmap
- [x] Roadmap retains GitHub ladder finish item

### Verify

```bash
npm run test:scripts   # AUTH-LADDER-01 … AUTH-LADDER-10

# Manual / optional:
CI=true bash scripts/ensure-cloudflare-auth.sh   # expect exit 1 without token
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run verify:stack:cloudflare
node scripts/lib/require-stack-credentials.mjs
npm run verify:github-actions
```

- [x] Automated tests: `scripts/lib/load-stack-env.test.mjs`, `auth-ladder.integration.test.mjs`

---

## Handoff to Phase 13

README symlinks, `testing-guide.md`, `infrastructure-phases.md`, `project-guide.md` compile — auth pattern is in code and `docs/external-auth.md`.
