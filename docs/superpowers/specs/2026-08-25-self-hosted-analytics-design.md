# Self-Hosted Analytics (Umami)

## Problem

Vercel Analytics has a usage limit that's been hit. We want pageview/traffic analytics without relying on Vercel's paid tier, and without adding load to the Supabase database (which was recently the subject of an egress-reduction fix).

## Decision

Self-host [Umami](https://umami.is) on the existing EC2 backend box, gated behind the app's own session auth so only the admin account (tjraff5@gmail.com) can view the dashboard. No new subdomain or SSL cert — reuses the existing nginx/certbot setup on the current DuckDNS domain.

## Architecture

```
Browser ──HTTPS──> nginx (existing cert) ──> Go backend ──(session-authed)──> Umami (127.0.0.1, Docker)
                                                                                  │
                                                                                  ▼
                                                                          Umami's own SQLite DB
                                                                          (NOT Supabase)
```

- **Umami container**: runs on the EC2 instance, bound to `127.0.0.1:<port>` only — never directly reachable from the internet, same isolation pattern as the existing backend container.
- **Umami's database**: its own SQLite file inside the container, persisted via a Docker volume. Kept separate from Supabase entirely so this doesn't reintroduce the egress problem the last fix addressed.
- **nginx**: no changes to cert/domain handling. Existing `location /` block already proxies everything to the Go backend on `127.0.0.1:8080`; `/admin/analytics/*` requests flow through that same path since the Go backend does the proxying to Umami internally (not nginx).
- **Go backend**: new route group `/admin/analytics/*` that reverse-proxies to Umami's local port.

## Auth gate

- New middleware on the `/admin/analytics/*` route group.
- Reads the existing session cookie (from the session-cookie auth system), resolves the user.
- Checks `user.Email == os.Getenv("ADMIN_EMAIL")` (set to `tjraff5@gmail.com` in the EC2 `.env` file, following the existing pattern used for `RESEND_API_KEY`, `R2_*`, etc.)
- No session, or session belongs to a different user: respond `404 Not Found` (not 403/401) — the route should not hint at its own existence to unauthenticated users.
- Once past the gate, Umami's own login screen (username/password) is still the final auth layer for the dashboard itself. Two layers total: session-cookie admin check, then Umami's native login.

## Frontend change

- One `<script>` tag added to the root layout (`frontend/src/app/layout.tsx`), pointed at `/admin/analytics/script.js` via the existing `API_URL` from `frontend/src/lib/api.js`.
- This script is necessarily public — it has to run in every visitor's browser to record pageviews — but it only carries a site ID, no data about other visitors or admin functionality.

## Ops / deployment

- Add a `guesswho-analytics` systemd service to `terraform/scripts/user_data.sh`, following the same `docker run` pattern already used for `guesswho-backend` (restart policy, `127.0.0.1`-only port binding).
- Add `ADMIN_EMAIL` to the backend's env file template in `user_data.sh` and to `terraform/variables.tf` / `terraform.tfvars`.
- No Terraform changes needed for networking (no new security group rules, no new Elastic IP, no new DNS record) since everything stays behind the existing nginx/cert on port 443.
- Also add a `umami` service to the local `docker-compose.yml` (SQLite-backed, same image as production) so the auth gate and proxy can be exercised in local dev before deploying.

## Testing

- Local: run Umami via `docker-compose` alongside the existing dev stack, verify the backend proxy + auth gate work against a local session (logged in as the admin email vs. a different account vs. logged out — expect 404 in the latter two cases).
- After deploy: verify `/admin/analytics/` is unreachable (404) when logged out or logged in as a non-admin account, and reachable (Umami login screen) when logged in as tjraff5@gmail.com.
- Verify the tracking script fires on a real page load and an event shows up in the Umami dashboard.

## Out of scope

- Event/funnel tracking beyond Umami's default pageview tracking.
- Migrating existing Vercel Analytics history (not preserved).
- Multi-admin support (single hardcoded admin email is sufficient for now).
