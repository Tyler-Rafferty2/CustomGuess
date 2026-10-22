# Friends, Following & Public Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public profiles, one-way following, mutual friends, live presence, and game invites for signed-up users.

**Architecture:** New Go models (`Friendship`, `Follow`) and services (`FriendService`, `FollowService`, `ProfileService`) follow the existing store-interface pattern of `poll_service.go`. A new in-memory `PresenceHub` holds one site-wide WebSocket set per signed-up user, separate from the per-lobby `Hub`. It pushes presence and invite events. `InviteService` keeps invites in memory with a 60s TTL and joins lobbies through the existing `LobbyService`. The frontend adds a `PresenceProvider` next to `UserProvider`, a navbar dropdown, a `/friends` page, a `/u/[slug]` profile page, an invite popup, and an invite panel in the waiting lobby.

**Tech Stack:** Go 1.24, chi, GORM, Gorilla WebSocket; Next.js 15 App Router, React 19, Framer Motion.

**Spec:** `docs/superpowers/specs/2026-10-22-friends-social-design.md`

## Global Constraints

- **Do not run builds or tests.** CLAUDE.md says the user runs them. Write the tests; the user runs them at each Checkpoint task.
- All social endpoints reject guests (`User.IsGuest`) with 403. Profiles are readable by anyone.
- **UI:** Read `designSchema.txt` in full before any frontend task.
  - Colors: bg `#F7F3EE`, accent `#D9572B` only. Fonts: Fraunces display, DM Sans UI. Radius 6px everywhere; circular avatars are the commented exception. Spacing on a 4px grid.
  - No emoji in UI. Modal enter is 400ms translateY(16px)+opacity with ease-out. Respect `prefers-reduced-motion`.
  - Touch targets at least 44px, and no hover-only states.
- The online dot must be paired with the text "Online" / "In a game" (color is never the only signal).
- Presence must never poll the DB. Profile and friends queries are batched (no per-row queries).
- Friend request cooldown after a decline: **24h**. Invite TTL: **60s**. One pending invite per (from, to) pair.
- Lobbies created for an invite are always private.
- Commits: no `Co-Authored-By` trailer (user memory rule).
- Backend layering: handler → service; register new models in `config/database.go` AutoMigrate.

## Review Focus

1. **A user has two tabs open and closes one.** They must stay "online"; only the last connection closing makes them offline. Test: `TestPresenceHub_StaysOnlineUntilLastConnection` (Task 9).
2. **A friend accepts an invite after the lobby filled, closed, or the 60s expired.** They get a clear "invite no longer available" response, are not left half-joined, and their own waiting lobby is not left. Test: `TestInvite_AcceptAfterLobbyFull_DoesNotLeaveCurrent` (Task 10).
3. **A friend in a started game gets an Accept through (race).** It must be refused and must never forfeit their real game. Test: `TestInvite_AcceptWhileInStartedGame_Refused` (Task 10).
4. **A guest or signed-out caller hits a social endpoint.** It returns 403/401, never a 500 or a half-created row. Test: `TestFriend_GuestRejected` (Task 2).
5. **Both users send a request to each other at the same time, or re-request right after a decline.** The first becomes friends; the second is refused until the 24h cooldown passes. Tests: `TestFriend_MutualRequestAccepts`, `TestFriend_DeclineCooldown` (Task 2).

---

## File Structure

**Backend (`backend/internal/`)**
- `models/friendship.go`: `Friendship` row (one per requester→addressee pair)
- `models/follow.go`: `Follow` row
- `models/gameRecord.go`: add `OpponentUserID`
- `services/friend_service.go` + `_test.go`: requests, accept/decline/cancel/remove, list, relationship
- `services/follow_service.go` + `_test.go`: follow/unfollow, following feed
- `services/profile_service.go`: public profile aggregate
- `services/presence_hub.go` + `_test.go`: site-wide connections, status, push events
- `services/invite_service.go` + `_test.go`: in-memory invites
- `services/lobby_service.go`: `Presence` hook, `OpponentUserID`
- `handlers/social_handler.go`: profile, follow, friend, and invite HTTP handlers
- `handlers/presence_ws_handler.go`: `/presence/ws`
- `routes/routes.go`, `config/database.go`: wiring

**Frontend (`frontend/src/`)**
- `lib/slug.js`: `userProfilePath`, `parseIdFromSlug`
- `app/u/[slug]/page.js`, `app/u/[slug]/ProfileClient.js`: public profile
- `components/RelationshipButtons.js`: Add friend / Follow / Invite state machine (profile + end-game)
- `context/PresenceContext.js`: site-wide socket, friends state, invites; renders `InvitePopup`
- `components/InvitePopup.js`
- `components/FriendsDropdown.js`, `components/navbar.js`: navbar entry
- `app/friends/page.js`: Friends / Requests / Following tabs
- `components/LobbyInvitePanel.js`, `app/lobby/[lobbyId]/page.js`: waiting-room panel and end-game Add friend
- `app/create/page.js`, `app/create/LobbyForm.js`: `?invite=` flow
- `app/gallery/[slug]/page.js`: creator link

---

## Stage 1 — Profiles + Following

### Task 1: Follow model, FollowService, routes

**Files:**
- Create: `backend/internal/models/follow.go`, `backend/internal/services/follow_service.go`, `backend/internal/services/follow_service_test.go`, `backend/internal/handlers/social_handler.go`
- Modify: `backend/internal/config/database.go:50`, `backend/internal/routes/routes.go`

**Interfaces:**
- Produces:
  - `models.Follow{FollowerID uuid.UUID (pk); CreatorID uuid.UUID (pk, index); CreatedAt time.Time}` (json `followerId`, `creatorId`, `createdAt`)
  - `services.ErrGuestNotAllowed = errors.New("sign up to use social features")`: shared by every social service
  - `services.ErrSelf = errors.New("cannot do that to yourself")`
  - `services.ErrUserNotFound = errors.New("user not found")`
  - `type FollowStore interface { Follow(followerID, creatorID uuid.UUID) error; Unfollow(followerID, creatorID uuid.UUID) error; IsFollowing(followerID, creatorID uuid.UUID) (bool, error); FollowerCount(creatorID uuid.UUID) (int64, error); FollowedCreators(followerID uuid.UUID) ([]UserSummary, error); UserIsRegistered(id uuid.UUID) (bool, error) }`
  - `type UserSummary struct { ID uuid.UUID \`json:"id"\`; Username string \`json:"username"\` }`
  - `FollowService{Store FollowStore; Players *PlayerService}` with `Follow(user *models.User, creatorID uuid.UUID) error`, `Unfollow(user *models.User, creatorID uuid.UUID) error`, and `Feed(user *models.User) (FollowFeed, error)`
  - `type FollowFeed struct { Creators []UserSummary \`json:"creators"\`; Sets []CharacterSetResponse \`json:"sets"\` }`: sets are public sets from followed creators, `created_at DESC`, limit 50, via `PlayerService.attachLikes`
  - `SocialHandler{Follows *services.FollowService; Friends *services.FriendService; Profiles *services.ProfileService; Invites *services.InviteService}`: later tasks fill in the other fields
- Routes (all behind `userMiddleware`):
  - `POST /follows/{creatorId}` → 204
  - `DELETE /follows/{creatorId}` → 204
  - `GET /follows` → `FollowFeed`
- Errors map to HTTP status: `ErrGuestNotAllowed`→403, `ErrSelf`→400, `ErrUserNotFound`→404.

- [ ] **Step 1: Write tests in `follow_service_test.go`** with an in-memory `fakeFollowStore` (pattern: `poll_service_test.go`):
  - `TestFollow_GuestRejected`: guest follower → `ErrGuestNotAllowed`
  - `TestFollow_SelfRejected`: creatorID == user.ID → `ErrSelf`
  - `TestFollow_UnknownOrGuestCreator`: `UserIsRegistered` false → `ErrUserNotFound`
  - `TestFollow_Idempotent`: following twice leaves `FollowerCount == 1`, no error
  - `TestUnfollow_NotFollowing_NoError`
- [ ] **Step 2: Implement the model, `gormFollowStore` (follow uses `clause.OnConflict{DoNothing: true}`), and `FollowService`.** Register `&models.Follow{}` in AutoMigrate.
- [ ] **Step 3: Implement handlers and routes.** Wire the services in `routes.go` the same way `pollService` is wired.
- [ ] **Step 4: Commit:** `git commit -m "Add follows: model, service, routes"`

### Task 2: Friendship model + FriendService

The profile needs friend counts and relationship state, so the friend core is built before the profile.

**Files:**
- Create: `backend/internal/models/friendship.go`, `backend/internal/services/friend_service.go`, `backend/internal/services/friend_service_test.go`
- Modify: `backend/internal/config/database.go:50`

**Interfaces:**
- Produces:
  - `models.Friendship{RequesterID uuid.UUID (pk); AddresseeID uuid.UUID (pk, index); Status string; CreatedAt time.Time; UpdatedAt time.Time}`: Status is `"pending" | "accepted" | "declined"`
  - Relationship constants: `RelNone = "none"`, `RelOutgoing = "outgoing"`, `RelIncoming = "incoming"`, `RelFriends = "friends"`, `RelSelf = "self"`
  - Errors: `ErrRequestCooldown = errors.New("you can send another request later")`, `ErrNoPendingRequest = errors.New("no pending request")`
  - `type FriendStore interface { Get(a, b uuid.UUID) (*models.Friendship, error) /* row in either direction; (nil,nil) if none */; Save(f *models.Friendship) error; Delete(requesterID, addresseeID uuid.UUID) error; ListForUser(userID uuid.UUID) ([]models.Friendship, error); Usernames(ids []uuid.UUID) (map[uuid.UUID]string, error); FindRegisteredByUsername(username string) (*models.User, error); UserIsRegistered(id uuid.UUID) (bool, error); CountFriends(userID uuid.UUID) (int64, error) }`
  - `FriendService{Store FriendStore; Now func() time.Time}`:
    - `Request(user *models.User, targetID uuid.UUID) (rel string, err error)`
    - `RequestByUsername(user *models.User, username string) (string, error)`
    - `Accept(user *models.User, requesterID uuid.UUID) error`
    - `Decline(user *models.User, requesterID uuid.UUID) error`
    - `Cancel(user *models.User, addresseeID uuid.UUID) error`
    - `Remove(user *models.User, friendID uuid.UUID) error`
    - `Relationship(viewerID, targetID uuid.UUID) (string, error)`
    - `FriendIDs(userID uuid.UUID) ([]uuid.UUID, error)`
    - `List(user *models.User) (FriendList, error)`
  - `type FriendList struct { Friends []FriendEntry \`json:"friends"\`; Incoming []UserSummary \`json:"incoming"\`; Outgoing []UserSummary \`json:"outgoing"\` }`
  - `type FriendEntry struct { UserSummary; Status string \`json:"status"\` }`: Status is filled by the handler from `PresenceHub` in Stage 3, and is `"offline"` until then.
- Rules:
  - A request to someone with a pending request toward you accepts it.
  - A request when the existing row is `declined` with `UpdatedAt` under 24h ago → `ErrRequestCooldown`. Otherwise the row is reset to pending with the new requester.
  - A request when already friends or already outgoing returns the current rel with no error.
  - `Remove` and `Cancel` delete the row.

- [ ] **Step 1: Write tests in `friend_service_test.go`** using `fakeFriendStore` and an injectable `Now`:
  - `TestFriend_GuestRejected`: every mutating method with a guest user → `ErrGuestNotAllowed`
  - `TestFriend_RequestThenAccept`: A→B is `outgoing`; B sees `incoming`; after `Accept` both see `friends`
  - `TestFriend_MutualRequestAccepts`: A→B pending, then B→A returns `friends`
  - `TestFriend_DeclineCooldown`: after a decline, re-request at +1h → `ErrRequestCooldown`; at +25h → `outgoing`
  - `TestFriend_SelfRequest` → `ErrSelf`
  - `TestFriend_RequestByUsername_Unknown` → `ErrUserNotFound` (a guest username also counts as unknown)
  - `TestFriend_AcceptWithoutPending` → `ErrNoPendingRequest`
  - `TestFriend_Remove`: friends → `none` for both
- [ ] **Step 2: Implement the model, `gormFriendStore`, and `FriendService`.** `Get` uses `WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)`. `Usernames` is one `IN` query. Register `&models.Friendship{}`.
- [ ] **Step 3: Commit:** `git commit -m "Add friendships: model and service"`

### Task 3: ProfileService + `GET /profiles/{id}`

**Files:**
- Create: `backend/internal/services/profile_service.go`
- Modify: `backend/internal/handlers/social_handler.go`, `backend/internal/routes/routes.go`

**Interfaces:**
- Consumes: `FriendService.Relationship`, `FriendStore.CountFriends`, `FollowStore.FollowerCount`, `FollowStore.IsFollowing`, `PlayerService.attachLikes`
- Produces: `ProfileService{DB *gorm.DB; Friends *FriendService; Follows *FollowService; Players *PlayerService}` with `Get(viewer *models.User, userID uuid.UUID) (*ProfileResponse, error)`, returning `ErrUserNotFound` for missing or guest users.

```go
type ProfileResponse struct {
    ID           uuid.UUID              `json:"id"`
    Username     string                 `json:"username"`
    JoinedAt     time.Time              `json:"joinedAt"`
    FriendCount  int64                  `json:"friendCount"`
    FollowerCount int64                 `json:"followerCount"`
    SetCount     int                    `json:"setCount"`
    GamesPlayed  int64                  `json:"gamesPlayed"`
    WinRate      float64                `json:"winRate"`
    SetPlays     int64                  `json:"setPlays"`   // SUM(play_count) over public sets
    SetLikes     int64                  `json:"setLikes"`   // likes on their public sets
    Sets         []CharacterSetResponse `json:"sets"`       // public, created_at DESC, limit 60
    Relationship string                 `json:"relationship"` // "none" when viewer is nil/guest
    Following    bool                   `json:"following"`
    Status       string                 `json:"status,omitempty"` // only when Relationship=="friends" (Stage 3)
}
```

- Games and win rate use COUNT queries on `game_records` (wins = `result IN ('win','forfeit_win')`), not by loading all rows.
- Route: `r.With(optionalUserMiddleware).Get("/profiles/{id}", ...)`.

- [ ] **Step 1: Implement `ProfileService.Get` and the handler** (404 on `ErrUserNotFound`).
- [ ] **Step 2: Commit:** `git commit -m "Add public profile endpoint"`

### Task 4: Profile page, creator links, slug helpers

**Files:**
- Modify: `frontend/src/lib/slug.js`, `frontend/src/app/gallery/[slug]/page.js:98`, `frontend/src/app/profile/page.js` (add a "View public profile" link near the header)
- Create: `frontend/src/app/u/[slug]/page.js`, `frontend/src/app/u/[slug]/ProfileClient.js`, `frontend/src/components/RelationshipButtons.js`

**Interfaces:**
- Produces:
  - `userProfilePath(id, username) → "/u/{slugify(username)}-{id}"`
  - `parseIdFromSlug(slugParam)`: generic UUID extractor. Keep `parseSetIdFromSlug` as an alias so existing imports still work.
  - `<RelationshipButtons userId relationship following status onChange />` renders:
    - `none` → Add friend
    - `outgoing` → "Request sent" (Cancel)
    - `incoming` → Accept / Decline
    - `friends` → Invite if `status==="online"`, otherwise a "Friends" menu with Remove
    - Follow / Following toggle, shown for every relationship except `self`
    - `self` → a single "Edit profile" link to `/profile`
    - For guest or signed-out viewers, the buttons route to `/signup`
  - Calls:
    - `POST /friends/requests` `{userId}`
    - `POST /friends/requests/{id}/accept`
    - `POST /friends/requests/{id}/decline`
    - `DELETE /friends/requests/{id}`
    - `DELETE /friends/{id}`
    - `POST`/`DELETE /follows/{id}`
    - Invite: `router.push("/create?invite=" + userId)`
- `page.js` mirrors `gallery/[slug]/page.js`: server-fetch `/profiles/{id}` with `SERVER_API_URL`, `notFound()` on 404, and 301 to the canonical slug on mismatch. It also sets the metadata title `"{username} · Custom Guess"`.
- Layout follows the approved mockup (`.superpowers/brainstorm/*/content/public-profile.html`):
  - Header card: initials avatar, name, "Joined Month YYYY", and counts. The status line is shown only when `status` is present.
  - Four stat cells: Games, Win rate, Set plays, Set likes.
  - "Sets by {username}" grid, reusing the existing set card and `SetCover`, with each card linking to `setGalleryPath`.
- Gallery set page: "Created by X" becomes `<Link href={userProfilePath(set.userId, set.creator)}>`.

- [ ] **Step 1: Add the slug helpers.**
- [ ] **Step 2: Build `RelationshipButtons`, the profile page, and the creator link.** (Friend endpoints come in Task 6; until then those buttons get 404s, which is expected.)
- [ ] **Step 3: Commit:** `git commit -m "Add public profile page and creator links"`

### Task 5: Checkpoint 1 (user runs)

- [ ] Ask the user to run `cd backend && go test ./internal/services/...` (expect PASS for follow/friend tests) and `cd frontend && npm run lint`, then `docker-compose up` and check:
  - `/u/<name>-<id>` renders header, stats, and sets. A wrong prefix redirects. A guest id gives 404.
  - "Created by" on a gallery set opens the profile.
  - Follow / Unfollow toggles and the follower count changes on reload.
- Wait for the user's go-ahead before Stage 2.

---

## Stage 2 — Friends

### Task 6: Friend routes, GameRecord opponent ID

**Files:**
- Modify: `backend/internal/handlers/social_handler.go`, `backend/internal/routes/routes.go`, `backend/internal/models/gameRecord.go`, `backend/internal/services/lobby_service.go:1217`

**Interfaces:**
- Routes (behind `userMiddleware`; POSTs also use `middleware.StrictRateLimitMiddleware`):
  - `GET /friends` → `FriendList`
  - `GET /friends/relationship/{id}` → `{"relationship": string}`
  - `POST /friends/requests` body `{"userId"?: string, "username"?: string}` → `{"relationship": string}`. `ErrRequestCooldown` → 429.
  - `POST /friends/requests/{id}/accept`, `POST /friends/requests/{id}/decline`, `DELETE /friends/requests/{id}` → 204. `ErrNoPendingRequest` → 404.
  - `DELETE /friends/{id}` → 204
- `models.GameRecord.OpponentUserID *uuid.UUID \`gorm:"type:uuid" json:"opponentUserId"\``. Set it in `writeGameRecords` when `opponent.UserID != uuid.Nil`.

- [ ] **Step 1: Implement the handlers, routes, and `OpponentUserID`.**
- [ ] **Step 2: Commit:** `git commit -m "Add friend routes and opponent user id on game records"`

### Task 7: Friends page, navbar dropdown, end-game Add friend

**Files:**
- Create: `frontend/src/app/friends/page.js`, `frontend/src/components/FriendsDropdown.js`
- Modify: `frontend/src/components/navbar.js` (desktop: icon before the avatar menu; mobile: a row in the existing menu and/or `BottomTabBar`, builder's choice), `frontend/src/app/lobby/[lobbyId]/page.js` (end-game action row near the Share button, line ~1188)

**Interfaces:**
- Consumes: `GET /friends`, the Task 6 routes, `RelationshipButtons`
- For Stage 2, both surfaces fetch `GET /friends` on open/mount. Stage 3 replaces this with `PresenceContext`.
- **FriendsDropdown** (only when `user && !user.isGuest`):
  - Icon button with an `aria-label="Friends"` and a badge showing `incoming.length` when it's above 0.
  - Panel sections in this order: Requests (Accept/Decline) → Online → Offline (muted), then a "See all" link to `/friends`.
  - Matches mockup A in `.superpowers/brainstorm/*/content/friends-placement.html`.
- **`/friends`**:
  - Tabs: Friends / Requests (incoming + outgoing with Cancel) / Following (`GET /follows`: creator chips, then the set grid).
  - An add-by-username input that posts `{username}` and shows a 404 as "No player with that username" and a 429 as "Try again later".
  - Guests see a sign-up prompt.
- **End-game "Add friend"**: shown when the game is over, the user is not a guest, and the opponent player has a `userId`.
  - Fetches `GET /friends/relationship/{opponentUserId}` and renders `RelationshipButtons` without Follow, in compact form.
  - Hidden when the relationship is `friends`.

- [ ] **Step 1: Build `/friends`.**
- [ ] **Step 2: Build `FriendsDropdown` and mount it in the navbar.**
- [ ] **Step 3: Add the end-game Add friend control.**
- [ ] **Step 4: Commit:** `git commit -m "Add friends page, navbar dropdown, and end-game add friend"`

### Task 8: Checkpoint 2 (user runs)

- [ ] Ask the user to run `npm run lint`, then check with two signed-up accounts in two browsers:
  - Request by username → accept → both lists show the friend.
  - Decline → re-request is refused (429 message).
  - Mutual request → friends.
  - End-game Add friend works, and is hidden for a guest opponent.
  - Remove friend works.
- Wait for the go-ahead before Stage 3.

---

## Stage 3 — Live layer

### Task 9: PresenceHub + `/presence/ws`

**Files:**
- Create: `backend/internal/services/presence_hub.go`, `backend/internal/services/presence_hub_test.go`, `backend/internal/handlers/presence_ws_handler.go`
- Modify: `backend/internal/routes/routes.go`, `backend/internal/services/lobby_service.go` (presence hooks), `backend/internal/handlers/social_handler.go` (fill `FriendEntry.Status`, `ProfileResponse.Status`)

**Interfaces:**
- Produces:
  - `type PresenceEvent struct { Type string \`json:"type"\`; Data any \`json:"data"\` }`
  - `type FriendLister interface { FriendIDs(userID uuid.UUID) ([]uuid.UUID, error) }`: satisfied by `*FriendService`
  - `NewPresenceHub(friends FriendLister) *PresenceHub`
  - `(*PresenceHub).Register(userID uuid.UUID, send chan PresenceEvent) (unregister func())`
  - `(*PresenceHub).Status(userID uuid.UUID) string`: returns `"offline" | "online" | "in_game"`
  - `(*PresenceHub).SendToUser(userID uuid.UUID, ev PresenceEvent)`: non-blocking; drops if the channel is full
  - `(*PresenceHub).SetInGame(userIDs []uuid.UUID, inGame bool)`
- Event types, server→client:
  - `"presence"` `{userId, status}`: sent to each friend when a user's status changes. That covers the first connection (online), the last disconnection (offline), and `SetInGame` changes.
  - `"friends_changed"` `{}`: sent to both parties on any friend request/accept/decline/cancel/remove. The client refetches `GET /friends`. `FriendService` gets an optional `Notify func(userIDs ...uuid.UUID)` set in `routes.go`.
  - `"invite_received"` and `"invite_resolved"`: added in Task 9.
- `/presence/ws`:
  - Rejects a missing or invalid `session_id` cookie or a guest with 401 before upgrading. Looks the session up with `SessionService.GetSessionUser`.
  - Uses a dedicated `websocket.Upgrader` whose `CheckOrigin` accepts only origins listed in `ALLOWED_ORIGINS` (same parsing and default as `corsMiddleware.go`; extract a shared `middleware.AllowedOrigins() []string`).
  - Ping every 30s; a read deadline of 60s.
- LobbyService:
  - Add field `Presence *PresenceHub` (nil-safe).
  - Call `SetInGame(<both players' non-nil UserIDs>, true)` where `game_started_at` is set (line ~494).
  - Call `SetInGame(..., false)` where an in-progress game ends (lines ~540, ~870, ~1141).

- [ ] **Step 1: Write tests in `presence_hub_test.go`** with a fake `FriendLister`:
  - `TestPresenceHub_StaysOnlineUntilLastConnection`: two registers, then one unregister → `Status=="online"`; second unregister → `"offline"`
  - `TestPresenceHub_NotifiesFriendsOnOnlineOffline`: friend B is connected, A connects → B gets `presence{A, online}`; A disconnects → `presence{A, offline}`
  - `TestPresenceHub_SecondTabDoesNotRenotify`: A's second connection sends no new event to B
  - `TestPresenceHub_InGame`: `SetInGame([A], true)` → `Status(A)=="in_game"` and B is notified; offline users stay `"offline"`
  - `TestPresenceHub_SendToUserFullChannelDoesNotBlock`
- [ ] **Step 2: Implement `PresenceHub`, the WS handler, routes, LobbyService hooks, and status fill-in.**
- [ ] **Step 3: Commit:** `git commit -m "Add site-wide presence hub and socket"`

### Task 10: InviteService + routes

**Files:**
- Create: `backend/internal/services/invite_service.go`, `backend/internal/services/invite_service_test.go`
- Modify: `backend/internal/handlers/social_handler.go`, `backend/internal/routes/routes.go`

**Interfaces:**
- Consumes: `PresenceHub.Status`, `PresenceHub.SendToUser`, `FriendService.Relationship`
- Produces:
  - `type InviteLobbies interface {` with:
    - `InviteLobbyInfo(lobbyID uuid.UUID) (InviteLobby, error)`
    - `CurrentLobby(user *models.User) (lobbyID uuid.UUID, started bool, found bool, err error)`
    - `LeaveWaitingLobby(user *models.User, lobbyID uuid.UUID) error`
    - `Join(user *models.User, code string) error`
    - `}`
  - The adapter `lobbyInvites{*LobbyService}` implements it with `GetPlayerByUser`, `ForfeitLobby`, and `JoinLobby`. `LeaveWaitingLobby` must refuse if the lobby has started.
  - `type InviteLobby struct { ID uuid.UUID; Code string; CreatorUserID uuid.UUID; PlayerCount int; Private bool; Started bool; GameOver bool; SetName string }`
  - `NewInviteService(lobbies InviteLobbies, presence *PresenceHub, friends *FriendService, ttl time.Duration) *InviteService` (ttl = 60s in production)
  - `Send(from *models.User, toUserID, lobbyID uuid.UUID) (*Invite, error)`
  - `Accept(user *models.User, inviteID string, leaveCurrent bool) (lobbyID uuid.UUID, err error)`
  - `Decline(user *models.User, inviteID string) error`
  - `type Invite struct { ID string \`json:"id"\`; From UserSummary \`json:"from"\`; ToUserID uuid.UUID \`json:"toUserId"\`; LobbyID uuid.UUID \`json:"lobbyId"\`; SetName string \`json:"setName"\`; ExpiresAt time.Time \`json:"expiresAt"\` }`
  - Errors:
    - `ErrNotFriends` → 403
    - `ErrFriendUnavailable` (offline or in_game) → 409
    - `ErrInviteLobbyInvalid` (not creator, not private, started, full, or over) → 400
    - `ErrInviteGone` (expired, unknown, or lobby no longer joinable at accept) → 410
    - `ErrInGame` → 409 `{"code":"IN_GAME"}`
    - `*NeedsLeaveError{LobbyID}` → 409 `{"code":"IN_WAITING_LOBBY","lobbyId":...}`
- Behavior:
  - `Send` replaces any pending invite from the same sender to the same recipient.
  - On send: push `invite_received` (the `Invite`) to the recipient. On accept, decline, or expiry: push `invite_resolved {inviteId, outcome: "accepted"|"declined"|"expired"}` to the sender, and to the recipient for expiry so the popup closes.
  - `Accept` order:
    1. Look up the invite (else `ErrInviteGone`).
    2. Re-check `InviteLobbyInfo` is still joinable (else `ErrInviteGone`, before touching the current lobby).
    3. Check `CurrentLobby`: if started → `ErrInGame`; if waiting and `!leaveCurrent` → `NeedsLeaveError`; if waiting and `leaveCurrent` → `LeaveWaitingLobby`.
    4. `Join`, then delete the invite.
- Routes (behind `userMiddleware` + strict rate limit):
  - `POST /invites` `{toUserId, lobbyId}` → `Invite`
  - `POST /invites/{id}/accept` `{leaveCurrent: bool}` → `{lobbyId}`
  - `POST /invites/{id}/decline` → 204
- Enforce private invite lobbies server-side: `Send` requires `Private == true`.

- [ ] **Step 1: Write tests in `invite_service_test.go`** with a `fakeInviteLobbies`, a real `PresenceHub` over a fake `FriendLister`, and a short ttl:
  - `TestInvite_NotFriends_Rejected`
  - `TestInvite_RecipientOffline_Rejected`, `TestInvite_RecipientInGame_Rejected`
  - `TestInvite_LobbyNotPrivateOrNotCreator_Rejected`
  - `TestInvite_SendPushesToRecipient`: recipient channel gets `invite_received`
  - `TestInvite_AcceptJoins`: Join is called with the lobby code; sender gets `invite_resolved{accepted}`
  - `TestInvite_AcceptWhileWaiting_NeedsLeave`, then with `leaveCurrent=true` → `LeaveWaitingLobby` called, then Join
  - `TestInvite_AcceptWhileInStartedGame_Refused`: `ErrInGame`; neither Leave nor Join called
  - `TestInvite_AcceptAfterLobbyFull_DoesNotLeaveCurrent`: `PlayerCount==2` → `ErrInviteGone`; `LeaveWaitingLobby` not called even with `leaveCurrent=true`
  - `TestInvite_Expires`: after ttl, `Accept` → `ErrInviteGone`; both parties get `invite_resolved{expired}`
  - `TestInvite_ResendReplacesPrevious`
- [ ] **Step 2: Implement `InviteService`, the adapter, handlers, and routes.**
- [ ] **Step 3: Commit:** `git commit -m "Add game invites"`

### Task 11: PresenceProvider, InvitePopup, live dropdown and Friends page

**Files:**
- Create: `frontend/src/context/PresenceContext.js`, `frontend/src/components/InvitePopup.js`
- Modify: the app layout where `UserProvider` is mounted (place `PresenceProvider` inside it), `components/FriendsDropdown.js`, `app/friends/page.js`, `app/u/[slug]/ProfileClient.js`

**Interfaces:**
- Produces: `usePresence()` → `{ friends: FriendList | null, refreshFriends(), statusOf(userId) }`
- The provider connects `${WS_URL}/presence/ws` only when `user && !user.isGuest`. It reconnects with backoff (1s doubling, capped at 30s) and refetches `GET /friends` on (re)connect and on `friends_changed`. `presence` events patch statuses in place.
- On `invite_received`, it shows `InvitePopup`. It follows the designSchema Modal motion, but is non-blocking: a card pinned to the bottom of the viewport with no backdrop. It reads "{from.username} invited you to play {setName}" with Accept / Decline and a countdown to `expiresAt`.
  - Accept posts `{leaveCurrent:false}`. On 409 `IN_WAITING_LOBBY`, the popup switches to "Leave your current lobby?" (Leave & join / Cancel) and reposts with `true`.
  - On success, it navigates to `/lobby/{lobbyId}`.
  - A 410 shows "This invite is no longer available". A 409 `IN_GAME` closes silently.
  - `invite_resolved{expired}` closes the popup.
- If the user is on a `/lobby/[id]` page with a started game, it doesn't show the popup (the server already prevents this; this is a second guard).
- Dropdown and Friends page switch from their own fetch to `usePresence()`.

- [ ] **Step 1: Build the provider and popup, and mount them.**
- [ ] **Step 2: Switch the dropdown, Friends page, and profile status to `usePresence()`.**
- [ ] **Step 3: Commit:** `git commit -m "Add live presence and invite popup"`

### Task 12: Sending invites (waiting lobby panel + `/create?invite=`)

**Files:**
- Create: `frontend/src/components/LobbyInvitePanel.js`
- Modify: `frontend/src/app/lobby/[lobbyId]/page.js` (waiting-for-second-player view, line ~1363), `frontend/src/app/create/page.js`, `frontend/src/app/create/LobbyForm.js:893,1087-1107`

**Interfaces:**
- Consumes: `usePresence()`, `POST /invites`, `invite_resolved` (expose `lastInviteResult` or an `onInviteResolved` subscription from `PresenceContext`)
- **LobbyInvitePanel** `({ lobbyId })`:
  - Shown in the waiting view when the viewer is the creator and not a guest.
  - Lists online friends (status `"online"`) with Invite buttons. After sending, a row shows "Invited · {seconds}s", then "Declined" or "Expired". In-game friends are shown with "In a game" and no button.
  - Empty state: "No friends online", with a link to `/friends`.
- **`/create?invite={userId}`**:
  - `LobbyForm` forces `isPrivate=true` and disables the toggle, with the label "Private (invite)".
  - After a successful create it pushes `/lobby/{id}?invite={userId}`. The existing 409 conflict flow ("Forfeit & Start New") already covers the inviter-in-a-lobby case.
- The lobby page reads `?invite=` once the user is in the waiting view, posts `POST /invites` a single time (ref guard), then removes the param with `router.replace`.

- [ ] **Step 1: Build `LobbyInvitePanel` and mount it.**
- [ ] **Step 2: Implement the `?invite=` flow in create and lobby.**
- [ ] **Step 3: Commit:** `git commit -m "Send invites from waiting lobby and friends list"`

### Task 13: Checkpoint 3 (user runs)

- [ ] Ask the user to run `cd backend && go test ./internal/services/...` and `cd frontend && npm run lint`. Then, with two signed-up accounts in two browsers:
  - Online/offline dots update live, and closing one of two tabs keeps the user online.
  - Invite from the dropdown → pick a set → lobby is private → popup appears → Accept → both are in the lobby.
  - Decline is shown to the sender. Leaving the popup for 60s expires it on both sides.
  - The recipient waiting in their own lobby gets the "Leave your current lobby?" step.
  - A friend in a started game shows "In a game" and has no Invite button.
  - Invite from the waiting-lobby panel works.
- [ ] After approval, follow superpowers:finishing-a-development-branch.
