# Custom domains

By default the app is served from the stable Pages URL (`https://<project>.pages.dev`) and the API from the Worker's `workers.dev` URL. You can serve the app from your own domain instead (for example `https://crm.example.com`). The only code-side change is telling the Worker and Supabase Auth about the new origin.

> **Symptom if you skip the CORS step:** sign-in succeeds at Supabase, then the app bounces back to the login page. The browser console shows a CORS error for `…/api/me`. See [Troubleshooting](./deploy-guide.md#troubleshooting).

## 1. Attach the domain to the Pages project

The domain must be a zone on your Cloudflare account.

1. Cloudflare dashboard → **Workers & Pages** → your Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter the hostname (for example `crm.example.com`) and finish the prompts. Cloudflare creates the DNS record and certificate.
3. Wait until the domain shows **Active**.

## 2. Allow the origin in the Worker (CORS)

The Worker only accepts browser requests from origins listed in the `CORS_ORIGINS` secret (`localhost:5173` is always allowed in code). It must contain **every origin you open the app from**, comma-separated, with no spaces and no trailing slash:

```
https://<project>.pages.dev,https://crm.example.com
```

**Recommended — let `deploy:all` do it.** Add the custom domain(s) to `.env`:

```bash
EXTRA_CORS_ORIGINS=https://crm.example.com
```

`npm run deploy:all` then writes `CORS_ORIGINS` as the stable Pages origin followed by your extra origins, and adds the same origins to the Supabase Auth redirect list. Multiple domains are comma-separated. Values must be `https` origins; paths and trailing slashes are dropped.

> Without `EXTRA_CORS_ORIGINS`, `deploy:all` overwrites `CORS_ORIGINS` with only the Pages origin, which removes anything you added by hand.

**Manual alternative** (no redeploy needed): Cloudflare dashboard → Workers & Pages → your Worker → **Settings** → **Variables and Secrets** → edit `CORS_ORIGINS`, or from the `worker/` directory:

```bash
npx wrangler secret put CORS_ORIGINS
```

`secret put` replaces the whole value, so include the Pages origin as well as the new one. Secret values cannot be read back, so keep a copy.

## 3. Supabase Auth URLs

Password sign-in works without this step. Sign-up confirmation emails, password resets and other redirect links use the Site URL and redirect allow list, so to send people to the custom domain:

- If you used `EXTRA_CORS_ORIGINS`, `deploy:all` already added the domain to the **redirect allow list**. Site URL stays the Pages origin.
- To make the custom domain the **Site URL** too, change it in Supabase Dashboard → Authentication → URL Configuration. A later `deploy:all` resets Site URL to the Pages origin.

## 4. Optional: serve the API from a custom domain too

You can attach a custom domain to the Worker (Worker → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**, for example `api.example.com`). The frontend learns the API address from `VITE_API_BASE_URL` at **build time**, so set it to `https://api.example.com` and rebuild with `npm run deploy:pages`.

## Turning off the default URLs

Once the custom domains work, you can switch off the default hostnames so the app is only reachable on your own domains.

**Worker (`workers.dev` and Preview URLs):** Cloudflare dashboard → Workers & Pages → your Worker → **Domains** tab → turn off **workers.dev** and **Preview**. Or in `worker/wrangler.toml`:

```toml
workers_dev = false
preview_urls = false
```

> **Do this last.** The built frontend calls the API at `VITE_API_BASE_URL`. If that is still the `workers.dev` address, disabling `workers.dev` takes the API offline. Complete step 4 first (custom API domain, `VITE_API_BASE_URL` updated, Pages rebuilt and verified), then disable `workers.dev`.

**Pages (`pages.dev`):** Cloudflare documents how to disable access to the `pages.dev` subdomain in [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/#disable-access-to-pagesdev-subdomain). Note that this repo's tooling still resolves and uses the stable `pages.dev` origin for CORS and Auth URL sync (`deploy:all`), so keep it listed in `CORS_ORIGINS` unless you have changed that tooling.

Related Cloudflare docs: [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [disabling `workers.dev`](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

## Checklist

- [ ] Domain is **Active** on the Pages project
- [ ] `CORS_ORIGINS` contains the Pages origin and every custom origin (exact, no trailing `/`)
- [ ] Sign-in on the custom domain lands on the dashboard (no `/api/me` CORS error in the console)
- [ ] (Optional) Auth redirect list includes the custom domain
- [ ] (Optional) API on a custom domain, `VITE_API_BASE_URL` updated, Pages rebuilt
- [ ] (Optional) `workers.dev` / Preview URLs disabled **after** the previous item
