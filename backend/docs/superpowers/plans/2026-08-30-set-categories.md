# Set Categories (Curated Tags) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let creators tag a character set with one or more curated categories (Anime, Movies & TV, etc.) and let browsers filter public sets by category in the existing "create lobby" browse panel.

**Architecture:** New `set_categories` join table (composite PK on `set_id` + `category`, GORM `AutoMigrate`-managed, no manual migration file). Backend validates categories against a fixed Go enum, replace-writes them on create/update, and adds an optional match-any filter to `GetPublicSets`. Frontend gets one shared category constant list consumed by the set-create page, set-edit page, and the public browse panel's new filter chips.

**Tech Stack:** Go 1.24 / chi / GORM / PostgreSQL (backend); Next.js 15 / React 19 plain inline styles + CSS-in-template-literal tokens (frontend, no test framework configured).

**Spec:** `docs/superpowers/specs/2026-08-30-set-categories-design.md`

## Global Constraints

- Categories are a **fixed enum**, never free-form user text — validate server-side, reject unknown values with 400.
- A set can have **zero or more** categories (multi-select, not required).
- Category list: `anime`, `movies_tv`, `cartoons`, `video_games`, `sports`, `music`, `celebrities`, `fictional_characters`, `other` (display labels: Anime, Movies & TV, Cartoons, Video Games, Sports, Music, Celebrities, Fictional Characters, Other).
- No new HTTP routes — extend the existing `/set/create`, `/set/{setId}` (PUT), `/set/public` endpoints only.
- Public-set category filter uses **match-any** semantics (a set matching any selected category is included).
- This repo has no manual SQL migration files and no frontend test framework — don't introduce either; GORM `AutoMigrate` handles schema, and frontend verification is manual (dev server + browser), not automated.
- Follow this repo's existing composite-key join-table pattern (`backend/internal/models/setReport.go`, `setLike.go`) for the new model.

---

### Task 1: `SetCategory` model + migration wiring

**Files:**
- Create: `backend/internal/models/setCategory.go`
- Modify: `backend/internal/config/database.go:50`

**Interfaces:**
- Produces: `models.Category` (type `string`) with consts `CategoryAnime`, `CategoryMoviesTV`, `CategoryCartoons`, `CategoryVideoGames`, `CategorySports`, `CategoryMusic`, `CategoryCelebrities`, `CategoryFictionalCharacters`, `CategoryOther`; `models.AllCategories []Category` (ordered slice of all nine, for validation and for handing the list to the frontend later if ever needed); `models.SetCategory{SetID uuid.UUID, Category Category}`.

- [ ] **Step 1: Write the model**

```go
// backend/internal/models/setCategory.go
package models

import "github.com/google/uuid"

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

var AllCategories = []Category{
	CategoryAnime,
	CategoryMoviesTV,
	CategoryCartoons,
	CategoryVideoGames,
	CategorySports,
	CategoryMusic,
	CategoryCelebrities,
	CategoryFictionalCharacters,
	CategoryOther,
}

func IsValidCategory(c Category) bool {
	for _, v := range AllCategories {
		if v == c {
			return true
		}
	}
	return false
}

type SetCategory struct {
	SetID    uuid.UUID `gorm:"type:uuid;not null;primaryKey;constraint:OnDelete:CASCADE"`
	Category Category  `gorm:"type:varchar(32);not null;primaryKey"`
}
```

- [ ] **Step 2: Register the model in AutoMigrate**

In `backend/internal/config/database.go:50`, add `&models.SetCategory{}` to the `AutoMigrate` call's argument list (alongside the existing `&models.SetReport{}`).

- [ ] **Step 3: Write a unit test for `IsValidCategory`**

```go
// backend/internal/models/setCategory_test.go
package models

import "testing"

func TestIsValidCategory(t *testing.T) {
	if !IsValidCategory(CategoryAnime) {
		t.Fatal("expected anime to be valid")
	}
	if IsValidCategory(Category("not-a-real-category")) {
		t.Fatal("expected unknown category to be invalid")
	}
}
```

- [ ] **Step 4: Run the test**

Run: `cd backend && go test ./internal/models/...`
Expected: PASS

- [ ] **Step 5: Verify the backend still builds**

Run: `cd backend && go build -o /tmp/backend-build-check ./server`
Expected: exits 0

- [ ] **Step 6: Commit**

```bash
git add backend/internal/models/setCategory.go backend/internal/models/setCategory_test.go backend/internal/config/database.go
git commit -m "feat: add SetCategory model and migration"
```

---

### Task 2: Service layer — validate + persist categories on create/update

**Files:**
- Modify: `backend/internal/services/player_service.go` (`CreateSet` at `:149`, `UpdateSet` at `:255`, `CharacterSetResponse` at `:18`, `attachLikes` at `:38`)

**Interfaces:**
- Consumes: `models.Category`, `models.IsValidCategory`, `models.SetCategory` (Task 1).
- Produces: `CreateSet(user, name, description string, public bool, characters []models.Character, coverImage string, minCharacters int, categories []models.Category) (*models.CharacterSet, error)` — signature gains a trailing `categories` param. `UpdateSet(...)` same, gains trailing `categories []models.Category` param. `CharacterSetResponse.Categories []models.Category` json field `"categories"`. New helper `validateCategories(categories []models.Category) error` returning an error naming the first invalid value.

- [ ] **Step 1: Add `validateCategories` helper and its test**

```go
// in player_service.go, near ReportSet's validation (around :495)
func validateCategories(categories []models.Category) error {
	for _, c := range categories {
		if !models.IsValidCategory(c) {
			return fmt.Errorf("invalid category: %s", c)
		}
	}
	return nil
}
```

```go
// backend/internal/services/player_service_test.go
package services

import (
	"testing"

	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

func TestValidateCategories_AllValid(t *testing.T) {
	err := validateCategories([]models.Category{models.CategoryAnime, models.CategorySports})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestValidateCategories_RejectsUnknown(t *testing.T) {
	err := validateCategories([]models.Category{models.Category("bogus")})
	if err == nil {
		t.Fatal("expected error for unknown category")
	}
}

func TestValidateCategories_EmptyIsValid(t *testing.T) {
	if err := validateCategories(nil); err != nil {
		t.Fatalf("expected empty categories to be valid, got %v", err)
	}
}
```

- [ ] **Step 2: Run the tests to verify they pass against the new helper**

Run: `cd backend && go test ./internal/services/... -run TestValidateCategories -v`
Expected: all three PASS (this is implementation-then-test since the helper is trivial and pure — write both together, then run)

- [ ] **Step 3: Wire validation + persistence into `CreateSet`**

In `CreateSet` (`player_service.go:149`), add the `categories []models.Category` parameter to the signature. Right after the existing character-count validation (before building `set :=`), add:

```go
	if err := validateCategories(categories); err != nil {
		return nil, err
	}
```

After the existing `if err := s.DB.Create(set).Error; err != nil { return nil, err }` block, before `return set, nil`, insert the categories:

```go
	for _, c := range categories {
		if err := s.DB.Create(&models.SetCategory{SetID: set.ID, Category: c}).Error; err != nil {
			return nil, err
		}
	}
```

- [ ] **Step 4: Wire validation + replace-write into `UpdateSet`**

In `UpdateSet` (`player_service.go:255`), add the `categories []models.Category` parameter. Add the same `validateCategories(categories)` check near the top (alongside the existing character-count checks). After the existing `if err := s.DB.Save(&set).Error; err != nil { return nil, err }` block, insert a delete-then-insert (matching the existing "delete characters not in keep list, then add new ones" replace pattern already used lower in this function):

```go
	if err := s.DB.Where("set_id = ?", setID).Delete(&models.SetCategory{}).Error; err != nil {
		return nil, err
	}
	for _, c := range categories {
		if err := s.DB.Create(&models.SetCategory{SetID: setID, Category: c}).Error; err != nil {
			return nil, err
		}
	}
```

- [ ] **Step 5: Add `Categories` to the response type and batch-attach it**

Add to `CharacterSetResponse` (`:18-24`):

```go
	Categories []models.Category `json:"categories"`
```

In `attachLikes` (`:38`), after the existing like-count batch fetch (`:54-60` region), add a batch fetch of categories keyed by set ID, then populate each result's `Categories` field when building the returned `[]CharacterSetResponse` slice further down in the function. Follow the same "collect setIDs → one batched query → map lookup" shape already used for `likeCount`. Read the full body of `attachLikes` first (it continues past line 60) to find where the final `CharacterSetResponse` values are constructed and add `Categories: categoriesBySetID[set.ID]` there — if `categoriesBySetID[set.ID]` is `nil` for a set with none, initialize it to `[]models.Category{}` before use so the JSON field serializes as `[]` not `null`.

- [ ] **Step 6: Update the two call sites in this same file that now have a mismatched signature**

`GetSetByID` (`:193`) and `GetPublicSetByID` (`:209`) call `attachLikes` but not `CreateSet`/`UpdateSet`, so they're unaffected by the signature change — no edit needed there. Confirm this by re-reading both functions after Steps 3–4; if `go build` (Step 7) reports a call-site mismatch anywhere else in this file, fix it there.

- [ ] **Step 7: Build and run tests**

Run: `cd backend && go build ./... && go test ./internal/services/... -v`
Expected: build succeeds; new tests PASS. (Existing callers of `CreateSet`/`UpdateSet` in handlers will fail to compile until Task 3 updates them — that's expected and resolved in the next task. If you want a clean intermediate build, temporarily pass `nil` for the new `categories` arg at the handler call sites and finish wiring them properly in Task 3.)

- [ ] **Step 8: Commit**

```bash
git add backend/internal/services/player_service.go backend/internal/services/player_service_test.go
git commit -m "feat: validate and persist set categories in create/update"
```

---

### Task 3: Handlers — parse categories from requests, filter public sets

**Files:**
- Modify: `backend/internal/handlers/player_handler.go` (`CreateSetHandler` `:64`, `UpdateSetHandler` `:201`, `GetSetFromPublicHandler` `:346`)
- Modify: `backend/internal/services/player_service.go` (`SetListParams` `:26`, `GetPublicSets` `:330`)

**Interfaces:**
- Consumes: `CreateSet`/`UpdateSet` new `categories` param (Task 2), `models.Category`, `models.IsValidCategory` (Task 1).
- Produces: `SetListParams.Categories []string` field; `GetPublicSets` applies the filter when non-empty.

- [ ] **Step 1: Add category filtering to `GetPublicSets`**

In `player_service.go`, add to `SetListParams` (`:26-31`):

```go
	Categories []string
```

In `GetPublicSets` (`:330`), after the existing `Search` filter block (`:342-345`), add:

```go
	if len(params.Categories) > 0 {
		base = base.Where("character_sets.id IN (SELECT set_id FROM set_categories WHERE category IN ?)", params.Categories)
	}
```

- [ ] **Step 2: Parse `categories[]` from the multipart form in `CreateSetHandler`**

In `player_handler.go`, after the existing `minCharacters` parse (`:125`) and before the `CreateSet` call (`:128`), add:

```go
	rawCategories := r.Form["categories[]"]
	categories := make([]models.Category, 0, len(rawCategories))
	for _, c := range rawCategories {
		categories = append(categories, models.Category(c))
	}
```

Update the call: `set, err := h.Service.CreateSet(user, name, description, public, characters, coverImageURL, minCharacters, categories)`. Add a specific error branch above the existing generic 500 (mirroring the existing `"set limit reached"` branch at `:130-133`):

```go
	if strings.HasPrefix(err.Error(), "invalid category") {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
```

(`strings` is already imported in this file — confirm at the top; it is, per the existing `strings.Contains`/`Trim` style helpers used elsewhere in the handlers package if any, otherwise add `"strings"` to the import block.)

- [ ] **Step 3: Same parsing in `UpdateSetHandler`**

In `player_handler.go`, after the existing `minCharacters` parse (`:276`) and before the `UpdateSet` call (`:277`), add the identical `rawCategories`/`categories` block from Step 2. Update the call: `set, err := h.Service.UpdateSet(user, setID, name, description, public, coverImageURL, keepIDs, newCharacters, nameUpdates, minCharacters, categories)`. This handler already returns raw `err.Error()` with `http.StatusBadRequest` for all `UpdateSet` errors (`:278-281`), so the invalid-category case is already surfaced correctly with no extra branch needed.

- [ ] **Step 4: Parse `categories` query params in `GetSetFromPublicHandler`**

In `player_handler.go` (`:346`), after the existing `sort` parsing (`:357-360`) and before building `params`, add:

```go
	categories := r.URL.Query()["categories"]
```

Add `Categories: categories,` to the `services.SetListParams{...}` literal (`:361-366`).

- [ ] **Step 5: Build**

Run: `cd backend && go build ./...`
Expected: exits 0, no signature-mismatch errors anywhere in the package.

- [ ] **Step 6: Write a service-level test for the match-any filter query construction**

This repo has no DB test harness, so don't add one for this feature — instead extend the existing pure-validation test file with a check that an empty `Categories` slice leaves the query unfiltered (behavioral guard against a future accidental regression in the `len(params.Categories) > 0` guard):

```go
// add to backend/internal/services/player_service_test.go
func TestSetListParams_EmptyCategoriesIsZeroValue(t *testing.T) {
	var p SetListParams
	if len(p.Categories) != 0 {
		t.Fatalf("expected zero-value SetListParams to have no categories, got %v", p.Categories)
	}
}
```

Run: `cd backend && go test ./internal/services/... -v`
Expected: PASS. (The actual SQL filter behavior — match-any across multiple categories — is verified manually against the local Postgres via `docker-compose up`, per the plan's Task 4 manual-check note below, since standing up a Postgres-backed Go test suite is out of scope for this feature.)

- [ ] **Step 7: Manual verification against local Postgres**

With `docker-compose up` running: create two sets via `POST /set/create` (curl or the UI once Task 5 lands) with different categories, then `GET /set/public?categories=anime&categories=sports` and confirm only matching sets return. This step has no automated assertion — note the result in the task's completion notes.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/handlers/player_handler.go backend/internal/services/player_service.go backend/internal/services/player_service_test.go
git commit -m "feat: wire category filtering through create/update/list endpoints"
```

---

### Task 4: Frontend shared category constants

**Files:**
- Create: `frontend/src/lib/categories.js`

**Interfaces:**
- Produces: `export const CATEGORIES = [{ value: "anime", label: "Anime" }, ...]` (all nine, in the same order as the backend's `models.AllCategories`, values matching the backend enum strings exactly).

- [ ] **Step 1: Write the constant**

```js
// frontend/src/lib/categories.js
export const CATEGORIES = [
    { value: "anime", label: "Anime" },
    { value: "movies_tv", label: "Movies & TV" },
    { value: "cartoons", label: "Cartoons" },
    { value: "video_games", label: "Video Games" },
    { value: "sports", label: "Sports" },
    { value: "music", label: "Music" },
    { value: "celebrities", label: "Celebrities" },
    { value: "fictional_characters", label: "Fictional Characters" },
    { value: "other", label: "Other" },
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/categories.js
git commit -m "feat: add shared category constant list"
```

---

### Task 5: Category picker on the set-create page

**Files:**
- Modify: `frontend/src/app/set/new/page.js`

**Interfaces:**
- Consumes: `CATEGORIES` from `frontend/src/lib/categories.js` (Task 4).
- Produces: `categories` state (array of value strings) submitted as repeated `categories[]` form fields on `POST /player/set/create`.

- [ ] **Step 1: Replace the dead tag state with category state**

Remove `const [tags, setTags] = useState([]);` and `const [tagInput, setTagInput] = useState("");` (`page.js:44-45`). Add:

```js
    const [categories, setCategories] = useState([]);
```

Add the import: `import { CATEGORIES } from "@/lib/categories";` near the top with the other imports.

- [ ] **Step 2: Replace the commented-out Tags block with a category chip picker**

Replace the entire `{/* TODO: Tags — add pre-launch ... */}` block (`page.js:240-268`) with:

```jsx
                            <div>
                                <label style={label}>Categories</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {CATEGORIES.map(cat => {
                                        const selected = categories.includes(cat.value);
                                        return (
                                            <button
                                                type="button"
                                                key={cat.value}
                                                onClick={() => setCategories(prev =>
                                                    prev.includes(cat.value) ? prev.filter(c => c !== cat.value) : [...prev, cat.value]
                                                )}
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: 6,
                                                    border: `1px solid ${selected ? T.accent : T.border}`,
                                                    background: selected ? T.accent : T.surface0,
                                                    color: selected ? "#fff" : T.text600,
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
```

- [ ] **Step 3: Submit categories in `doSave`**

In `doSave` (`page.js:129`), after the existing `formData.append("public", publicOverride);` line, add:

```js
        categories.forEach(c => formData.append("categories[]", c));
```

- [ ] **Step 4: Manual verification**

Run `docker-compose up`, open `http://localhost:3080/set/new`, select 2-3 category chips, create a set with 6+ characters, and confirm the request succeeds (check the Network tab or backend logs) and no console errors appear. Note the result in the task's completion notes — this repo has no frontend test framework, so this manual pass is the acceptance check for this task.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/set/new/page.js
git commit -m "feat: add category picker to set creation page"
```

---

### Task 6: Category picker on the set-edit page

**Files:**
- Modify: `frontend/src/app/edit/[setId]/page.js`

**Interfaces:**
- Consumes: `CATEGORIES` (Task 4), the same chip-picker markup as Task 5, `set.categories` from the `GET /player/set/{setId}` response (Task 2/3 populate this via `CharacterSetResponse.Categories`).

- [ ] **Step 1: Add `categories` state and populate it from the fetched set**

Add near the other form state (`page.js:45-47`):

```js
    const [categories, setCategories] = useState([]);
```

Add the import: `import { CATEGORIES } from "@/lib/categories";`.

In the effect that populates form state from the fetched set (`page.js:92-96`, alongside `setName(found.name ?? "")`), add:

```js
                setCategories(found.categories ?? []);
```

- [ ] **Step 2: Add the same chip picker to the form UI**

Insert the identical chip-picker JSX from Task 5 Step 2 into the form section that already renders `name`/`description` fields (near `page.js:451-455`), reading `categories`/`setCategories` (this page's own state, not `set.categories`) and using this file's own `T`/style tokens (check the top of the file for the same `T` constant object as `new/page.js` — if it's named differently here, use whatever this file's local token object is called).

- [ ] **Step 3: Submit categories on save**

In the save handler that builds `formData` (`page.js:318-321`), after the existing `formData.append("public", isPublic);` line, add:

```js
        categories.forEach(c => formData.append("categories[]", c));
```

- [ ] **Step 4: Manual verification**

With `docker-compose up` running, edit an existing set, toggle its categories, save, reload the edit page, and confirm the previously-selected categories are pre-checked (round-trip through `GET` → `PUT` → `GET` again). Note the result in the task's completion notes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/edit/[setId]/page.js
git commit -m "feat: add category picker to set edit page"
```

---

### Task 7: Category filter + badges in the public browse panel

**Files:**
- Modify: `frontend/src/app/create/LobbyForm.js`

**Interfaces:**
- Consumes: `CATEGORIES` (Task 4), the `categories` query param on `GET /player/set/public` (Task 3), `set.categories` on each returned set (Task 2's `CharacterSetResponse.Categories`).
- Produces: `selectedCategories` state (array of value strings) driving `loadSetsPublic`'s new `categories` query param.

- [ ] **Step 1: Add state and CSS for filter chips**

Add near the other browse-state declarations (`LobbyForm.js:866`, alongside `sortOrder`):

```js
    const [selectedCategories, setSelectedCategories] = useState([]);
```

Add the import: `import { CATEGORIES } from "@/lib/categories";`.

Add a small chip CSS block near `.sort-bar`/`.sort-select` (`LobbyForm.js:434-453`):

```css
  .category-chip {
    height: 28px;
    padding: 0 var(--s3);
    border: 1px solid var(--border);
    border-radius: var(--r);
    background: var(--surface-0);
    color: var(--text-600);
    font-family: 'DM Sans', sans-serif;
    font-size: var(--text-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .category-chip--active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
```

- [ ] **Step 2: Render the filter chips inside `.sort-bar`, public tab only**

In the existing `{setView === "public" && (<div className="sort-bar">...)}` block (`LobbyForm.js:1180-1196`), after the closing `</select>`, add:

```jsx
                                {CATEGORIES.map(cat => {
                                    const active = selectedCategories.includes(cat.value);
                                    return (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            className={`category-chip${active ? " category-chip--active" : ""}`}
                                            aria-pressed={active}
                                            onClick={() => setSelectedCategories(prev =>
                                                prev.includes(cat.value) ? prev.filter(c => c !== cat.value) : [...prev, cat.value]
                                            )}
                                        >
                                            {cat.label}
                                        </button>
                                    );
                                })}
```

- [ ] **Step 3: Thread `selectedCategories` through `loadSetsPublic` and its triggers**

Update `loadSetsPublic` (`LobbyForm.js:983`) to accept and send categories:

```js
    const loadSetsPublic = async (page, sort, search, categories) => {
        setLoadingPublic(true); setError(null);
        try {
            const headers = { "Content-Type": "application/json" };
            const params = new URLSearchParams({ page, pageSize: PAGE_SIZE, sort: sort || "most-popular", search: search || "" });
            (categories || []).forEach(c => params.append("categories", c));
            const res = await apiFetch(`/player/set/public?${params}`, {
                method: "GET", headers,
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setPublicSets(data.sets ?? []);
            setPublicTotal(data.total ?? 0);
        } catch { setError("Network error"); } finally { setLoadingPublic(false); }
    };
```

Update every existing call site of `loadSetsPublic(...)` (`:896`, `:904`, `:912`, `:923`) to pass `selectedCategories` as the fourth argument. Add a new effect mirroring the existing sort-change effect (`:900-906`) that resets to page 1 when `selectedCategories` changes:

```js
    // Public sets: category filter change → reset to page 1
    useEffect(() => {
        if (user === undefined) return;
        setPublicPage(1);
        loadSetsPublic(1, sortOrder, searchQuery, selectedCategories);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategories]);
```

- [ ] **Step 4: Show category badges on public set cards**

In the set-card metadata block (`LobbyForm.js:1279-1291`, the `.set-card__meta` div), after the existing Public/Private badge (`:1283-1287`), add — gated to the public tab per the spec's v1 scope:

```jsx
                                                {setView === "public" && (set.categories ?? []).map(catValue => {
                                                    const cat = CATEGORIES.find(c => c.value === catValue);
                                                    return cat ? (
                                                        <span key={catValue} className="set-card__badge">{cat.label}</span>
                                                    ) : null;
                                                })}
```

- [ ] **Step 5: Manual verification**

With `docker-compose up` running, open `http://localhost:3080/create`, switch to the Public tab, toggle 1-2 category chips, and confirm: the grid narrows to matching sets, chips combine correctly with an active search term, and set cards show category badges. Note the result in the task's completion notes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/create/LobbyForm.js
git commit -m "feat: add category filter and badges to public set browsing"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `2026-08-30-set-categories-design.md` (data model, backend create/update/list, frontend create/edit/browse) maps to a task above (Tasks 1-3 backend, Tasks 4-7 frontend). The spec's "Out of scope" items (free-form tags, standalone discovery page, admin-editable category list) have no corresponding task, by design.
- **Type consistency:** `models.Category` (Go) and the frontend's plain string `value` fields carry identical string literals (`"anime"`, `"movies_tv"`, etc.) — Task 4's list was written to match Task 1's `AllCategories` order and values exactly; double check this at Task 4 time since Task 1 may have already been implemented and committed by then.
- **No placeholders:** every step above includes literal code, not a description of code to write.
