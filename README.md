# Custom Guess

A real-time multiplayer deduction game. Two players secretly pick a character from a shared board, then take turns asking yes/no questions to eliminate possibilities and guess the opponent's character first.

## Features

- Real-time gameplay over WebSockets
- Custom character sets — upload your own images and attributes
- Guest play — no account required
- Lobby system with shareable codes
- Win/loss stats and player profiles
- Rematch flow after games end
- Admin dashboard for moderation

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Framer Motion, Material UI, Tailwind CSS |
| Backend | Go 1.25, chi router, GORM, Gorilla WebSocket |
| Database | PostgreSQL (Supabase) |
| Storage | Cloudflare R2 |
| Infrastructure | Docker Compose |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- A `.env` file in the project root (see below)

### Environment Variables

Create a `.env` file in the repo root:

```env
DB_PASSWORD=your_db_password
RESEND_API_KEY=your_resend_key
APP_BASE_URL=http://localhost:3080
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
ADMIN_TOKEN=your_admin_token
ALLOWED_ORIGINS=http://localhost:3080
```

### Run

```bash
docker-compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3080 |
| Backend | http://localhost:8080 |

## Project Structure

```
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # Pages (App Router)
│       └── components/
├── backend/
│   └── internal/
│       ├── handlers/  # HTTP handlers
│       ├── services/  # Business logic
│       ├── models/    # GORM models
│       ├── routes/    # Route registration
│       └── middleware/
├── terraform/         # AWS infrastructure
└── docker-compose.yml
```

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev    # Starts dev server on :3000
npm run lint
```

### Backend

```bash
cd backend
go mod download
go run ./server   # Requires a running Postgres instance
```

## Architecture Notes

- **Auth**: Session cookie-based. Guests get a generated UUID stored in a cookie; no account needed.
- **Real-time**: WebSocket hub at `GET /ws`. The backend broadcasts game events to all clients in a lobby by `lobbyId`.
- **Turn authority**: The backend is the source of truth for whose turn it is.
- **Lobby cleanup**: A background service deletes inactive lobbies after 30 minutes, or 5 minutes after a game ends.
- **Schema**: GORM auto-migrates the database schema on startup.

## Deployment

The backend can be deployed to an EC2 instance using the Terraform config in `/terraform`. The frontend is deployed to Vercel.
