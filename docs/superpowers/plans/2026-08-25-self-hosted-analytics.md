# Self-Hosted Analytics (Umami) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vercel Analytics with self-hosted Umami, reachable only through an authenticated proxy route so only the admin account (tjraff5@gmail.com) can ever load the dashboard.

**Architecture:** Umami + a dedicated Postgres container run on the existing EC2 box, bound to `127.0.0.1` only. A new Go backend route group (`/admin/analytics/*`) sits behind a session-cookie auth-gate middleware and reverse-proxies matching requests to Umami. No new DNS, subdomain, or SSL cert — everything rides the existing nginx/cert on the current domain. The frontend adds one `<script>` tag pointed at the proxy route; Vercel's `<Analytics />`/`<SpeedInsights />` components are removed.

**Tech Stack:** Go (chi router, `net/http/httputil.ReverseProxy`), Docker (`ghcr.io/umami-software/umami:postgresql-latest`, `postgres:16-alpine`), Next.js (root layout script tag), Terraform/systemd for EC2 deployment.

## Global Constraints

- Umami's DB must be a dedicated Postgres instance, isolated from Supabase — per the spec's requirement not to reintroduce Supabase egress load (see `docs/superpowers/specs/2026-08-25-self-hosted-analytics-design.md`).
- The auth-gate middleware must return `404 Not Found` for missing/non-admin sessions, never `401`/`403` — the route must not hint at its own existence.
- Admin identity check is by email (`user.Email == os.Getenv("ADMIN_EMAIL")`), not user ID.
- Umami and its Postgres container must bind to `127.0.0.1` only, never a public interface — same isolation pattern as the existing `guesswho-backend` container.
- No new Terraform-managed networking (no new security group rule, Elastic IP, or DNS record).

---

### Task 1: Auth-gate middleware for admin-only routes

**Files:**
- Create: `backend/internal/middleware/adminEmailMiddleware.go`
- Test: `backend/internal/middleware/adminEmailMiddleware_test.go`

**Interfaces:**
- Consumes: `middleware.GetUserFromContext(r *http.Request) *models.User` (existing, `backend/internal/middleware/userMiddleware.go:44`); `models.User.Email` field (existing, `backend/internal/models/user.go:11`).
- Produces: `middleware.AdminEmailMiddleware(next http.Handler) http.Handler` — a chi-compatible middleware. Must be chained **after** `NewUserMiddleware` (or `NewOptionalUserMiddleware`) in the route group, since it reads the user from context rather than the session cookie directly.

This middleware assumes the user is already resolved into context by `NewUserMiddleware` further up the chain (same pattern `AdminMiddleware` uses for the token, but here we're checking context instead of a header). If no user is in context (i.e. `NewUserMiddleware` already rejected the request with 401), this middleware never runs — but we still handle the nil case defensively in the test below, since it must never leak a 401/403 distinguishable from "route doesn't exist."

- [ ] **Step 1: Write the failing test**

```go
// backend/internal/middleware/adminEmailMiddleware_test.go
package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

func TestAdminEmailMiddleware_AllowsMatchingAdminEmail(t *testing.T) {
	os.Setenv("ADMIN_EMAIL", "tjraff5@gmail.com")
	defer os.Unsetenv("ADMIN_EMAIL")

	called := false
	handler := AdminEmailMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	user := &models.User{ID: uuid.New(), Email: "tjraff5@gmail.com"}
	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/", nil)
	req = req.WithContext(context.WithValue(req.Context(), UserContextKey, user))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler to be called for matching admin email")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestAdminEmailMiddleware_Returns404ForNonAdminEmail(t *testing.T) {
	os.Setenv("ADMIN_EMAIL", "tjraff5@gmail.com")
	defer os.Unsetenv("ADMIN_EMAIL")

	called := false
	handler := AdminEmailMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	user := &models.User{ID: uuid.New(), Email: "someone-else@example.com"}
	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/", nil)
	req = req.WithContext(context.WithValue(req.Context(), UserContextKey, user))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if called {
		t.Fatal("expected next handler NOT to be called for non-admin email")
	}
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestAdminEmailMiddleware_Returns404ForNoUserInContext(t *testing.T) {
	os.Setenv("ADMIN_EMAIL", "tjraff5@gmail.com")
	defer os.Unsetenv("ADMIN_EMAIL")

	called := false
	handler := AdminEmailMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if called {
		t.Fatal("expected next handler NOT to be called with no user in context")
	}
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/middleware/... -run TestAdminEmailMiddleware -v`
Expected: FAIL — `AdminEmailMiddleware` undefined.

- [ ] **Step 3: Write minimal implementation**

```go
// backend/internal/middleware/adminEmailMiddleware.go
package middleware

import (
	"net/http"
	"os"
)

// AdminEmailMiddleware restricts a route group to the single admin account,
// identified by email. Must run after NewUserMiddleware (or
// NewOptionalUserMiddleware) so the user is already in context.
//
// Returns 404 (not 401/403) on any rejection so the route's existence isn't
// hinted at to non-admins.
func AdminEmailMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromContext(r)
		adminEmail := os.Getenv("ADMIN_EMAIL")

		if user == nil || adminEmail == "" || user.Email != adminEmail {
			http.NotFound(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/middleware/... -run TestAdminEmailMiddleware -v`
Expected: PASS (all 3 subtests)

- [ ] **Step 5: Commit**

```bash
git add backend/internal/middleware/adminEmailMiddleware.go backend/internal/middleware/adminEmailMiddleware_test.go
git commit -m "Add admin-email auth gate middleware for analytics proxy"
```

---

### Task 2: Reverse-proxy handlers to Umami

Umami serves two kinds of traffic that need different auth treatment: the **dashboard** (must be admin-only) and the **tracking script + collection endpoint** (must be reachable by every visitor, or analytics breaks for everyone but the admin). This task builds one proxy constructor reused for both, mounted at two different paths with different middleware in Task 3.

**Files:**
- Create: `backend/internal/handlers/analytics_handler.go`
- Test: `backend/internal/handlers/analytics_handler_test.go`

**Interfaces:**
- Consumes: nothing from prior tasks (middleware is wired in routes.go, not called directly by this handler).
- Produces: `handlers.NewAnalyticsProxyHandler(targetURL, stripPrefix string) http.Handler` — an `http.Handler` that reverse-proxies all requests to `targetURL`, stripping `stripPrefix` so Umami sees paths rooted at `/`. Routes.go (Task 3) mounts this twice: once at `/admin/analytics/*` (gated, `stripPrefix="/admin/analytics"`) for the dashboard, and once at `/analytics-collect/*` (ungated, `stripPrefix="/analytics-collect"`) for the public script and collection endpoint.

- [ ] **Step 1: Write the failing test**

```go
// backend/internal/handlers/analytics_handler_test.go
package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAnalyticsProxyHandler_ForwardsToTargetWithStrippedPrefix(t *testing.T) {
	var gotPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))
	defer upstream.Close()

	proxy := NewAnalyticsProxyHandler(upstream.URL, "/admin/analytics")

	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/script.js", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if gotPath != "/script.js" {
		t.Fatalf("expected upstream to receive /script.js, got %q", gotPath)
	}
}

func TestAnalyticsProxyHandler_ForwardsCollectPathWithDifferentPrefix(t *testing.T) {
	var gotPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	proxy := NewAnalyticsProxyHandler(upstream.URL, "/analytics-collect")

	req := httptest.NewRequest(http.MethodPost, "/analytics-collect/api/send", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if gotPath != "/api/send" {
		t.Fatalf("expected upstream to receive /api/send, got %q", gotPath)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/handlers/... -run TestAnalyticsProxyHandler -v`
Expected: FAIL — `NewAnalyticsProxyHandler` undefined.

- [ ] **Step 3: Write minimal implementation**

```go
// backend/internal/handlers/analytics_handler.go
package handlers

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// NewAnalyticsProxyHandler builds a reverse proxy to the given Umami base
// URL (e.g. "http://127.0.0.1:3300"), stripping stripPrefix so Umami sees
// its own expected root-relative paths. Auth (or lack of it) is applied by
// the caller via middleware on the route this is mounted at — this handler
// has no opinion on who's allowed to call it.
func NewAnalyticsProxyHandler(targetURL, stripPrefix string) http.Handler {
	target, err := url.Parse(targetURL)
	if err != nil {
		panic("invalid analytics proxy target URL: " + err.Error())
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, stripPrefix)
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		proxy.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/handlers/... -run TestAnalyticsProxyHandler -v`
Expected: PASS (both subtests)

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/analytics_handler.go backend/internal/handlers/analytics_handler_test.go
git commit -m "Add reverse-proxy handler for self-hosted analytics"
```

---

### Task 3: Wire the route into routes.go

**Files:**
- Modify: `backend/internal/routes/routes.go`

**Interfaces:**
- Consumes: `middleware.AdminEmailMiddleware` (Task 1), `handlers.NewAnalyticsProxyHandler(targetURL, stripPrefix string) http.Handler` (Task 2), existing `optionalUserMiddleware` (already constructed in this file via `middleware.NewOptionalUserMiddleware(sessionService)`, used today for the `/player` public routes).
- Produces: `/analytics-collect/*` — an intentionally public, ungated route — consumed by the frontend's tracking script tag (Task 7).

**Correction from Task 1 review:** the plan originally called for chaining the strict `userMiddleware` (`NewUserMiddleware`) before `AdminEmailMiddleware`. That middleware itself returns `401` for a missing/invalid session — before `AdminEmailMiddleware` ever runs — which would leak a 401 to unauthenticated visitors and violate the "never 401/403, only 404" global constraint. Use `optionalUserMiddleware` instead: it never rejects, it just leaves the user unset in context when there's no valid session, so `AdminEmailMiddleware` is the sole gate and always returns 404 uniformly (nil user, wrong email — both cases already covered by Task 1's implementation and tests).

The Umami container's internal port is fixed at `3300` on the host in Task 6's deployment (Umami's own internal port is `3000`; `3300:3000` is the host mapping). Two routes are mounted against this one target, with different middleware:
- `/admin/analytics/*` — gated (dashboard UI). Only the admin should ever reach Umami's login screen at all.
- `/analytics-collect/*` — ungated (tracking script + Umami's `/api/send` collection endpoint). Every visitor's browser calls this, so it must not require a session.

- [ ] **Step 1: Add both route groups**

In `backend/internal/routes/routes.go`, after the existing `r.Route("/admin", ...)` block, add:

```go
	const umamiTarget = "http://127.0.0.1:3300"

	r.Route("/admin/analytics", func(r chi.Router) {
		r.Use(optionalUserMiddleware)
		r.Use(middleware.AdminEmailMiddleware)
		r.Handle("/*", handlers.NewAnalyticsProxyHandler(umamiTarget, "/admin/analytics"))
	})

	r.Handle("/analytics-collect/*", handlers.NewAnalyticsProxyHandler(umamiTarget, "/analytics-collect"))
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd backend && go build -o /dev/null ./server`
Expected: builds with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/routes/routes.go
git commit -m "Mount authenticated analytics proxy route"
```

---

### Task 4: Local docker-compose services for Umami + its Postgres

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `umami` service reachable at `http://localhost:3300` from the host (matches the hardcoded proxy target in Task 3), used by Task 5's manual verification and Task 7's frontend script tag during local dev.

- [ ] **Step 1: Add the services**

In `docker-compose.yml`, add two new services alongside `frontend` and `backend`:

```yaml
  umami-db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=umami
      - POSTGRES_PASSWORD=umami
      - POSTGRES_DB=umami
    volumes:
      - umami_db_data:/var/lib/postgresql/data
    restart: unless-stopped

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    environment:
      - DATABASE_URL=postgresql://umami:umami@umami-db:5432/umami
      - APP_SECRET=local-dev-secret-change-me
    ports:
      - "127.0.0.1:3300:3000"
    depends_on:
      - umami-db
    restart: unless-stopped
```

Add `umami_db_data` alongside the existing `node_modules_cache` entry under the top-level `volumes:` key.

- [ ] **Step 2: Verify it starts**

Run: `docker compose up -d umami-db umami && sleep 5 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3300`
Expected: `200`

Run: `docker compose down umami umami-db` when done verifying (or leave running for Task 5).

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "Add local Umami + Postgres services to docker-compose"
```

---

### Task 5: End-to-end auth gate verification (local)

**Files:**
- None created — this is a manual verification task using the pieces from Tasks 1–4.

**Interfaces:**
- Consumes: running `backend` (with `ADMIN_EMAIL` env var set) and `umami`/`umami-db` (Task 4) via `docker compose up`.
- Produces: nothing consumed by later tasks — this is a checkpoint before touching the frontend or deployment config.

- [ ] **Step 1: Start the full local stack with ADMIN_EMAIL set**

Add `ADMIN_EMAIL=tjraff5@gmail.com` to the `backend` service's `environment:` block in `docker-compose.yml` (temporarily, for this test — Task 6 makes this permanent for the EC2 deployment; local `.env`-based injection is fine here since docker-compose already reads env vars for other secrets like `DB_PASSWORD`).

Run: `docker compose up -d`

- [ ] **Step 2: Verify unauthenticated request gets 404**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/admin/analytics/`
Expected: `404`

- [ ] **Step 3: Verify non-admin session gets 404**

Sign up/in as a non-admin test user via the running frontend at `http://localhost:3080`, capture the `session_id` cookie from browser devtools, then:

Run: `curl -s -o /dev/null -w "%{http_code}\n" --cookie "session_id=<captured-value>" http://localhost:8080/admin/analytics/`
Expected: `404`

- [ ] **Step 4: Verify admin session reaches Umami's login screen**

Sign up/in with an account whose email is exactly `tjraff5@gmail.com` (create one locally if needed), capture that session's `session_id` cookie, then:

Run: `curl -s --cookie "session_id=<captured-value>" http://localhost:8080/admin/analytics/ | grep -o "<title>[^<]*</title>"`
Expected: title contains "umami" (Umami's login page HTML), confirming the proxy reached Umami and Umami's own login gate is the next layer.

- [ ] **Step 5: No commit** — this task is verification only. If any step fails, fix the relevant Task 1–4 code before proceeding, following the tests already written.

---

### Task 6: Deploy Umami + Postgres alongside the backend on EC2

**Files:**
- Modify: `terraform/scripts/user_data.sh`
- Modify: `terraform/variables.tf`
- Modify: `terraform/terraform.tfvars` (local only, gitignored — not committed)

**Interfaces:**
- Consumes: nothing from prior tasks directly, but must match the hardcoded `http://127.0.0.1:3300` target from Task 3.
- Produces: `guesswho-analytics` and `guesswho-analytics-db` systemd services on the EC2 box; `ADMIN_EMAIL` present in `/opt/backend/.env`.

- [ ] **Step 1: Add `admin_email` variable**

In `terraform/variables.tf`, add near the other app-config variables:

```hcl
variable "admin_email" {
  description = "Email of the account allowed to access self-hosted analytics"
  type        = string
}
```

- [ ] **Step 2: Add the value to terraform.tfvars**

Add this line to `terraform/terraform.tfvars` (gitignored, not committed):

```
admin_email = "tjraff5@gmail.com"
```

- [ ] **Step 3: Add `ADMIN_EMAIL` to the backend env template**

In `terraform/scripts/user_data.sh`, inside the existing `cat > /opt/backend/.env << 'ENVEOF'` block, add a line after `ALLOWED_ORIGINS=${allowed_origins}`:

```
ADMIN_EMAIL=${admin_email}
```

- [ ] **Step 4: Add systemd services for Umami and its Postgres**

In `terraform/scripts/user_data.sh`, after the existing `guesswho-backend.service` block, add:

```bash
# ── Analytics DB (Postgres) systemd service ─────────────────────
mkdir -p /opt/analytics-db

cat > /etc/systemd/system/guesswho-analytics-db.service << 'SERVICEEOF'
[Unit]
Description=GuessWho Analytics DB (Postgres)
After=docker.service network-online.target
Requires=docker.service

[Service]
Restart=always
RestartSec=10
ExecStartPre=-/usr/bin/docker rm -f guesswho-analytics-db
ExecStart=/usr/bin/docker run --rm \
    --name guesswho-analytics-db \
    -e POSTGRES_USER=umami \
    -e POSTGRES_PASSWORD=umami \
    -e POSTGRES_DB=umami \
    -v /opt/analytics-db:/var/lib/postgresql/data \
    -p 127.0.0.1:5433:5432 \
    postgres:16-alpine
ExecStop=/usr/bin/docker stop guesswho-analytics-db

[Install]
WantedBy=multi-user.target
SERVICEEOF

# ── Analytics (Umami) systemd service ────────────────────────────
cat > /etc/systemd/system/guesswho-analytics.service << 'SERVICEEOF'
[Unit]
Description=GuessWho Analytics (Umami)
After=docker.service network-online.target guesswho-analytics-db.service
Requires=docker.service guesswho-analytics-db.service

[Service]
Restart=always
RestartSec=10
ExecStartPre=-/usr/bin/docker rm -f guesswho-analytics
ExecStart=/usr/bin/docker run --rm \
    --name guesswho-analytics \
    -e DATABASE_URL=postgresql://umami:umami@host.docker.internal:5433/umami \
    -e APP_SECRET=${admin_email} \
    --add-host=host.docker.internal:host-gateway \
    -p 127.0.0.1:3300:3000 \
    ghcr.io/umami-software/umami:postgresql-latest
ExecStop=/usr/bin/docker stop guesswho-analytics

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl enable guesswho-analytics-db guesswho-analytics
```

Note: `APP_SECRET` here reuses `admin_email` only as a quick unique-per-deploy value — this is a placeholder for a real random secret. Flag this explicitly in Step 5 below rather than treating it as done.

- [ ] **Step 5: Replace the placeholder APP_SECRET with a real random secret**

Generate one: `openssl rand -hex 32`

Replace `-e APP_SECRET=${admin_email} \` in the `guesswho-analytics.service` block (Step 4) with a hardcoded output of that command, e.g. `-e APP_SECRET=<generated-hex-string> \`. This does not need to be a Terraform variable — it's an internal session-signing secret for Umami, not a value anyone needs to reference elsewhere.

- [ ] **Step 6: Verify Terraform plan is clean**

Run: `cd terraform && terraform plan`
Expected: no errors; plan shows the `user_data` script change will trigger an instance replacement (expected — `user_data` changes require recreating the EC2 instance, same as any prior change to this script).

- [ ] **Step 7: Commit**

```bash
git add terraform/scripts/user_data.sh terraform/variables.tf
git commit -m "Deploy self-hosted Umami analytics alongside backend on EC2"
```

(`terraform.tfvars` is gitignored and not part of this commit — the user must add `admin_email` to their own local copy before running `terraform apply`.)

---

### Task 7: Frontend tracking script + remove Vercel Analytics

**Files:**
- Modify: `frontend/src/app/layout.js`
- Modify: `frontend/package.json` (remove now-unused dependencies)

**Interfaces:**
- Consumes: `/analytics-collect/*` route (Task 3) — the intentionally public, ungated proxy path for Umami's tracking script and collection endpoint.

- [ ] **Step 1: Add the tracking script to the root layout**

In `frontend/src/app/layout.js`, remove:

```js
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
```

and remove the corresponding JSX:

```js
        <Analytics />
        <SpeedInsights />
```

Add near the top with other imports:

```js
import { API_URL } from "@/lib/api";
```

Add inside `<body>`, alongside the existing `jsonLd` `<script>` tag:

```jsx
        <script
          async
          defer
          data-website-id="REPLACE_WITH_UMAMI_WEBSITE_ID"
          src={`${API_URL}/analytics-collect/script.js`}
        />
```

The `data-website-id` value is generated by Umami when you register the site in its dashboard (Task 8, first-run step) — this is a real placeholder that must be filled in manually after Umami is deployed and the site is registered through its UI; it cannot be known ahead of that step.

- [ ] **Step 2: Remove unused Vercel packages**

Run: `cd frontend && npm uninstall @vercel/analytics @vercel/speed-insights`

- [ ] **Step 3: Verify the build**

Run: `cd frontend && npm run build`
Expected: builds with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.js frontend/package.json frontend/package-lock.json
git commit -m "Replace Vercel Analytics with self-hosted Umami tracking script"
```

---

### Task 8: Deploy and register the site in Umami

**Files:**
- None — operational steps only.

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: a live `data-website-id`, to be pasted into `frontend/src/app/layout.js` (Task 7 Step 1) and redeployed.

- [ ] **Step 1: Apply Terraform**

Run: `cd terraform && terraform apply`
Expected: EC2 instance recreated with the new `user_data.sh` (this will briefly interrupt the live backend — confirm the user is fine with that timing before running).

- [ ] **Step 2: Push the backend image and start services** (same as existing deployment flow — see `terraform output next_steps`)

Run the ECR push commands from `terraform output next_steps`, then:

```bash
ssh -i ~/.ssh/guesswho.pem ec2-user@<elastic-ip>
sudo systemctl start guesswho-backend
sudo systemctl status guesswho-analytics-db guesswho-analytics
```

Expected: both analytics services show `active (running)`.

- [ ] **Step 3: Log into Umami and register the site**

From your own machine (as the admin), sign into the GuessWho frontend with the `tjraff5@gmail.com` account, then visit `https://<your-domain>/admin/analytics/`. Expected: Umami's login page loads.

Log in with Umami's default credentials (`admin` / `umami`) — Umami prints these on first run. **Immediately change the password** via Umami's own settings UI.

In Umami's dashboard, add a new website (your production domain). Copy the generated **Website ID**.

- [ ] **Step 4: Wire the real website ID into the frontend**

Update `frontend/src/app/layout.js`, replacing `REPLACE_WITH_UMAMI_WEBSITE_ID` with the copied ID.

```bash
git add frontend/src/app/layout.js
git commit -m "Set production Umami website ID"
```

Redeploy the frontend (existing Vercel flow — push to the branch Vercel tracks, or `vercel --prod` per current project setup).

- [ ] **Step 5: Verify end-to-end**

Visit the live site in a normal (non-admin) browser session, navigate a couple of pages, then check the Umami dashboard (as admin) for a recorded pageview.

Visit `https://<your-domain>/admin/analytics/` while logged out, or logged in as a non-admin account — expect `404` in both cases.

No commit — this is final verification.
