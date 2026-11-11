# Admin Moderation & Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can review reported sets (see every image, make private in one click) and fully delete an account, including its R2 images. Images are cleaned up from R2 whenever they stop being used.

**Architecture:** Two new service files in `backend/internal/services/`. `image_cleanup.go` is an R2 "delete if nothing references it" helper behind a small interface. `account_deletion.go` holds account preview and delete. A shared `deleteSetTx` gives every set-delete path the child-row cleanup that prod's missing cascades never did. Admin handlers become thin wrappers over these. `admin.html` gets a username/email search, a delete-with-preview dialog, and expandable report cards.

**Tech Stack:** Go 1.24, GORM (Postgres), chi, aws-sdk-go-v2 S3 client (R2), vanilla JS in `backend/internal/handlers/admin.html`.

**Spec:** `docs/superpowers/specs/2026-11-11-admin-moderation-and-deletion-design.md`

## Global Constraints

- **Do not run builds or tests** (`go build`, `go test`, `npm run build`). Per CLAUDE.md the owner runs them. Write the tests; leave running them to the owner. Each task lists the command the owner will use.
- **Commits:** never add a `Co-Authored-By` trailer (repo rule). Work on branch `feature/admin-moderation`.
- **Prod has no ON DELETE CASCADE** except `players → lobbies`. Every delete must remove child rows explicitly. Tests must open GORM with `DisableForeignKeyConstraintWhenMigrating: true`, as `config/database.go` does, so they behave like prod.
- R2 prefix: `config.R2PublicURL + "/"` (`https://pub-19a8df9d958c4ee79bbeed604cf74512.r2.dev/`). Object key = URL with that prefix removed. Bucket `config.R2Bucket`.
- R2 failures are logged and never returned to the HTTP caller. They never block a DB delete.
- `stored_messages.sender_id` is a **player ID** string, `stored_messages.lobby_id` is a string. Compare with `uuid.String()` values.
- Other users' history: `game_records.opponent_user_id = NULL, opponent_name = 'Deleted user'`.
- Before editing `admin.html`, read `/home/tjraff5/projects/GuessWho/designSchema.txt` in full (CLAUDE.md rule) and reuse the CSS tokens and classes already in `admin.html`.

## Review Focus

1. **A deleted user hosted a lobby another user is in.** The lobby and everyone's rows in it go, and the other user's account, sets and records are untouched. Pinned in Task 4 (`TestDeleteAccount_LeavesOtherUsersIntact`).
2. **The same URL is used as both a set's cover and one of its characters.** It's deleted from R2 once, with no error. Pinned in Task 1 (`TestCleanup_DedupesURLs`).
3. **An edit keeps zero of the old characters** (`keepCharacterIDs` empty). Every old character image is cleaned up. Pinned in Task 2 (`TestUpdateSetImages_AllReplaced`).
4. **Unknown or malformed IDs on admin endpoints.** Preview, delete and make-private on a missing ID return 404, not 204 or 500. Pinned in Task 4 (`TestDeleteAccount_UnknownUser`) and Task 3 (`TestMakePrivate_UnknownSet`).
5. **A guest account (`is_guest = true`) is deleted.** It works the same as a registered one. Pinned in Task 4 (`TestDeleteAccount_Guest`).

---

### Task 1: Test DB helper + R2 image cleanup

**Files:**
- Create: `backend/internal/services/testdb_test.go`
- Create: `backend/internal/services/image_cleanup.go`
- Create: `backend/internal/services/image_cleanup_test.go`
- Create: `backend/internal/config/r2_store.go`

**Interfaces:**
- Produces:
  - `openTestDB(t *testing.T) *gorm.DB` (test-only). Skips unless `TEST_DATABASE_URL` is set. Creates schema `test_<random hex>`, opens GORM with `search_path` set to that schema and `DisableForeignKeyConstraintWhenMigrating: true`, AutoMigrates the same model list as `config/database.go:50`, and drops the schema (CASCADE) in `t.Cleanup`.
  - `type ObjectDeleter interface { DeleteObject(ctx context.Context, key string) error }`
  - `type ImageCleaner struct { DB *gorm.DB; Store ObjectDeleter; Async bool }`
  - `func (c *ImageCleaner) Cleanup(urls []string)`. A nil receiver or nil Store is a no-op. It filters to R2-prefixed URLs and dedupes. It drops any URL still found in `character_sets.cover_image`, or in `characters.image` where the character's `set_id` exists in `character_sets`. It deletes the rest and logs each failure. When `Async`, it does all of this in a goroutine.
  - `config.R2Store struct{}` implementing `ObjectDeleter` via `R2Client.DeleteObject` on `R2Bucket`.

- [ ] **Step 1: Write the tests** in `image_cleanup_test.go`. Use a `fakeStore` that records keys and can be told to fail. Use `Async: false`.
  - `TestCleanup_DeletesUnreferenced`: an R2 URL that no row uses → `fakeStore.keys == ["abc.png"]`.
  - `TestCleanup_SkipsReferencedByLiveSet`: the URL is a character image in an existing set → no keys deleted.
  - `TestCleanup_IgnoresOrphanCharacters`: the URL is only on a `characters` row whose `set_id` has no set → deleted.
  - `TestCleanup_SkipsReferencedCover`: the URL is some set's `cover_image` → not deleted.
  - `TestCleanup_SkipsNonR2URLs`: `https://example.com/x.png` and `""` → no calls.
  - `TestCleanup_DedupesURLs`: the same URL twice → exactly one delete.
  - `TestCleanup_StoreErrorDoesNotPanic`: the store returns an error → `Cleanup` returns normally and the other keys are still attempted.
  - `TestCleanup_NilSafe`: `(*ImageCleaner)(nil).Cleanup(...)` and `&ImageCleaner{}` don't panic.
- [ ] **Step 2: Implement `testdb_test.go`, `image_cleanup.go`, `r2_store.go`** to the interfaces above. Do the reference check in one query per batch (`WHERE cover_image IN ?` and `characters JOIN character_sets ... WHERE image IN ?`).
- [ ] **Step 3: Commit**: `git commit -m "Add R2 image cleanup helper that skips images still in use"`

Owner runs: `TEST_DATABASE_URL='postgres://postgres:example@localhost:5432/mydb?sslmode=disable' go test ./internal/services -run Cleanup`

### Task 2: Set deletion with child rows + image cleanup on delete and edit

**Files:**
- Modify: `backend/internal/services/player_service.go` (`PlayerService` struct, `NewPlayerService`, `DeleteSet` ~:406, `UpdateSet` ~:326)
- Create: `backend/internal/services/set_delete.go`
- Create: `backend/internal/services/set_delete_test.go`

**Interfaces:**
- Consumes: `ImageCleaner`, `openTestDB` (Task 1).
- Produces:
  - `func deleteSetTx(tx *gorm.DB, setIDs []uuid.UUID) (imageURLs []string, err error)`: collects the cover and character image URLs, then deletes `characters`, `set_categories`, `set_likes`, `set_reports` and `character_sets` for those IDs. An empty slice is a no-op.
  - `PlayerService` gains the field `Images *ImageCleaner`. `NewPlayerService(db *gorm.DB, cache SetCache, images *ImageCleaner) *PlayerService`.
  - `PlayerService.DeleteSet(user, setID)`: same signature and errors as today. Now uses `deleteSetTx` in a transaction (ownership checked first), then `Images.Cleanup(urls)` after commit, then `Cache.InvalidateSet`.
  - `func (s *PlayerService) AdminDeleteSet(setID uuid.UUID) error`: like `DeleteSet` with no owner check. Returns `ErrSetNotFound` (new exported var) if the set doesn't exist.
  - `UpdateSet`: before saving, record the old `CoverImage` if `coverImage != ""` and it differs. Record the `Image` of every character that will be deleted (the `NOT IN keep` set, or all of them when keep is empty). After everything succeeds, `Images.Cleanup(those)`.

- [ ] **Step 1: Write the tests** (DB-backed, fake store):
  - `TestDeleteSetTx_RemovesChildren`: seed a set with 6 characters, 2 categories, 1 like, 1 report → after the call, all five tables have 0 rows for that set, and the returned URLs contain the cover plus 6 images.
  - `TestDeleteSet_CleansImages`: `DeleteSet` → `fakeStore.keys` has the cover and character keys.
  - `TestDeleteSet_NotOwner`: another user's ID → error, nothing deleted, no store calls.
  - `TestAdminDeleteSet_Unknown`: random ID → `errors.Is(err, ErrSetNotFound)`.
  - `TestUpdateSetImages_ReplacedCoverAndRemovedChar`: replace the cover and drop 1 of 7 characters → exactly those 2 keys are deleted. Kept characters' keys are not.
  - `TestUpdateSetImages_AllReplaced`: `keepCharacterIDs` empty with 6 new characters → all 6 old keys deleted.
- [ ] **Step 2: Implement** as above. Update the `NewPlayerService` call in `routes.go:40` to pass `&services.ImageCleaner{DB: config.DB, Store: config.R2Store{}, Async: true}`, and fix existing test constructors (struct literals in `player_service_test.go` keep compiling as is).
- [ ] **Step 3: Commit**: `git commit -m "Delete set child rows explicitly and clean up R2 images on set delete and edit"`

Owner runs: `go test ./internal/services -run 'DeleteSet|UpdateSetImages'` (with `TEST_DATABASE_URL`)

### Task 3: Make-private + admin set detail

**Files:**
- Modify: `backend/internal/services/player_service.go`
- Modify: `backend/internal/services/set_delete_test.go` (add tests)

**Interfaces:**
- Consumes: `ErrSetNotFound` (Task 2).
- Produces:
  - `func (s *PlayerService) AdminMakePrivate(setID uuid.UUID) error`: in one transaction, sets `public = false` and `report_count = 0` and deletes that set's `set_reports`. Then `Cache.InvalidateSet`. Returns `ErrSetNotFound` if missing.
  - `func (s *PlayerService) AdminGetSet(setID uuid.UUID) (*models.CharacterSet, error)`: preloads `Characters`, and works for private or hidden sets. Returns `ErrSetNotFound` if missing.

- [ ] **Step 1: Write the tests**:
  - `TestMakePrivate_PrivatesAndClearsReports`: a public set with `report_count = 5` and 5 reports → `public == false`, `report_count == 0`, 0 reports, characters untouched.
  - `TestMakePrivate_NoReports`: works on a set with 0 reports.
  - `TestMakePrivate_UnknownSet`: → `ErrSetNotFound`.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit**: `git commit -m "Add admin make-private and set detail service methods"`

### Task 4: Account deletion service

**Files:**
- Create: `backend/internal/services/account_deletion.go`
- Create: `backend/internal/services/account_deletion_test.go`

**Interfaces:**
- Consumes: `deleteSetTx`, `ImageCleaner` (Tasks 1–2).
- Produces:
  - `var ErrUserNotFound = errors.New("user not found")`
  - `type DeletionPreview struct { Username, Email string; Sets, Characters, Images, GameRecords, Friendships, Follows, Likes, Reports, PollVotes, Feedback, Messages, Sessions, HostedLobbies int64 }` with snake_case JSON tags. `Images` counts distinct R2-prefixed URLs across their sets.
  - `type AccountDeletionService struct { DB *gorm.DB; Images *ImageCleaner }`
  - `func (s *AccountDeletionService) Preview(userID uuid.UUID) (*DeletionPreview, error)`
  - `func (s *AccountDeletionService) Delete(userID uuid.UUID) error`: one transaction, in this order:
    1. Load the user (`ErrUserNotFound` if missing).
    2. Collect the user's player IDs and hosted lobby IDs.
    3. `deleteSetTx` on the user's sets.
    4. For hosted lobbies, delete `lobby_characters`, `game_states`, `stored_messages` (`lobby_id IN` strings), `players`, `lobbies`.
    5. Delete `stored_messages` where `sender_id IN` the player-ID strings OR `username = user.Username`.
    6. Delete `game_states` (by player ID), `players`, `sessions`, `game_records`, `set_likes`, `set_reports`, `poll_votes`, `game_feedbacks` by user ID.
    7. Delete `friendships` and `follows` where the user is on either side.
    8. Anonymize `game_records` where `opponent_user_id = user`.
    9. Delete the user.

    After commit, `Images.Cleanup(urls)`.

- [ ] **Step 1: Write the tests** (DB-backed). The shared seed helper `seedFullUser(t, db) uuid.UUID` puts at least one row in every table above, including a hosted lobby with a second user as a player and a chat message from that user's player.
  - `TestDeleteAccount_RemovesEverything`: after `Delete`, a count over every table listed in step 6 for that user is 0, and so is the user row. `fakeStore` got the set's image keys.
  - `TestDeleteAccount_LeavesOtherUsersIntact`: the second user's account, their own set and characters, and their game record survive. That record's `opponent_name == "Deleted user"` and `opponent_user_id IS NULL`.
  - `TestDeleteAccount_MessagesByPlayerID`: a message with `sender_id` = the user's player ID in a lobby the user did *not* host is deleted.
  - `TestDeleteAccount_Guest`: a guest user with sessions and a player → deleted.
  - `TestDeleteAccount_UnknownUser`: `Delete` and `Preview` → `ErrUserNotFound`.
  - `TestPreview_Counts`: on `seedFullUser`, each field equals the number seeded.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit**: `git commit -m "Add account deletion service covering every user-linked table and their images"`

### Task 5: Require uploaded images (remove text-URL fallback)

**Files:**
- Modify: `backend/internal/handlers/player_handler.go` (~:107–116 create, ~:317–324 update)
- Create: `backend/internal/handlers/character_image_test.go`

**Interfaces:**
- Produces: `func requireCharacterImage(r *http.Request, key string) (multipart.File, *multipart.FileHeader, error)`. It wraps `r.FormFile(key)` and returns `errMissingImage` (unexported var, message `"each character needs an uploaded image"`) when there's no file. Both loops call it and respond `400` with that message. The `imageURL = r.FormValue(...)` lines and the "maybe Base64" comment are removed.

- [ ] **Step 1: Write the tests**: build multipart requests with `httptest` + `multipart.Writer`.
  - `TestRequireCharacterImage_File`: a file part → nil error.
  - `TestRequireCharacterImage_TextValueRejected`: a text field `characters[0][image]=https://pub-.../x.png` → `errMissingImage`.
  - `TestRequireCharacterImage_Missing`: no field → `errMissingImage`.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit**: `git commit -m "Require an uploaded file for every new character image"`

Owner runs: `go test ./internal/handlers -run RequireCharacterImage`

### Task 6: Admin endpoints

**Files:**
- Modify: `backend/internal/handlers/admin_handler.go`
- Modify: `backend/internal/routes/routes.go:195-207`

**Interfaces:**
- Consumes: `PlayerService.AdminDeleteSet / AdminMakePrivate / AdminGetSet`, `AccountDeletionService.Preview / Delete`, `ErrSetNotFound`, `ErrUserNotFound`.
- Produces:
  - `AdminHandler` gains the fields `Players *services.PlayerService` and `Accounts *services.AccountDeletionService`. Wire them in `routes.go`, reusing the Task 2 `playerService` and one shared `ImageCleaner`.
  - `GET /admin/users?q=<text>`: when `q` is 2 or more characters, add `WHERE users.username ILIKE ? OR users.email ILIKE ?` with `%q%` to both the query and the count (escape `%`/`_`; `services.escapeLike` exists in friend_service, so export it or copy it).
  - `GET /admin/users/{id}/deletion-preview` → `DeletionPreview` JSON. 400 on a bad UUID, 404 on `ErrUserNotFound`.
  - `DELETE /admin/users/{id}` → `Accounts.Delete`. 204 on success, 404 on not found, 500 otherwise.
  - `GET /admin/sets/{id}` → `{id, name, public, report_count, cover_image, characters:[{name,image}]}`. 404 if missing.
  - `POST /admin/sets/{id}/make-private` → 204 or 404.
  - `DELETE /admin/sets/{id}` → `Players.AdminDeleteSet`. 204 or 404.
  - `GET /admin/reports`: add `public bool` and `hidden bool` (`report_count >= 5`) to each entry.

- [ ] **Step 1: Implement.** Handlers only map errors to status codes, so the service tests cover the logic.
- [ ] **Step 2: Commit**: `git commit -m "Wire admin endpoints for set review, make-private, and full account deletion"`

### Task 7: Admin page UI

**Files:**
- Modify: `backend/internal/handlers/admin.html` (Users section ~:452, Content section ~:515, JS `loadUsers` ~:646, `deleteUser` ~:678, `loadReports` ~:745, `deleteSet` ~:783)

**Interfaces:**
- Consumes: the Task 6 endpoints via the existing `apiFetch`.

- [ ] **Step 1: Read `designSchema.txt` in full**, then the existing styles in `admin.html`.
- [ ] **Step 2: Users tab.**
  - Add a search input above the table. It's debounced at 300ms, passes `q` to `/admin/users`, and is placeholdered "Search username or email".
  - Replace `deleteUser` with a modal (reuse the existing modal and `closeModal`). It fetches `deletion-preview`, lists each non-zero count, and shows a text input; the red **Delete account permanently** button stays disabled until the input exactly equals the username.
  - On success: toast, close, reload the list.
- [ ] **Step 3: Content tab, layout B.**
  - Each reported set is a collapsed card: name, `by <creator>`, report-count badge, and a "hidden" pill when `hidden`.
  - Clicking the header expands it, fetches `/admin/sets/{id}` once (cached per card), and shows the reason pills with counts, the cover image, and a grid of every character (`<img loading="lazy">` + name). Images are fetched only on expand.
  - Buttons: **Make private** (primary, no confirm) → POST, toast "Made private", remove the card. **Dismiss reports** (existing `clearReports`). **Delete set** (existing confirm) → toast mentions images are removed too.
- [ ] **Step 4: Commit**: `git commit -m "Admin page: user search, delete-with-preview, expandable report cards with make-private"`

Owner checks manually: `docker-compose up`, open `http://localhost:8080/admin-ui`, report a test set, expand it, make it private, then delete a test user through the preview dialog.
