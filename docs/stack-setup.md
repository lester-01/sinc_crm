[← Back to README](../README.md#documentation)

# Stack setup

Phase checklist for local development and deploy. **Full command reference:** [script-reference.md](./script-reference.md).

---

## P1 — Local development

| Step | Setup | Verify |
|------|-------|--------|
| Machine (Linux, Node, CLI) | `npm run setup:local` | `npm run verify:local` |
| Supabase credentials | `npm run setup:supabase` | `npm run verify:supabase` |
| Database | `npm run db:schema`, `npm run db:seed` | (included in verify:supabase) |

Happy path: [quick-start.md](./quick-start.md).

**Skip verify while pasting keys:** `SKIP_VERIFY=1 npm run setup:supabase`

**Atomic layers:**

```bash
npm run verify:linux
npm run setup:node && npm run verify:node
npm run setup:cli && npm run verify:cli
```

**Optional:** `npm run setup:project` (cli + worker + frontend deps), `npm run verify:scaffold`

---

## P2 — GitHub (manual + stub verify)

```bash
git remote add origin <your-public-repo-url>
npm run verify:github              # WARN stub, exit 0
npm run verify:github-actions      # optional CI readiness stub
```

---

## P3 — Cloudflare deploy

See [deploy-guide.md](./deploy-guide.md).

| Step | Setup | Verify |
|------|-------|--------|
| Cloudflare token | `npm run setup:cloudflare` | `npm run verify:cloudflare` |
| Deploy | `npm run deploy:all` | `npm run verify:deploy` |

**Skip verify while pasting token:** `SKIP_VERIFY=1 npm run setup:cloudflare`

---

## Maintainer checklist

```bash
npm run verify:all
```

Includes machine, Supabase, Cloudflare, GitHub stub, and scaffold checks.

---

## Related

- [script-reference.md](./script-reference.md) — every npm script
- [external-auth.md](./external-auth.md) — credentials
- [infrastructure-phases.md](./infrastructure-phases.md) — phase model
