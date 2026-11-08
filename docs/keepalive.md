# Supabase keepalive

`.github/workflows/keepalive.yml` stops the free-tier Supabase project from auto-pausing after a week of inactivity, and doubles as a basic uptime check.

## What it does

Each run makes three requests with `curl` (3 retries, 30 s timeout) and prints only HTTP status codes, never response bodies:

1. `GET https://sinc-crm.benlester.me/` - the site is up.
2. `GET https://sinc-crm-api.prinxlexter.workers.dev/api/health` - the Worker is up.
3. `GET $SUPABASE_URL/rest/v1/clients?select=id&limit=1` with the publishable key - a real Postgres query; must return 200.

If any step fails, the run fails and GitHub emails the repo owner. That is the only alerting.

## Schedule

`17 1,7,13,19 * * *` (UTC): four runs a day at off-peak minutes. It can also be started by hand from Actions, Keepalive, Run workflow.

To change it, edit the `cron` line in the workflow file.

## Configuration

The workflow uses the repo variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (Settings, Secrets and variables, Actions, Variables) and falls back to the production defaults in the file. The publishable key is public by design, so it is safe to commit. Never put a secret (`sb_secret_...`) here.

## Caveats

- Scheduled workflows only run from the default branch, `development`. Changes on other branches do not affect the schedule.
- On public repos GitHub disables scheduled workflows after 60 days without repository activity. Make an occasional commit, or re-enable the workflow under the Actions tab.
- Actions must be enabled for the repo.
