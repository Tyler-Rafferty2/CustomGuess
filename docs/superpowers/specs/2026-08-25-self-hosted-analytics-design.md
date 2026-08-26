# Self-Hosted Analytics (Umami)

## Problem

Vercel Analytics has a usage limit that's been hit. We want pageview/traffic analytics without relying on Vercel's paid tier, and without adding load to the Supabase database (which was recently the subject of an egress-reduction fix).

## Decision

Self-host [Umami](https://umami.is) on the existing EC2 backend box. No new subdomain or SSL cert. Only the public tracking script and its data-collection endpoint are exposed through the app's existing domain (via the Go backend); the Umami dashboard itself is viewed over an SSH tunnel to the box, never through the public web app.

**Revision note:** an earlier version of this design proxied the Umami dashboard through the Go backend at `/admin/analytics/*`, gated by a session-cookie admin-email check. During implementation, a whole-branch review verified against the real Umami image that this doesn't work: Umami (a Next.js app) loads its assets from absolute paths (`/_next/...`) and cannot be subpath-hosted — the dashboard would render blank under any proxy prefix. That review also found the originally-planned public tracker route was an unauthenticated wildcard that accidentally exposed Umami's login page and auth API to the whole internet. Both issues are resolved by dropping the in-browser dashboard entirely in favor of an SSH tunnel, and narrowing the public route to the two paths the tracker actually needs.

## Architecture

```
Visitor's browser ──HTTPS──> nginx ──> Go backend ──> Umami (127.0.0.1:3300, Docker)
                                         (2 allowlisted                │
                                          public paths only)           ▼
                                                                Dedicated Postgres container
                                                                (NOT Supabase)

Admin (you) ──SSH tunnel──> Umami (127.0.0.1:3300 on the EC2 box) ──> browser at localhost:3300
```

- **Umami container**: runs on the EC2 instance, bound to `127.0.0.1:3300` only — never directly reachable from the internet.
- **Umami's database**: Umami's official Docker images require Postgres or MySQL (no supported SQLite path) — a dedicated `postgres:16-alpine` container runs alongside it, bound to `127.0.0.1` only, with its own Docker volume. Kept separate from Supabase entirely so this doesn't reintroduce the egress problem the last fix addressed.
- **Go backend → Umami networking**: both run as separate Docker containers (bridge-networked), so `127.0.0.1` from inside the backend container is the *backend's own* loopback, not the host's — it cannot reach Umami that way. The backend reaches Umami via a configurable `UMAMI_URL` env var: `http://umami:3000` in local docker-compose (containers share a user-defined network, resolved by service name) and `http://host.docker.internal:3300` on EC2 (the backend's `docker run` gains `--add-host=host.docker.internal:host-gateway`, the same trick Umami's own container already uses to reach its Postgres).
- **Public proxy route**: the Go backend proxies exactly two allowlisted paths to Umami — `GET /analytics-collect/script.js` and `POST /analytics-collect/api/send` — not a wildcard subtree. A wildcard would also proxy Umami's `/login` page and auth API to anyone on the internet, defeating the entire point of not exposing the dashboard publicly.
- **Dashboard access**: `ssh -L 3300:127.0.0.1:3300 ec2-user@<elastic-ip>` (using the existing SSH access already required for deployment), then browse to `http://localhost:3300`. Umami's own login (username/password) is the only auth layer — there is no admin-email check, no session-cookie gate, and no code path in this app that even knows the dashboard exists.

## Frontend change

- One `<script>` tag added to the root layout (`frontend/src/app/layout.js`), pointed at `/analytics-collect/script.js` via the existing `API_URL` from `frontend/src/lib/api.js`.
- This script and the collection endpoint it calls are necessarily public — they have to work in every visitor's browser to record pageviews — but they carry no admin functionality and expose no data.

## Ops / deployment

- Add `guesswho-analytics` and `guesswho-analytics-db` systemd services to `terraform/scripts/user_data.sh`, following the same `docker run` pattern already used for `guesswho-backend` (restart policy, `127.0.0.1`-only port binding for both new services).
- Umami's session-signing secret (`APP_SECRET`) is a `sensitive = true` Terraform variable (`analytics_app_secret`), sourced from the gitignored `terraform.tfvars` and passed through `templatefile()` — following the exact same pattern as every other secret in this project (`resend_api_key`, `r2_access_key_id`, `db_password`). It is never hardcoded into a committed file.
- The existing `guesswho-backend` systemd unit's `docker run` gains `--add-host=host.docker.internal:host-gateway` and a `UMAMI_URL=http://host.docker.internal:3300` env var, so it can reach Umami.
- No Terraform changes needed for public networking (no new security group rules, no new Elastic IP, no new DNS record) since the only public surface is the two allowlisted paths behind the existing nginx/cert on port 443. SSH access for the dashboard tunnel already exists (same key used for deployment).
- Also add `umami` and `umami-db` services to the local `docker-compose.yml` (same images as production) so the tracker proxy can be exercised in local dev before deploying. The local backend service gets `UMAMI_URL=http://umami:3000` (resolved via the compose network, no host-gateway trick needed locally since compose puts services on a shared user-defined network by default).

## Testing

- Local: run Umami via `docker-compose` alongside the existing dev stack, verify `GET /analytics-collect/script.js` and `POST /analytics-collect/api/send` reach Umami successfully, and verify no other path under `/analytics-collect/` is reachable (e.g. `/analytics-collect/login` should 404, not proxy through).
- After deploy: verify the tracking script fires on a real page load and an event shows up in the Umami dashboard (viewed via SSH tunnel). Verify the two allowlisted paths work over the public domain and nothing else under `/analytics-collect/` does.
- Change Umami's default `admin`/`umami` credentials via its own UI immediately after first login, before leaving the tunnel session — this is the only account boundary protecting the dashboard.

## Out of scope

- Event/funnel tracking beyond Umami's default pageview tracking.
- Migrating existing Vercel Analytics history (not preserved).
- Any in-browser/proxied path to the Umami dashboard (superseded by the SSH-tunnel decision above) — if a public dashboard URL is wanted later, that requires giving Umami its own subdomain and cert (Umami's Next.js build can't be subpath-hosted), which is a separate decision with different tradeoffs than this spec's "no new subdomain" goal.
