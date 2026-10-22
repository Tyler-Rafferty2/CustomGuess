# Friends, Following & Public Profiles — Design

Date: 2026-10-22
Status: Draft for approval

## Why

Custom Guess had a viral traffic spike in late August 2026 that didn't retain (see the growth/social initiative). Sharing shipped first; this is the next step. Today the site is a place you visit once with a lobby code. The goal is to make it feel social — a place where your people are — by letting players:

- see which of their friends are online right now,
- pull a friend straight into a game with an invite instead of passing a lobby code around,
- look at another player's profile and their sets,
- follow creators whose sets they like and keep track of what they've made.

Success looks like friends returning to play each other repeatedly, and guests creating accounts to get access to this.

## Goals

1. **Public profile page** for every signed-up user.
2. **Friends**: mutual, request/accept relationship.
3. **Following**: one-way, no approval, for keeping track of a creator's sets.
4. **Online presence** for friends, visible anywhere on the site.
5. **Invites**: send a friend a game invite; they get a popup wherever they are on the site.

## Non-goals

- Guests do not get friends, following, profiles, presence or invites. Signed-up users only. (Decided by the user — this doubles as a reason to sign up.)
- No public recent-games history or liked-sets list on profiles (user explicitly dropped these).
- No chat/DMs between friends.
- No email or push notifications for friend requests, invites or new sets from followed creators.
- No activity feed beyond the Following tab described below.

## Anti-goals

- An invite popup interrupting someone mid-game.
- Exposing someone's online status to strangers.
- Profile links breaking when a user changes their username.

## Ways people become friends

In expected order of frequency (user's view):

1. **People they already know** — search by username and send a request.
2. **People they just played** — "Add friend" on the end-of-game screen next to Rematch.
3. **Creators of sets they like** — "Created by X" on sets links to X's profile, which has Add friend and Follow.

## Features

### 1. Public profile

- Route: `/u/{slugified-username}-{user-uuid}` *(my call)*, following the existing `/gallery/{slug}-{uuid}` pattern in `frontend/src/lib/slug.js`: UUID is the source of truth, prefix is decorative, redirect to canonical slug on mismatch. Usernames can change (`User.UsernameChangedAt`), so links must survive renames.
- Sections (user-approved; draft mockup at `.superpowers/brainstorm/*/content/public-profile.html`):
  1. **Header**: initials avatar, username, join date, counts (friends, followers, public sets), and actions:
     - not friends → **Add friend** (or "Request sent" / "Accept request" depending on state) + **Follow / Following**
     - friends → **Invite** when they're online, otherwise a "Friends" state with a way to remove the friend
     - viewing your own profile → no actions (link to the existing private `/profile`)
  2. **Stats**: games played, win rate, total plays across their sets, total likes across their sets.
  3. **Their public sets**: grid, each card linking to the existing gallery set page.
- Online indicator in the header is shown **only to friends** *(my call)*.
- Every "Created by X" in the gallery and set pages becomes a link to X's profile.
- Guest users have no profile page (404 / not found).
- Viewable by anyone, including signed-out visitors and guests; the action buttons for a guest/signed-out viewer prompt sign-up.
- The existing private `/profile` page stays as-is apart from a link to "view your public profile".

### 2. Friends

- Mutual. A request must be accepted.
- States between two users: none → pending (A requested B) → friends. Declining returns to none. Either side can remove a friend afterward. If B requests A while A→B is pending, treat it as an accept *(my call)*.
- Adding paths: username search on the Friends page, end-of-game screen, public profile.
- End-of-game "Add friend": requires both players to be signed up. Hide it if either is a guest or they're already friends.
- `GameRecord` currently stores `OpponentName` only. Add an `OpponentUserID` (nullable) so the end-game screen and future features can link to the real opponent. Old records stay unlinked.

### 3. Following

- One-way, no approval. Follow/Unfollow button on profiles.
- Purpose (user's words): "keeping track of their sets". Delivered through the **Following tab** on the Friends page: the creators you follow, plus their public sets newest first *(my call on exact layout)*.
- Follower count shown on profiles. Following is independent of friendship — you can be friends and also follow.

### 4. Friends UI

Two surfaces (user picked A + C from the placement mockup):

**Navbar dropdown** (signed-up users only)
- Friends icon next to the avatar with a badge counting pending incoming requests.
- Panel: incoming requests (accept / decline) → online friends (with **Invite**, or "in game" status instead of Invite) → offline friends (muted).
- Link to the full Friends page.
- Mobile: needs an equivalent in the bottom tab bar / menu *(placement left to builder, must follow designSchema mobile rules: 44px touch targets, no hover-only states)*.

**Friends page** (e.g. `/friends`)
- Tabs: **Friends**, **Requests** (incoming + outgoing, with cancel for outgoing), **Following**.
- Add-by-username box.
- Each friend row: initials avatar, name (links to profile), presence ("Online", "In a game", "Offline"), Invite button when online and not in a game.

### 5. Presence & invites (live layer)

**Presence**
- Signed-up users have a site-wide real-time connection while they have the site open, separate from the per-lobby game WebSocket (which currently requires a `lobbyId` — `backend/internal/handlers/websocket_handler.go`).
- Three states, visible to friends only: **online**, **in a game** (in a lobby whose game has started), **offline**.
- Friends' presence updates live in the dropdown and Friends page.
- The connection must be authenticated by the existing session cookie, not by client-supplied query params. Because that cookie is sent cross-site, the connection must check the request origin against the allowed frontend origin(s) rather than copying the existing `CheckOrigin: return true` *(my call)*.

**Invites**
- Two ways to send:
  1. **From the dropdown / Friends page / profile**: click Invite → pick a set and settings using the existing create-game flow (`CreateGameModal`) → lobby is created, inviter lands in it and waits → invite sent.
  2. **From a waiting lobby**: while the inviter is in a lobby with no opponent yet, a panel lists online friends with Invite buttons.
- Recipient sees a **popup** (designSchema Modal or Toast-like card — builder's call within the schema) wherever they are on the site: who invited them, which set, **Accept** / **Decline**.
  - Accept → they join that lobby (via the existing join-by-code path) and are navigated there.
  - Decline → inviter sees "X declined".
- Recipient is **waiting in a lobby of their own** (game not started) → they count as online, get the popup normally, and **Accept asks "Leave your current lobby?"** before switching them over (user decision). Confirming leaves/cancels their current lobby, then joins the inviter's. If an opponent had already joined that lobby, it goes through the existing pre-game leave path so that opponent is told. The backend today rejects joining while in any non-finished lobby (`GetPlayerByUser` → `ALREADY_IN_GAME`), so this needs a leave-then-join path.
- Same rule for the inviter: if they're in a waiting lobby and use invite path 1, the create flow asks "Leave your current lobby?" first *(my call)*.
- Lobbies created through invite path 1 are always **private**, so a stranger can't take the seat through lobby browsing before the friend accepts *(my call)*.
- Recipient is in an active game → no popup is shown; the Invite button is not offered for "in a game" friends in the first place. If an invite races with them starting a game, drop it silently *(my call)*.
- Invite expires after ~60 seconds or when the lobby fills/closes; the inviter sees it expire *(my call on duration)*.
- One pending invite per inviter→recipient pair at a time *(my call)*.
- Only friends can invite each other.

## Abuse limits *(my calls)*

- Rate-limit friend requests and invites using the existing rate-limit middleware (`StrictRateLimitMiddleware` or equivalent).
- A declined friend request can't be re-sent to the same person for a cooldown period (e.g. 24h) to prevent spam.
- No blocking feature in this release; declining/removing is enough for now. Revisit if abuse appears.

## Constraints

- Follow `designSchema.txt` for all UI: cream `#F7F3EE` background, terracotta `#D9572B` sole accent, Fraunces + DM Sans, 6px radius everywhere (circular avatars are the explicit exception), 4px spacing grid, no emoji in UI, Framer Motion for modal enter (400ms), every state designed, mobile rules.
- `--state-live` green is reserved for game state; the online dot is a borderline case — builder may use it for presence since it means "alive/active", but must not use color alone (pair with the text "Online").
- Backend: Go, chi, GORM auto-migration (new tables come from new models registered in `config/database.go`). Follow the handler → service layering.
- Signed-up-only endpoints must reject guests (`User.IsGuest`).
- Production runs a single backend instance on EC2 (see AWS deployment notes), so in-memory presence in the hub is acceptable; Redis is available if the builder wants it.
- The user runs builds and tests themselves; do not run build tests (CLAUDE.md).
- Database egress is a known cost issue (Supabase free tier was exceeded once). Presence must not poll the DB; profile/friends queries should be bounded and batched.

## Delivery

Ships as **one release**, but built in stages the user can test between:

1. Profiles + following (public profile page, creator links, follow, Following tab).
2. Friends (model, requests, Friends page, navbar dropdown without live presence, end-game Add friend, `OpponentUserID`).
3. Live layer (site-wide connection, presence, invite popups, invite from waiting lobby).

## Left to the builder

- Table/model shapes for friendships, follows and invites; API route names.
- Whether invites are persisted or held in memory.
- Exact visual design of the dropdown, Friends page, invite popup and lobby invite panel within designSchema.
- Mobile placement of the friends entry point.
- How the site-wide connection is mounted on the frontend (likely alongside `UserContext`).
