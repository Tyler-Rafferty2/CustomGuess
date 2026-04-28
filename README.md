# Custom Guess

A full-stack, real-time multiplayer deduction game — a modern take on the classic Guess Who board game. Players create lobbies, pick secret characters from a shared board, and take turns asking yes/no questions to eliminate possibilities and guess the opponent's character first.

**Live at [customguess.com](https://customguess.com)**

---

## What Makes This Interesting

Most real-time game projects are toy demos. This one handles the messy edge cases that make multiplayer feel real:

- **Disconnect/reconnect with grace periods** — If a player drops mid-game, their opponent sees a live countdown and the disconnected player has 2 minutes to rejoin before the game is forfeited. Pre-game disconnects have a shorter 30-second window. Intentional leaves (clicking a button) suppress the disconnect notification entirely so the opponent doesn't see a false alarm.
- **Per-lobby turn timers** — Configurable per game. The hub holds goroutine-backed timers keyed by lobby ID. If a player's timer expires, the turn is skipped server-side. Timers support pause/resume, including a mutual-consent pause flow where both players must agree.
- **Two-tier rate limiting** — Global routes: 30 req/s per IP, burst 60. Game action routes (eliminations, guesses, chat): 5 req/s, burst 10. Implemented as token-bucket middleware using `golang.org/x/time/rate`.
- **Custom character sets** — Any user can build a character set by uploading images (with in-browser cropping) and defining attributes. Sets can be public or private. The backend stores images in Cloudflare R2 and serves signed URLs.
- **Rematch flow** — After a game ends, either player can propose a rematch. The backend creates a new lobby, optionally swapping the character set, and both players are routed there via a WebSocket event.
- **Guest play** — No account needed. Guests are issued an HttpOnly session cookie on first visit. Guest and registered user state is unified behind the same auth middleware.

---

## Architecture

```
Browser ──── REST (JSON) ─────────────────► Go backend (chi router)
        ──── WebSocket ──────────────────►  Hub (goroutine, channels)
                                            │
                                     GORM  ▼
                                        PostgreSQL (Supabase)
                                            │
                                    AWS S3-compatible API
                                        Cloudflare R2
```

**Frontend** — Next.js 15 App Router, React 19, Framer Motion, Material UI, Tailwind CSS. Deployed on Vercel.

**Backend** — Go 1.25, chi router, GORM, Gorilla WebSocket. Deployed on EC2 (provisioned with Terraform).

**Database** — PostgreSQL via Supabase. GORM auto-migrates the schema on startup. Eliminated characters per player are stored as `jsonb` arrays.

**Storage** — Cloudflare R2 for character images. The backend holds the R2 client and signs all URLs server-side.

---

## Real-Time Engine

The WebSocket hub is the most technically involved part of the backend. It runs as a single long-lived goroutine and coordinates all game events using Go channels and `sync.RWMutex` for safe concurrent reads.

```go
type Hub struct {
    lobbies          map[string]map[string]*models.Client
    broadcast        chan models.Message
    register         chan *models.Client
    unregister       chan *models.Client
    mu               sync.RWMutex
    disconnectTimers map[string]*time.Timer   // grace-period timers per player
    turnTimers       map[string]*time.Timer   // per-lobby turn timers
    suppressDisconnect map[string]bool         // intentional-leave tracking
    ...
}
```

When a client unregisters, the hub checks whether the disconnect was intentional (via a suppress flag set by the leave handler) before broadcasting `opponent_disconnected` and starting the grace-period countdown. This prevents false forfeits when a player manually exits.

---

## Backend Structure

```
backend/internal/
├── handlers/       # HTTP layer — one file per resource
├── services/       # Business logic (hub, game state, lobbies, sessions, email, cleanup)
├── models/         # GORM models: User, Lobby, Player, GameState, Character, CharacterSet, ...
├── middleware/     # CORS, session auth, rate limiting, admin token
├── routes/         # All route registration
└── config/         # DB + R2 client init
```

The service layer is kept separate from handlers so business logic is testable without HTTP context. The hub, cleanup ticker, and email service all start as independent goroutines in `main.go`.

---

## Frontend Structure

```
frontend/src/
├── app/                  # Next.js App Router
│   ├── page.js           # Home / lobby browser
│   ├── lobby/[lobbyId]/  # Live game room
│   ├── set/new/          # Character set builder
│   ├── edit/[setId]/     # Set editor
│   ├── profile/          # Stats and history
│   ├── signin/ signup/   # Auth
│   └── ...
├── components/           # Navbar, chat, game controls, set cover
├── context/              # UserContext — global auth/guest state
└── lib/
    ├── api.js            # All fetch calls, env-aware base URL
    └── imgUrl.js         # R2 URL helper
```

The game room (`lobby/[lobbyId]`) holds the WebSocket connection and all live game state. Framer Motion drives all transitions — card flips (600ms), modals (400ms), and state changes — without any CSS keyframes.

---

## Key Design Decisions

**Session cookies over JWTs** — HttpOnly cookies with sliding expiry. No token storage in localStorage, no XSS exposure on credentials. Guest sessions use the same mechanism.

**Backend-authoritative turns** — The client never decides whose turn it is. Every action goes through the backend, which validates turn ownership before mutating state and broadcasting the result.

**Lobby cleanup as a background service** — A goroutine runs every 3 minutes and deletes lobbies idle for 30+ minutes, or finished games 5+ minutes after `game_over_at`. Cascading deletes on all lobby relations keep the schema clean.

**Single character-set copy per lobby** — When a game starts, characters are copied into `LobbyCharacter` rows scoped to the lobby. This means the original set can be edited or deleted mid-game without affecting ongoing play.

---

## Stack

| | |
|---|---|
| **Frontend** | Next.js 15, React 19, Framer Motion, Material UI, Tailwind CSS |
| **Backend** | Go 1.25, chi, GORM, Gorilla WebSocket |
| **Database** | PostgreSQL (Supabase) |
| **Storage** | Cloudflare R2 |
| **Infrastructure** | Docker Compose (dev), EC2 + Terraform (prod), Vercel (frontend) |
| **Email** | Resend |

---

## Running Locally

```bash
# Copy and fill in credentials
cp .env.example .env

docker-compose up
# Frontend → http://localhost:3080
# Backend  → http://localhost:8080
```
