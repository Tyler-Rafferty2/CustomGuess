# Feature Poll — Design

**Date:** 2026-10-08
**Status:** Draft, awaiting review

## Goal

Collect signal from registered users on which feature to build next, via a poll on the homepage. One poll at a time; options are chosen by the developer.

## Poll content

- **Question:** "What should we build next?"
- **Options:**
  - `friends` — **Friends & rivals**: add friends, invite them directly, track head-to-head records
  - `cosmetics` — **Profile cosmetics**: avatars, badges, card backs
  - `creator_rewards` — **Creator rewards**: perks & recognition when your sets get played a lot
- **Optional comment:** "Something else? Tell us" (free text, max 500 chars)

## Rules

- Only registered (non-guest) users can vote. Guests see a "Sign up to vote" teaser.
- One vote per user per poll. **Users can change their vote (and comment) at any time**; a change overwrites the previous vote.
- Results (percentages + total vote count) are shown to a user only after they have voted.
- A user may dismiss the poll card; dismissal is per-browser (`localStorage`, keyed by poll ID), so a new poll reappears.

## Backend

### Poll definition — `backend/internal/services/poll.go`

Hardcoded `CurrentPoll` struct: `ID` (e.g. `"next-feature-2026-10"`), `Question`, ordered `Options []{Key, Label, Description}`. Running a new poll = change the ID and options, deploy. Old votes remain under the old poll ID.

Service functions:
- `GetPollForUser(userID) (PollView, error)` — poll definition, the user's vote (option key + comment, or null), and results if the user has voted.
- `CastVote(userID, optionKey, comment) error` — validates option key and comment length, upserts on `(poll_id, user_id)`.
- `GetPollAdminResults() (...)` — per-option counts and all comments with timestamps.

### Model — `backend/internal/models/pollVote.go`

```go
type PollVote struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
    PollID    string    `gorm:"not null;uniqueIndex:idx_poll_user"`
    UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_poll_user"`
    OptionKey string    `gorm:"not null"`
    Comment   string    `gorm:"type:text"`
    CreatedAt time.Time `gorm:"autoCreateTime"`
    UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
```

Added to auto-migration in `config/database.go`. Upsert via GORM `clause.OnConflict{Columns: poll_id,user_id; DoUpdates: option_key, comment, updated_at}`.

### Handlers & routes — `handlers/poll_handler.go`, `routes/routes.go`

Under `userMiddleware`:
- `GET /poll` → `PollView` JSON:
  ```json
  { "id": "...", "question": "...", "options": [{"key","label","description"}],
    "myVote": {"optionKey": "...", "comment": "..."} | null,
    "results": {"total": 42, "percentages": {"friends": 50, ...}} | null }
  ```
  Guests get the poll with `myVote: null, results: null` (frontend shows teaser).
- `POST /poll/vote` body `{ "optionKey": "...", "comment": "..." }`
  - 403 if the user is a guest
  - 400 for unknown option key or comment > 500 chars
  - 200 with the updated `PollView` (so the UI can render results immediately)
  - Wrapped with the existing `StrictRateLimitMiddleware`.

Under `AdminMiddleware`:
- `GET /admin/poll` → counts per option + list of `{optionKey, comment, updatedAt, username}` for non-empty comments. Small section added to `handlers/admin.html`.

## Frontend

### Placement — `frontend/src/app/HomePageClient.js`

The poll card sits **to the right of** the existing hero actions column.

- **> 1024px:** two-column row — actions column (440px) left, poll card (~360px) right, ~48px gap, vertically centered; the pair stays centered on the page.
- **≤ 1024px:** poll card stacks below "Join with code", matching the column width.
- **No poll shown** (dismissed / fetch failed / loading): layout is identical to today's single centered column.

```
  MULTIPLAYER · REAL-TIME            ┌─────────────────────────┐
  Custom Guess                       │ What should we build    │
  Ask questions. Eliminate...        │ next?                 ✕ │
  ─────────────────────────          │ ○ Friends & rivals      │
  [ + Create Game         ]          │ ○ Profile cosmetics     │
  [   Browse Public Games ]          │ ○ Creator rewards       │
  JOIN WITH CODE                     │ [Something else?      ] │
  [XXXX        ][ Join → ]           │              [ Vote ]   │
  ─────────────────────────          └─────────────────────────┘
```

### `frontend/src/components/FeaturePoll.js`

Follows `designSchema.txt` (cream card, terracotta accent, Fraunces heading, DM Sans body, Framer Motion). Expanded by default.

States:
1. **Hidden** — fetch failed, still loading auth, or dismissed for this poll ID.
2. **Guest teaser** — question + option labels (non-interactive) + "Sign up to vote" link to `/signup`.
3. **Voting** — option cards (single select), optional comment textarea (500 char limit), Vote button. Inline error on failure.
4. **Results** — animated percentage bars, user's choice highlighted, total votes, "Thanks!" line, and a **"Change vote"** link that returns to state 3 with the current option and comment prefilled; button reads "Update vote".

Dismiss (✕) on states 2–4 writes `localStorage["poll-dismissed-<pollId>"]` (wrapped in try/catch).

Uses existing `apiFetch` from `@/lib/api` and `UserContext` (`user.isGuest`).

## Error handling

- `GET /poll` failure → component renders nothing; homepage layout unchanged.
- `POST /poll/vote` failure → inline error message, selection preserved.

## Testing

Go handler/service tests (`poll_handler_test.go`):
- guest vote → 403
- unknown option → 400; comment > 500 chars → 400
- first vote creates row; second vote with a different option updates the same row (count stays 1, option changes)
- `GET /poll` returns `results: null` before voting, populated after
- percentages computed correctly across multiple users

Builds and browser verification are done by the developer (per CLAUDE.md).

## Out of scope

- Admin CRUD for polls, multiple concurrent polls, scheduled poll open/close.
