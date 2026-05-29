# Pages naming investigation (2026-05-29)

Step 1 findings for **why URLs use `sinc-crm-esg.pages.dev` while the repo says `sinc-crm`**.

## Executive summary

| Concept | Your account | Repo default |
|---------|--------------|--------------|
| **Pages project name** (`--project-name`) | `sinc-crm` | `sinc-crm` ([`worker/wrangler.toml`](../worker/wrangler.toml) `sinc-crm-api` → `sinc-crm`) |
| **Stable `pages.dev` hostname** | `sinc-crm-esg.pages.dev` | Documented as `<project-domains>` from `wrangler pages project list` |
| **Deployment preview URL** | `https://de21a19d.sinc-crm-esg.pages.dev` | `<hash>.<project-domains>` |

**`-esg` is not a separate project you created.** It is the **assigned Project Domains** hostname for the project named `sinc-crm`. Cloudflare often adds a suffix when the bare name (`sinc-crm.pages.dev`) is unavailable on `pages.dev`.

Deploys use project name **`sinc-crm`** (Worker default). CORS and Supabase Auth must use the **stable origin** `https://sinc-crm-esg.pages.dev` (API `subdomain`, not the project name).

---

## Wrangler evidence (2026-05-29)

```bash
cd worker && npx wrangler pages project list
```

| Project Name | Project Domains | Git Provider | Last Modified |
|--------------|-----------------|--------------|---------------|
| `sinc-crm` | `sinc-crm-esg.pages.dev` | No (Direct Upload) | ~2 hours ago |

```bash
npx wrangler pages deployment list --project-name=sinc-crm
```

| Deployment | URL |
|------------|-----|
| `de21a19d-…` (Production, branch `development`) | `https://de21a19d.sinc-crm-esg.pages.dev` |

```bash
npx wrangler pages deployment list --project-name=sinc-crm-esg
```

→ **Project not found** — there is no project slug `sinc-crm-esg`.

---

## Where each name is declared

### In git (repeatable)

| Name | File |
|------|------|
| `sinc-crm-api` | [`worker/wrangler.toml`](../worker/wrangler.toml) `name = "sinc-crm-api"` |
| `sinc-crm` (Pages project) | [`worker/wrangler.toml`](../worker/wrangler.toml) + deploy scripts (Worker default) |

### Not in git

| Name | Where it appears |
|------|------------------|
| `sinc-crm-esg.pages.dev` | Cloudflare **Project Domains** column only |
| `sinc-crm-esg` as project slug | **Nowhere** on the account — mistaken inference from the hostname |

### Docs (examples only)

[`docs/deploy-guide.md`](deploy-guide.md) used live URLs (`sinc-crm-esg`, `de21a19d`) as examples after production deploy (commit `41a2e8a`). That looked like a second project name but was only the **domain** column.

---

## Local env and shell history

| Check | Result |
|-------|--------|
| `.env` | No `PAGES_PROJECT` / `sinc-crm` |
| `worker/.dev.vars` | No Pages naming |
| `.env.production` | Only `VITE_API_BASE_URL=https://sinc-crm-api.prinxlexter.workers.dev` |
| `~/.bash_history` | No matches for `PAGES_PROJECT`, `deploy:pages`, or `sinc-crm` (empty or not persisted) |

---

## Dashboard (inferred from Wrangler)

| Question | Answer |
|----------|--------|
| Direct Upload vs Git? | **Direct Upload** (`Git Provider: No`) |
| Duplicate `sinc-crm` / `sinc-crm-esg` projects? | **One project:** name `sinc-crm` only |
| How `-esg` appeared? | **Cloudflare-assigned domain** (`subdomain`), not the Wrangler project name |

---

## Standardize on (repeatability)

1. **Deploy / create:** always `--project-name=sinc-crm` (Worker name default).
2. **CORS, Supabase Auth, bookmarks:** always `https://sinc-crm-esg.pages.dev` until you change domains in Cloudflare.
3. **After deploy:** run `wrangler pages project list` and read **Project Domains**, not the deployment preview row alone.
4. **Scripts:** resolve stable hostname via **Project Domains** for the project name; do not treat `sinc-crm-esg` as the Wrangler project slug.

---

## API token note

`wrangler pages project list` failed with `CLOUDFLARE_API_TOKEN` from `worker/.cloudflare.env` (auth error `10000` — likely missing Pages read permission). Listing succeeded with **OAuth session** (unset token). For CI/automation, ensure the token template includes **Account → Cloudflare Pages → Read** (and Edit for deploy).
