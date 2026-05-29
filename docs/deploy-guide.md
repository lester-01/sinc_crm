[← Back to README — Deployment](../README.md#deployment)

# Deployment guide

**Status:** Stub — completed in [Phase 14](./phases/phase-14-deploy.md) (see [build-plan.md](./build-plan.md)).

This document will cover:

- Cloudflare Worker deploy (`wrangler deploy`)
- Cloudflare Pages (or static hosting) for the Vite build
- Production environment variables and secrets (using the [external-auth](./external-auth.md) env-first ladder; `CI=true` in pipelines)
- Post-deploy smoke tests (`DEPLOY-*` in [testing-plan.md](./testing-plan.md))

For local setup and credentials, use [quick-start.md](./quick-start.md) and [stack-setup.md](./stack-setup.md).
