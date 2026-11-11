# Admin moderation & account deletion: design

Date: 2026-11-11

## Why

On 2026-11-11 a user emailed asking for their account and all personal data to be
permanently deleted. The admin `DELETE /admin/users/{id}` endpoint turned out to miss
most user-linked tables and never removes uploaded images, so the deletion was done
by hand with SQL on prod. The owner wants deletion requests like this to be a
one-button job, and also wants a better way to review reported sets.

Separately, nothing in the codebase ever deletes from R2. Images stay publicly
reachable at their URL after a set is deleted, after a character image is
replaced, or after an account is deleted. Uploaded images may be photos of real
people, so this matters for privacy requests, and storage grows forever.

## Goals

1. **Reported-set review** in the admin page's Content tab: see the whole set and
   make it private with one click.
2. **Complete account deletion** from the admin Users tab, including R2 images.
3. **R2 image cleanup going forward**, wherever images stop being used.

## Non-goals

- Self-serve account deletion from the user's profile (stays admin-only for now).
- A one-time sweep of images already orphaned in R2 (owner chose "forward only";
  could be a later project, done as a dry-run listing first).
- Cleaning up the 4,547 existing orphaned `characters` rows (owner: keep them).
  The fix only stops new orphans.
- Locking a privated set. The creator **can** switch it back to public (owner's
  decision, "for now").
- Any other admin page redesign (Stats, Lobbies, Poll tabs stay as they are).

## Anti-goals

- Deleting an R2 object that something still references (another set, or a
  character in another set). Users can submit an existing image URL as a
  character image (`player_handler.go`, `r.FormValue(charImageKey)`), so the same
  R2 URL can appear in more than one set.
- A deletion that leaves the user's personal data anywhere in the DB.
- An R2 outage blocking a set or account deletion.

## Existing state (for the builder)

- Admin UI: single file `backend/internal/handlers/admin.html` (~900 lines,
  vanilla JS), served at `/admin-ui` by `AdminHandler.ServeUI`. Tabs: Stats,
  Users, Lobbies, Content, Poll. Auth is `middleware.AdminMiddleware`
  (`X-Admin-Token` header or loopback).
- Admin routes: `backend/internal/routes/routes.go`, `/admin/*`.
- Reports: `SetReport{UserID, SetID, Reason}`; `CharacterSet.ReportCount`. At
  `reportThreshold = 5` (`services/player_service.go`) a set drops out of the
  public listing but stays `public = true`.
- `GET /admin/reports` lists reported sets with reasons and creator name (no
  images). `DELETE /admin/sets/{id}` and `POST /admin/sets/{id}/clear-reports`
  exist.
- Images: `saveFile` uploads to R2 bucket `config.R2Bucket` as `<uuid><ext>` and
  stores the public URL `config.R2PublicURL + "/" + filename` in
  `Character.Image` / `CharacterSet.CoverImage`. `LobbyCharacter` copies the URL too.
- Set cache: `h.Cache.InvalidateSet(id)` (Redis-backed).
- Gallery pages (`frontend/src/app/gallery/[slug]`) fetch with
  `revalidate: 3600`.

### Prod facts checked 2026-11-11 (read-only)

- **No ON DELETE CASCADE exists in prod** for app tables except
  `players → lobbies`. `config/database.go` uses
  `DisableForeignKeyConstraintWhenMigrating: true`, so the `constraint:OnDelete`
  tags on `CharacterSet.Characters`, `Lobby.LobbyCharacters`, `Player.GameState`,
  `SetReport` and so on do nothing. Today `PlayerService.DeleteSet` and
  `AdminHandler.DeleteSet` delete only the `character_sets` row.
- As a result, prod has **4,547 orphaned `characters` rows** whose set no longer
  exists.
- **0 image URLs are shared between sets** (across characters and covers,
  orphans included). 17 character images are non-R2 URLs.
- `stored_messages.sender_id` is the **player ID** (`websocket_service.go:235`),
  not the user ID. Rows also carry `username` and a string `lobby_id`.

## 1. Reported-set review (Content tab)

Layout **B, expandable cards** (owner chose this over a side-by-side layout).

- One card per set with `report_count > 0`, most-reported first.
- Collapsed card shows: set name, creator username, report count badge, and a
  "hidden" marker if `report_count >= 5`.
- Click to expand. The expanded card shows: report reasons with counts (e.g.
  "copyright ×3"), the cover image, and every character image with its name.
  Images load only when the card is expanded.
- Buttons on each card:
  - **Make private.** One click, no confirmation (easy to undo). Sets
    `public = false`, clears reports (`report_count = 0`, delete its
    `set_reports`), invalidates the set cache. The card leaves the queue. The set
    still works privately by link/code, and the creator can make it public again.
  - **Dismiss reports.** Existing clear-reports behaviour; the set stays public.
  - **Delete set.** Confirm dialog, then delete the set **and its R2 images**
    (see section 3).

Backend: a new `POST /admin/sets/{id}/make-private`, and either extend
`GET /admin/reports` with cover + characters or add `GET /admin/sets/{id}` for
the expanded view (builder's call).

## 2. Account deletion (Users tab)

- Search the users list by username **or email** (requests arrive by email).
- **Delete account** first calls a preview endpoint that returns counts of what
  will be removed (sets, characters, images, game records, friendships, follows,
  likes, reports, poll votes, feedback, messages, sessions, lobbies). The confirm
  dialog shows those counts and requires typing the username exactly.
- The delete runs in one DB transaction. Because prod has no cascades, every
  child row is deleted explicitly:
  - their sets: characters, set_categories, other users' likes/reports on those
    sets, the sets (reuse the shared set-delete helper from section 3)
  - lobbies they hosted: lobby_characters, game_states, stored_messages
    (`lobby_id`), players, lobbies
  - their own rows: collect their player IDs first, then stored_messages
    (`sender_id IN player IDs`, plus `username` match as a fallback for players
    already cleaned up), game_states, players, sessions, game_records,
    set_likes, set_reports, poll_votes, game_feedbacks, friendships (either
    side), follows (either side)
  - other players' game_records: `opponent_user_id = NULL`,
    `opponent_name = 'Deleted user'`
  - the user row
- After the transaction commits, the user's R2 images are deleted (section 3).
- Extend the existing `DELETE /admin/users/{id}` rather than adding a parallel
  endpoint. The deletion logic belongs in a service so it isn't stuck in the
  handler.
- Any open WebSocket/presence connections for that user can be left to drop on
  their own (sessions are gone, so they can't re-auth).

## 3. R2 image cleanup (going forward)

**Set deletion must delete its children.** One shared helper, used by the
creator delete, the admin delete and account deletion, removes in a transaction:
characters, set_categories, set_likes, set_reports, then the set. (Without this,
the reference check below would always find the deleted set's leftover
characters and never delete anything.)

A single image helper, e.g. `DeleteImagesIfUnreferenced(urls []string)`:

1. Skip any URL not starting with `config.R2PublicURL + "/"` (external URLs).
2. After the DB change has committed, drop any URL still referenced by a
   `characters.image` **whose set still exists**, or by a
   `character_sets.cover_image`. (Ignoring orphaned characters means the 4,547
   leftover rows can't block cleanup.)
3. `DeleteObject` the rest (key = part after the prefix). Log failures; never
   return them as request errors.

Run it async (goroutine) after commit so requests aren't slowed down.

Call sites:
- Creator deletes a set (`PlayerService.DeleteSet`).
- Admin deletes a set (`AdminHandler.DeleteSet`).
- Set edit (`UpdateSet`): the old cover when replaced, and the images of
  characters removed or replaced.
- Account deletion: all cover and character images from the user's sets.

Collect the URLs **before** the DB delete. Check references **after** the commit.

### Close the text-URL fallback

Remove the fallback in `CreateSetHandler` (`characters[i][image]`) and the
update handler (`newCharacters[i][image]`) that stores a raw form *value* as the
image URL when no file is uploaded. The frontend (`app/set/new/page.js`,
`app/edit/[setId]/page.js`) always sends a file, so only hand-crafted requests
use this path. Without it, every new image is a real, validated R2 upload, and
the "still referenced?" check above becomes a safety net instead of the only
guard. (Owner approved.)

My call: a new character with no file gets a 400. Existing rows aren't touched.

**Privacy vs. the reference check (my call).** Nothing records who uploaded an
R2 object, so "a user's images" means the URLs in that user's sets. In prod no
URL is shared between sets, and closing the fallback stops new sharing. So the
reference check never actually keeps a deleted user's photo alive. No
force-delete path and no uploader-tracking column are needed.

`LobbyCharacter.Image` is not treated as a reference: lobbies are short-lived,
and an in-progress game losing images after a set is deleted is acceptable.

## Left to the builder

- Exact endpoint shapes and JSON fields.
- Whether privating should also trigger on-demand revalidation of the gallery
  page, or accept up to 1h of staleness from `revalidate: 3600`.
- Styling within the existing admin.html conventions (cream/terracotta tokens
  already in the file).
- Tests: at least the reference check in the R2 helper and the deletion
  service's table coverage.
