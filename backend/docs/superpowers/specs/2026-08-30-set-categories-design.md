# Set Categories (Curated Tags)

## Problem

Character sets have no discovery metadata beyond name/description/search. Browsing public sets (`LobbyForm.js`'s "create lobby" panel) only supports a keyword search box and a sort dropdown (Most Played / Most Liked / Newest / My Liked). There's no way to filter by genre/topic (Anime, Movies, Sports, etc.), and `frontend/src/app/set/new/page.js:240` has a dead, commented-out free-form tag input (`TODO: Tags — add pre-launch`) that was never wired up.

## Decision

Add a **curated, fixed-list, multi-select category** to each character set — not free-form tags. A set can carry zero or more categories. Categories are picked from a small fixed enum at set-create/edit time, and public-set browsing gets a category filter alongside the existing sort dropdown.

Rejected alternatives (from prior discussion):
- **Free-form tags**: rejected — needs normalization, moderation for junk/offensive tags, and open-ended filter UI. Curated list avoids all of that.
- **Single category per set**: rejected in favor of multiple — sets often span more than one topic (e.g. an anime-based sports set).
- **New standalone `/browse` or `/discover` page**: rejected for this iteration — extend the existing browse panel in `LobbyForm.js` instead, since that's where discovery already happens today. A dedicated page is a separate, larger scope.

## Data model

New join table `SetCategory`, following the existing `SetReport`/`SetLike` composite-key pattern (`backend/internal/models/setReport.go`, `setLike.go`):

```go
package models

type Category string

const (
    CategoryAnime               Category = "anime"
    CategoryMoviesTV            Category = "movies_tv"
    CategoryCartoons            Category = "cartoons"
    CategoryVideoGames          Category = "video_games"
    CategorySports              Category = "sports"
    CategoryMusic               Category = "music"
    CategoryCelebrities         Category = "celebrities"
    CategoryFictionalCharacters Category = "fictional_characters"
    CategoryOther               Category = "other"
)

type SetCategory struct {
    SetID    uuid.UUID `gorm:"type:uuid;not null;primaryKey;constraint:OnDelete:CASCADE"`
    Category Category  `gorm:"type:varchar(32);not null;primaryKey"`
}
```

No `CreatedAt` needed (unlike `SetLike`/`SetReport`) — this is pure classification, not an auditable user action. GORM `AutoMigrate` handles the table; no manual SQL migration file (this codebase has none — see `backend/internal/config/database.go:50`).

Category values are validated server-side against the const list (same pattern as `ReportSet`'s reason validation in `player_service.go:495-503`) — reject unknown values with a 400 rather than silently storing garbage.

## Backend changes

- `backend/internal/models/setCategory.go` (new) — the model above.
- `backend/internal/config/database.go:50` — add `&models.SetCategory{}` to `AutoMigrate`.
- `PlayerService.CreateSet` / `UpdateSet` (`player_service.go:149`, `:255`) — accept a `categories []models.Category` param, validate each against the const list, replace-write the set's rows in `set_categories` inside the existing create/update flow (delete-then-insert on update, matching how `UpdateSet` already replaces characters).
- `PlayerService.attachLikes` (`player_service.go:38`) or a sibling batch-fetch helper — batch-load categories per set the same way like counts are batch-loaded, and add a `Categories []models.Category` field to `CharacterSetResponse` (`player_service.go:18`).
- `SetListParams` (`player_service.go:26`) — add `Categories []string`; `GetPublicSets` (`player_service.go:330`) filters with `character_sets.id IN (SELECT set_id FROM set_categories WHERE category IN (?))` when present (match-any semantics, not match-all — simplest and matches how a single dropdown-style multi-select filter is normally read by users).
- Handlers (`backend/internal/handlers/player_handler.go`):
  - `CreateSetHandler` (`:64`) / `UpdateSetHandler` (`:201`) — both already parse `multipart/form-data`; read repeated `categories[]` form values the same way `characters[i][name]` is read (index-loop, or `r.Form["categories[]"]`).
  - `GetSetFromPublicHandler` (`:346`) — read repeated `categories` query params (`r.URL.Query()["categories"]`) into `SetListParams.Categories`.
- No new routes — `/set/create`, `/set/{setId}`, `/set/public` all already exist and just gain fields.

## Frontend changes

- **Shared constant**: a small `CATEGORIES` list (value + display label) shared by create, edit, and browse — e.g. `frontend/src/lib/categories.js` — so the three UIs can't drift out of sync with each other or the backend enum.
  - Anime, Movies & TV, Cartoons, Video Games, Sports, Music, Celebrities, Fictional Characters, Other
- **`frontend/src/app/set/new/page.js`** — replace the dead commented block at line 240 with a multi-select category picker (toggleable chip/checkbox list built from `CATEGORIES`, not the old free-form text-entry chip input — that pattern doesn't fit curated categories). New `categories` state (array of value strings, replacing the unused `tags`/`tagInput` state). `doSave` appends each selected category as a repeated `categories[]` form field.
- **`frontend/src/app/edit/[setId]/page.js`** — same picker component, pre-populated from the fetched set's `categories` field, same submit wiring as `new/page.js`.
- **`frontend/src/app/create/LobbyForm.js`**:
  - Category filter UI next to the existing `.sort-select` inside `.sort-bar` (`:1181-1196`) — reuses the `.sort-select`/`.sort-bar` CSS tokens (`:434-453`). Simplest form: a native multi-select or a row of toggle chips; given "match-any" semantics and a handful of categories, toggle chips (styled like `.set-card__badge`, `:227-242`) read more clearly than a cramped multi-select `<select>`.
  - New `selectedCategories` state; wire into `loadSetsPublic` (`:983`) as a `categories` repeated query param, and into the existing `useEffect` triggers that already reset to page 1 on filter change (`:900-906`, sibling to the `sortOrder` effect).
  - Set cards (`:1276-1291`) gain category badges next to the existing Public/Private badge, using `.set-card__badge` styling — only for `setView === "public"` cards where `set.categories` is populated (skip for "My Sets" cards to avoid clutter, unless product wants it there too — default to public-only for v1).

## Testing

- Backend: unit-test `CreateSet`/`UpdateSet` category validation (reject unknown category value) and `GetPublicSets` category filtering (match-any across 2+ categories), following existing test patterns in `backend/internal/services/`.
- Frontend: manual verification in dev — create a set with 2 categories, confirm they persist through edit, confirm the browse panel's category filter narrows results and combines correctly with search + sort.

## Out of scope

- Free-form/user-typed tags (rejected above).
- A standalone `/browse` or `/discover` page (rejected above — future iteration if discovery needs to grow beyond the lobby-creation panel).
- Category management/admin UI — the category list is a hardcoded enum on both ends, changed by a code change + migration-free `AutoMigrate`, not a runtime-editable list.
