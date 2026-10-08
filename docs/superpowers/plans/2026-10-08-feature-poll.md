# Feature Poll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registered users can vote (and change their vote) on which feature to build next via a poll card shown to the right of the homepage hero; the developer reads results in the admin panel.

**Architecture:** A hardcoded poll definition lives in a Go service backed by a `PollStore` interface (GORM implementation + in-memory fakes for tests). `GET /poll` and `POST /poll/vote` sit behind the existing session `userMiddleware`; `GET /admin/poll` sits behind `AdminMiddleware`. A self-contained `FeaturePoll` React component fetches the poll and renders guest-teaser / vote / results states; the homepage wraps the hero column and the poll in a responsive flex row.

**Tech Stack:** Go 1.25, chi, GORM (Postgres), Next.js 15 / React 19, Framer Motion, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-08-feature-poll-design.md`

## Global Constraints

- Do NOT run builds or tests yourself (`go test`, `go build`, `npm run build`, `npm run lint`) — per CLAUDE.md the developer runs them. "Run" steps below are handed to the developer; write the code so they pass.
- Commit messages must NOT include a `Co-Authored-By: Claude` trailer (repo preference).
- Before any frontend code, read `/home/tjraff5/projects/GuessWho/designSchema.txt` in full. Colors only via a local `T` token object (existing pattern, see `HomePageClient.js:16-31`); radius 6px everywhere; spacing multiples of 4px; Fraunces for headings, DM Sans for UI; no emoji in UI; focus ring `2px solid accent, offset 2px`; touch targets ≥ 44px; honour `prefers-reduced-motion`.
- Poll ID: `"next-feature-2026-10"`. Question: `"What should we build next?"`.
- Option keys, in order: `friends`, `cosmetics`, `creator_rewards`.
- Comment max length: 500 characters (runes), whitespace-trimmed.
- Only non-guest users may vote; guests get 403 from `POST /poll/vote`.
- Users may change their vote at any time; one row per `(poll_id, user_id)`.
- Results are returned only after the requesting user has voted.
- Dismissal key: `localStorage["poll-dismissed-<pollId>"]`, all access in try/catch.

## Review Focus

1. **Percentages don't sum to 100** (e.g. 1/1/1 votes → 33/33/33) — use largest-remainder rounding so they always sum to exactly 100 when total > 0. Test in Task 1.
2. **Vote stored under an option key that no longer exists** (developer edits options without changing poll ID) — counts for unknown keys are ignored in totals/percentages; `myVote` still returned so the user can re-vote. Test in Task 1.
3. **Comment of exactly 500 multi-byte characters** (emoji/accents) — length is measured in runes, not bytes; 500 runes accepted, 501 rejected. Test in Task 1.
4. **Malformed JSON body / missing optionKey** on `POST /poll/vote` → 400, not 500. Test in Task 2.
5. **Double-click on Vote** → button disabled while submitting; backend upsert means a second request just overwrites. Covered by `submitting` state in Task 4 and upsert test in Task 1.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `backend/internal/models/pollVote.go` | Create | `PollVote` GORM model |
| `backend/internal/config/database.go` | Modify (line 50) | Add `&models.PollVote{}` to AutoMigrate |
| `backend/internal/services/poll_service.go` | Create | Poll definition, `PollStore` interface + GORM impl, `PollService` (view/vote/percentages) |
| `backend/internal/services/poll_service_test.go` | Create | Service tests with in-memory fake store |
| `backend/internal/handlers/poll_handler.go` | Create | `GET /poll`, `POST /poll/vote` |
| `backend/internal/handlers/poll_handler_test.go` | Create | Handler tests (status codes, JSON) |
| `backend/internal/handlers/admin_handler.go` | Modify (append) | `GetPollResults` for `GET /admin/poll` |
| `backend/internal/handlers/admin.html` | Modify | "Poll" nav tab + section |
| `backend/internal/routes/routes.go` | Modify | Wire service, handler, routes |
| `frontend/src/components/FeaturePoll.js` | Create | Poll card UI (teaser / vote / results / dismiss) |
| `frontend/src/app/HomePageClient.js` | Modify | Flex row wrapping hero column + `<FeaturePoll />`, responsive CSS |

---

### Task 1: Poll model + service

**Files:**
- Create: `backend/internal/models/pollVote.go`
- Modify: `backend/internal/config/database.go:50`
- Create: `backend/internal/services/poll_service.go`
- Test: `backend/internal/services/poll_service_test.go`

**Interfaces:**
- Consumes: `models.User` (`ID uuid.UUID`, `IsGuest bool`)
- Produces (package `services`):
  - `type PollOption struct { Key, Label, Description string }` (json: `key`, `label`, `description`)
  - `type Poll struct { ID, Question string; Options []PollOption }`
  - `var CurrentPoll Poll`
  - `const MaxPollCommentLength = 500`
  - `var ErrGuestCannotVote, ErrInvalidPollOption, ErrPollCommentTooLong error`
  - `type PollStore interface { GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error); UpsertVote(v *models.PollVote) error; CountByOption(pollID string) (map[string]int64, error) }` — `GetVote` returns `(nil, nil)` when no vote exists.
  - `type PollVoteView struct { OptionKey string \`json:"optionKey"\`; Comment string \`json:"comment"\` }`
  - `type PollResults struct { Total int64 \`json:"total"\`; Percentages map[string]int \`json:"percentages"\` }`
  - `type PollView struct { ID string \`json:"id"\`; Question string \`json:"question"\`; Options []PollOption \`json:"options"\`; MyVote *PollVoteView \`json:"myVote"\`; Results *PollResults \`json:"results"\` }`
  - `type PollService struct { Store PollStore; Poll Poll }`
  - `func NewPollService(db *gorm.DB) *PollService`
  - `func (s *PollService) GetPollForUser(user *models.User) (*PollView, error)`
  - `func (s *PollService) CastVote(user *models.User, optionKey, comment string) (*PollView, error)`

- [ ] **Step 1: Create the model**

`backend/internal/models/pollVote.go`:

```go
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PollVote is one user's vote on a homepage feature poll. The composite
// unique index enforces one vote per user per poll; re-voting upserts.
type PollVote struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PollID    string    `gorm:"not null;uniqueIndex:idx_poll_user" json:"pollId"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_poll_user" json:"userId"`
	OptionKey string    `gorm:"not null" json:"optionKey"`
	Comment   string    `gorm:"type:text" json:"comment"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (v *PollVote) BeforeCreate(tx *gorm.DB) (err error) {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return
}
```

- [ ] **Step 2: Register migration**

In `backend/internal/config/database.go` line 50, append `&models.PollVote{}` to the end of the `db.AutoMigrate(...)` argument list (after `&models.GameFeedback{}`).

- [ ] **Step 3: Write the failing service tests**

`backend/internal/services/poll_service_test.go`:

```go
package services

import (
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

// fakePollStore is an in-memory PollStore keyed on (pollID, userID),
// mirroring the unique index on the real table.
type fakePollStore struct {
	votes map[string]*models.PollVote
}

func newFakePollStore() *fakePollStore {
	return &fakePollStore{votes: map[string]*models.PollVote{}}
}

func fakeKey(pollID string, userID uuid.UUID) string { return pollID + "|" + userID.String() }

func (f *fakePollStore) GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error) {
	v, ok := f.votes[fakeKey(pollID, userID)]
	if !ok {
		return nil, nil
	}
	cp := *v
	return &cp, nil
}

func (f *fakePollStore) UpsertVote(v *models.PollVote) error {
	cp := *v
	f.votes[fakeKey(v.PollID, v.UserID)] = &cp
	return nil
}

func (f *fakePollStore) CountByOption(pollID string) (map[string]int64, error) {
	out := map[string]int64{}
	for _, v := range f.votes {
		if v.PollID == pollID {
			out[v.OptionKey]++
		}
	}
	return out, nil
}

func newTestPollService() (*PollService, *fakePollStore) {
	store := newFakePollStore()
	return &PollService{Store: store, Poll: CurrentPoll}, store
}

func registered() *models.User { return &models.User{ID: uuid.New()} }

func TestCurrentPoll_HasExpectedOptions(t *testing.T) {
	want := []string{"friends", "cosmetics", "creator_rewards"}
	if len(CurrentPoll.Options) != len(want) {
		t.Fatalf("expected %d options, got %d", len(want), len(CurrentPoll.Options))
	}
	for i, k := range want {
		if CurrentPoll.Options[i].Key != k {
			t.Fatalf("option %d: expected %q, got %q", i, k, CurrentPoll.Options[i].Key)
		}
	}
}

func TestCastVote_GuestRejected(t *testing.T) {
	svc, store := newTestPollService()
	_, err := svc.CastVote(&models.User{ID: uuid.New(), IsGuest: true}, "friends", "")
	if !errors.Is(err, ErrGuestCannotVote) {
		t.Fatalf("expected ErrGuestCannotVote, got %v", err)
	}
	if len(store.votes) != 0 {
		t.Fatal("guest vote must not be stored")
	}
}

func TestCastVote_UnknownOptionRejected(t *testing.T) {
	svc, _ := newTestPollService()
	_, err := svc.CastVote(registered(), "bogus", "")
	if !errors.Is(err, ErrInvalidPollOption) {
		t.Fatalf("expected ErrInvalidPollOption, got %v", err)
	}
}

func TestCastVote_CommentLengthCountsRunes(t *testing.T) {
	svc, _ := newTestPollService()
	ok := strings.Repeat("é", MaxPollCommentLength) // 500 runes, 1000 bytes
	if _, err := svc.CastVote(registered(), "friends", ok); err != nil {
		t.Fatalf("expected 500-rune comment to be accepted, got %v", err)
	}
	tooLong := strings.Repeat("é", MaxPollCommentLength+1)
	if _, err := svc.CastVote(registered(), "friends", tooLong); !errors.Is(err, ErrPollCommentTooLong) {
		t.Fatalf("expected ErrPollCommentTooLong, got %v", err)
	}
}

func TestCastVote_TrimsComment(t *testing.T) {
	svc, _ := newTestPollService()
	view, err := svc.CastVote(registered(), "friends", "   more sets please  ")
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote.Comment != "more sets please" {
		t.Fatalf("expected trimmed comment, got %q", view.MyVote.Comment)
	}
}

func TestCastVote_ChangingVoteOverwrites(t *testing.T) {
	svc, store := newTestPollService()
	u := registered()
	if _, err := svc.CastVote(u, "friends", "first"); err != nil {
		t.Fatal(err)
	}
	view, err := svc.CastVote(u, "cosmetics", "changed my mind")
	if err != nil {
		t.Fatal(err)
	}
	if len(store.votes) != 1 {
		t.Fatalf("expected 1 stored vote after change, got %d", len(store.votes))
	}
	if view.MyVote.OptionKey != "cosmetics" || view.MyVote.Comment != "changed my mind" {
		t.Fatalf("expected updated vote, got %+v", view.MyVote)
	}
	if view.Results.Total != 1 || view.Results.Percentages["cosmetics"] != 100 || view.Results.Percentages["friends"] != 0 {
		t.Fatalf("unexpected results after change: %+v", view.Results)
	}
}

func TestGetPollForUser_NoResultsBeforeVoting(t *testing.T) {
	svc, _ := newTestPollService()
	_, _ = svc.CastVote(registered(), "friends", "") // someone else voted
	view, err := svc.GetPollForUser(registered())
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote != nil || view.Results != nil {
		t.Fatalf("expected no vote/results before voting, got %+v / %+v", view.MyVote, view.Results)
	}
	if view.ID != CurrentPoll.ID || len(view.Options) != 3 {
		t.Fatalf("expected poll definition in view, got %+v", view)
	}
}

func TestGetPollForUser_ResultsAfterVoting(t *testing.T) {
	svc, _ := newTestPollService()
	u := registered()
	_, _ = svc.CastVote(u, "friends", "hi")
	_, _ = svc.CastVote(registered(), "friends", "")
	_, _ = svc.CastVote(registered(), "cosmetics", "")
	_, _ = svc.CastVote(registered(), "creator_rewards", "")
	view, err := svc.GetPollForUser(u)
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote == nil || view.MyVote.OptionKey != "friends" || view.MyVote.Comment != "hi" {
		t.Fatalf("expected my vote, got %+v", view.MyVote)
	}
	want := map[string]int{"friends": 50, "cosmetics": 25, "creator_rewards": 25}
	if view.Results.Total != 4 {
		t.Fatalf("expected total 4, got %d", view.Results.Total)
	}
	for k, p := range want {
		if view.Results.Percentages[k] != p {
			t.Fatalf("%s: expected %d%%, got %d%%", k, p, view.Results.Percentages[k])
		}
	}
}

func TestGetPollForUser_GuestGetsDefinitionOnly(t *testing.T) {
	svc, _ := newTestPollService()
	view, err := svc.GetPollForUser(&models.User{ID: uuid.New(), IsGuest: true})
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote != nil || view.Results != nil || len(view.Options) != 3 {
		t.Fatalf("unexpected guest view: %+v", view)
	}
}

func TestComputePollResults_SumsTo100(t *testing.T) {
	res := computePollResults(CurrentPoll.Options, map[string]int64{"friends": 1, "cosmetics": 1, "creator_rewards": 1})
	sum := 0
	for _, p := range res.Percentages {
		sum += p
	}
	if sum != 100 {
		t.Fatalf("expected percentages to sum to 100, got %d (%v)", sum, res.Percentages)
	}
}

func TestComputePollResults_IgnoresUnknownKeys(t *testing.T) {
	res := computePollResults(CurrentPoll.Options, map[string]int64{"friends": 1, "removed_option": 5})
	if res.Total != 1 || res.Percentages["friends"] != 100 {
		t.Fatalf("expected unknown keys ignored, got %+v", res)
	}
	if _, ok := res.Percentages["removed_option"]; ok {
		t.Fatal("unknown key must not appear in percentages")
	}
}

func TestComputePollResults_ZeroVotes(t *testing.T) {
	res := computePollResults(CurrentPoll.Options, map[string]int64{})
	if res.Total != 0 {
		t.Fatalf("expected total 0, got %d", res.Total)
	}
	for _, o := range CurrentPoll.Options {
		if res.Percentages[o.Key] != 0 {
			t.Fatalf("expected 0%% for %s, got %d", o.Key, res.Percentages[o.Key])
		}
	}
}
```

- [ ] **Step 4: Developer runs tests to verify they fail**

Run: `cd backend && go test ./internal/services/ -run 'Poll' -v`
Expected: FAIL — compile errors (`CurrentPoll`, `PollService`, `computePollResults` undefined).

- [ ] **Step 5: Implement the service**

`backend/internal/services/poll_service.go`:

```go
package services

import (
	"errors"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PollOption struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type Poll struct {
	ID       string
	Question string
	Options  []PollOption
}

// CurrentPoll is the poll shown on the homepage. To run a new poll, change
// the ID and options and deploy; votes for the old ID stay in the table.
var CurrentPoll = Poll{
	ID:       "next-feature-2026-10",
	Question: "What should we build next?",
	Options: []PollOption{
		{Key: "friends", Label: "Friends & rivals", Description: "Add friends, invite them directly, and track head-to-head records."},
		{Key: "cosmetics", Label: "Profile cosmetics", Description: "Avatars, badges, and card backs to make your profile yours."},
		{Key: "creator_rewards", Label: "Creator rewards", Description: "Perks and recognition when your sets get played a lot."},
	},
}

const MaxPollCommentLength = 500

var (
	ErrGuestCannotVote    = errors.New("sign up to vote")
	ErrInvalidPollOption  = errors.New("invalid poll option")
	ErrPollCommentTooLong = errors.New("comment is too long")
)

type PollStore interface {
	// GetVote returns (nil, nil) when the user has not voted.
	GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error)
	UpsertVote(v *models.PollVote) error
	CountByOption(pollID string) (map[string]int64, error)
}

type gormPollStore struct {
	db *gorm.DB
}

func (g *gormPollStore) GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error) {
	var v models.PollVote
	err := g.db.Where("poll_id = ? AND user_id = ?", pollID, userID).First(&v).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (g *gormPollStore) UpsertVote(v *models.PollVote) error {
	return g.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "poll_id"}, {Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"option_key", "comment", "updated_at"}),
	}).Create(v).Error
}

func (g *gormPollStore) CountByOption(pollID string) (map[string]int64, error) {
	var rows []struct {
		OptionKey string
		Count     int64
	}
	err := g.db.Model(&models.PollVote{}).
		Select("option_key, COUNT(*) AS count").
		Where("poll_id = ?", pollID).
		Group("option_key").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[string]int64, len(rows))
	for _, r := range rows {
		out[r.OptionKey] = r.Count
	}
	return out, nil
}

type PollVoteView struct {
	OptionKey string `json:"optionKey"`
	Comment   string `json:"comment"`
}

type PollResults struct {
	Total       int64          `json:"total"`
	Percentages map[string]int `json:"percentages"`
}

type PollView struct {
	ID       string        `json:"id"`
	Question string        `json:"question"`
	Options  []PollOption  `json:"options"`
	MyVote   *PollVoteView `json:"myVote"`
	Results  *PollResults  `json:"results"`
}

type PollService struct {
	Store PollStore
	Poll  Poll
}

func NewPollService(db *gorm.DB) *PollService {
	return &PollService{Store: &gormPollStore{db: db}, Poll: CurrentPoll}
}

func (s *PollService) baseView() *PollView {
	return &PollView{ID: s.Poll.ID, Question: s.Poll.Question, Options: s.Poll.Options}
}

func (s *PollService) isValidOption(key string) bool {
	for _, o := range s.Poll.Options {
		if o.Key == key {
			return true
		}
	}
	return false
}

// GetPollForUser returns the poll definition, plus the user's vote and the
// tally once they have voted. Guests only ever get the definition.
func (s *PollService) GetPollForUser(user *models.User) (*PollView, error) {
	view := s.baseView()
	if user.IsGuest {
		return view, nil
	}
	vote, err := s.Store.GetVote(s.Poll.ID, user.ID)
	if err != nil {
		return nil, err
	}
	if vote == nil {
		return view, nil
	}
	counts, err := s.Store.CountByOption(s.Poll.ID)
	if err != nil {
		return nil, err
	}
	results := computePollResults(s.Poll.Options, counts)
	view.MyVote = &PollVoteView{OptionKey: vote.OptionKey, Comment: vote.Comment}
	view.Results = &results
	return view, nil
}

// CastVote creates or replaces the user's vote, then returns the updated view.
func (s *PollService) CastVote(user *models.User, optionKey, comment string) (*PollView, error) {
	if user.IsGuest {
		return nil, ErrGuestCannotVote
	}
	if !s.isValidOption(optionKey) {
		return nil, ErrInvalidPollOption
	}
	comment = strings.TrimSpace(comment)
	if utf8.RuneCountInString(comment) > MaxPollCommentLength {
		return nil, ErrPollCommentTooLong
	}
	if err := s.Store.UpsertVote(&models.PollVote{
		PollID:    s.Poll.ID,
		UserID:    user.ID,
		OptionKey: optionKey,
		Comment:   comment,
	}); err != nil {
		return nil, err
	}
	return s.GetPollForUser(user)
}

// computePollResults turns raw counts into whole-number percentages that sum
// to exactly 100 (largest-remainder method). Counts for keys not in options
// are ignored, so editing options without changing the poll ID can't skew totals.
func computePollResults(options []PollOption, counts map[string]int64) PollResults {
	res := PollResults{Percentages: make(map[string]int, len(options))}
	for _, o := range options {
		res.Total += counts[o.Key]
		res.Percentages[o.Key] = 0
	}
	if res.Total == 0 {
		return res
	}

	type rem struct {
		key string
		r   int64
		idx int
	}
	rems := make([]rem, 0, len(options))
	assigned := 0
	for i, o := range options {
		scaled := counts[o.Key] * 100
		p := int(scaled / res.Total)
		res.Percentages[o.Key] = p
		assigned += p
		rems = append(rems, rem{key: o.Key, r: scaled % res.Total, idx: i})
	}
	sort.SliceStable(rems, func(a, b int) bool {
		if rems[a].r != rems[b].r {
			return rems[a].r > rems[b].r
		}
		return rems[a].idx < rems[b].idx
	})
	for i := 0; assigned < 100; i++ {
		res.Percentages[rems[i%len(rems)].key]++
		assigned++
	}
	return res
}
```

- [ ] **Step 6: Developer runs tests to verify they pass**

Run: `cd backend && go test ./internal/services/ -run 'Poll' -v`
Expected: PASS (all `TestCastVote_*`, `TestGetPollForUser_*`, `TestComputePollResults_*`, `TestCurrentPoll_*`).

- [ ] **Step 7: Commit**

```bash
git add backend/internal/models/pollVote.go backend/internal/config/database.go backend/internal/services/poll_service.go backend/internal/services/poll_service_test.go
git commit -m "Add feature poll model and service"
```

---

### Task 2: Poll HTTP handler + routes

**Files:**
- Create: `backend/internal/handlers/poll_handler.go`
- Test: `backend/internal/handlers/poll_handler_test.go`
- Modify: `backend/internal/routes/routes.go`

**Interfaces:**
- Consumes: `services.PollService`, `services.PollStore`, `services.CurrentPoll`, `services.PollView`, `services.ErrGuestCannotVote`, `services.ErrInvalidPollOption`, `services.ErrPollCommentTooLong`; `middleware.GetUserFromContext(r) *models.User`, `middleware.UserContextKey`.
- Produces: `type PollHandler struct { Service *services.PollService }` with `GetPollHandler` and `VoteHandler` (`http.HandlerFunc` signatures). Routes `GET /poll`, `POST /poll/vote`.

- [ ] **Step 1: Write the failing handler tests**

`backend/internal/handlers/poll_handler_test.go`:

```go
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

type memPollStore struct{ votes map[string]*models.PollVote }

func (m *memPollStore) GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error) {
	v, ok := m.votes[pollID+userID.String()]
	if !ok {
		return nil, nil
	}
	return v, nil
}
func (m *memPollStore) UpsertVote(v *models.PollVote) error {
	cp := *v
	m.votes[v.PollID+v.UserID.String()] = &cp
	return nil
}
func (m *memPollStore) CountByOption(pollID string) (map[string]int64, error) {
	out := map[string]int64{}
	for _, v := range m.votes {
		if v.PollID == pollID {
			out[v.OptionKey]++
		}
	}
	return out, nil
}

func newTestPollHandler() *PollHandler {
	return &PollHandler{Service: &services.PollService{
		Store: &memPollStore{votes: map[string]*models.PollVote{}},
		Poll:  services.CurrentPoll,
	}}
}

func withUser(r *http.Request, u *models.User) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), middleware.UserContextKey, u))
}

func postVote(h *PollHandler, u *models.User, body string) *httptest.ResponseRecorder {
	req := withUser(httptest.NewRequest(http.MethodPost, "/poll/vote", strings.NewReader(body)), u)
	rec := httptest.NewRecorder()
	h.VoteHandler(rec, req)
	return rec
}

func TestVoteHandler_GuestForbidden(t *testing.T) {
	rec := postVote(newTestPollHandler(), &models.User{ID: uuid.New(), IsGuest: true}, `{"optionKey":"friends"}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestVoteHandler_BadRequests(t *testing.T) {
	cases := map[string]string{
		"malformed json":  `{"optionKey":`,
		"missing option":  `{}`,
		"unknown option":  `{"optionKey":"bogus"}`,
		"comment too long": `{"optionKey":"friends","comment":"` + strings.Repeat("a", 501) + `"}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			rec := postVote(newTestPollHandler(), &models.User{ID: uuid.New()}, body)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d (%s)", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestVoteHandler_SuccessReturnsView(t *testing.T) {
	rec := postVote(newTestPollHandler(), &models.User{ID: uuid.New()}, `{"optionKey":"cosmetics","comment":"hats"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	var view services.PollView
	if err := json.NewDecoder(rec.Body).Decode(&view); err != nil {
		t.Fatal(err)
	}
	if view.MyVote == nil || view.MyVote.OptionKey != "cosmetics" || view.Results == nil || view.Results.Percentages["cosmetics"] != 100 {
		t.Fatalf("unexpected view: %+v", view)
	}
}

func TestGetPollHandler_ResultsNullBeforeVote(t *testing.T) {
	h := newTestPollHandler()
	req := withUser(httptest.NewRequest(http.MethodGet, "/poll", nil), &models.User{ID: uuid.New()})
	rec := httptest.NewRecorder()
	h.GetPollHandler(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var raw map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&raw); err != nil {
		t.Fatal(err)
	}
	if raw["myVote"] != nil || raw["results"] != nil {
		t.Fatalf("expected null myVote/results, got %v / %v", raw["myVote"], raw["results"])
	}
	if raw["id"] != services.CurrentPoll.ID {
		t.Fatalf("expected poll id %q, got %v", services.CurrentPoll.ID, raw["id"])
	}
}
```

- [ ] **Step 2: Developer runs tests to verify they fail**

Run: `cd backend && go test ./internal/handlers/ -run 'Poll' -v`
Expected: FAIL — `PollHandler` undefined.

- [ ] **Step 3: Implement the handler**

`backend/internal/handlers/poll_handler.go`:

```go
package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

type PollHandler struct {
	Service *services.PollService
}

func writePollJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// GET /poll
func (h *PollHandler) GetPollHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)

	view, err := h.Service.GetPollForUser(user)
	if err != nil {
		http.Error(w, "failed to load poll", http.StatusInternalServerError)
		return
	}
	writePollJSON(w, view)
}

// POST /poll/vote
func (h *PollHandler) VoteHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)

	var req struct {
		OptionKey string `json:"optionKey"`
		Comment   string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	view, err := h.Service.CastVote(user, req.OptionKey, req.Comment)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrGuestCannotVote):
			http.Error(w, err.Error(), http.StatusForbidden)
		case errors.Is(err, services.ErrInvalidPollOption), errors.Is(err, services.ErrPollCommentTooLong):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, "failed to save vote", http.StatusInternalServerError)
		}
		return
	}
	writePollJSON(w, view)
}
```

- [ ] **Step 4: Wire routes**

In `backend/internal/routes/routes.go`:

After `gameStateService := services.NewGameStateService(config.DB)` add:

```go
	pollService := services.NewPollService(config.DB)
```

After `gameStateHandler := &handlers.GameStateHandler{Service: gameStateService}` add:

```go
	pollHandler := &handlers.PollHandler{Service: pollService}
```

Directly before `r.Post("/contact", contactHandler.SendContactHandler)` add:

```go
	r.Route("/poll", func(r chi.Router) {
		r.Use(userMiddleware)
		r.Get("/", pollHandler.GetPollHandler)
		r.With(middleware.StrictRateLimitMiddleware).Post("/vote", pollHandler.VoteHandler)
	})
```

- [ ] **Step 5: Developer runs tests to verify they pass**

Run: `cd backend && go test ./internal/handlers/ -run 'Poll' -v && go vet ./...`
Expected: PASS; vet clean.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handlers/poll_handler.go backend/internal/handlers/poll_handler_test.go backend/internal/routes/routes.go
git commit -m "Add poll endpoints for viewing and casting votes"
```

---

### Task 3: Admin poll results

**Files:**
- Modify: `backend/internal/handlers/admin_handler.go` (append method)
- Modify: `backend/internal/routes/routes.go` (`/admin` group)
- Modify: `backend/internal/handlers/admin.html` (nav tab, section, loader)

**Interfaces:**
- Consumes: `services.CurrentPoll`, `models.PollVote`, `models.User`, `AdminHandler.DB`, `AdminHandler.writeJSON`.
- Produces: `GET /admin/poll` → `{ "pollId", "question", "total", "options": [{"key","label","count"}], "comments": [{"optionKey","comment","username","updatedAt"}] }`.

No automated test: `AdminHandler` queries `*gorm.DB` directly and the repo has no DB test harness (consistent with existing admin endpoints). Verified manually in Step 4.

- [ ] **Step 1: Add the admin endpoint**

Append to `backend/internal/handlers/admin_handler.go`:

```go
// GET /admin/poll — vote counts and comments for the current homepage poll
func (h *AdminHandler) GetPollResults(w http.ResponseWriter, r *http.Request) {
	poll := services.CurrentPoll

	var counts []struct {
		OptionKey string
		Count     int64
	}
	if err := h.DB.Model(&models.PollVote{}).
		Select("option_key, COUNT(*) AS count").
		Where("poll_id = ?", poll.ID).
		Group("option_key").
		Scan(&counts).Error; err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load counts"})
		return
	}
	byKey := map[string]int64{}
	for _, c := range counts {
		byKey[c.OptionKey] = c.Count
	}

	type optionRow struct {
		Key   string `json:"key"`
		Label string `json:"label"`
		Count int64  `json:"count"`
	}
	options := make([]optionRow, 0, len(poll.Options))
	var total int64
	for _, o := range poll.Options {
		options = append(options, optionRow{Key: o.Key, Label: o.Label, Count: byKey[o.Key]})
		total += byKey[o.Key]
	}

	type commentRow struct {
		OptionKey string    `json:"optionKey"`
		Comment   string    `json:"comment"`
		Username  string    `json:"username"`
		UpdatedAt time.Time `json:"updatedAt"`
	}
	comments := []commentRow{}
	if err := h.DB.Table("poll_votes").
		Select("poll_votes.option_key, poll_votes.comment, users.username, poll_votes.updated_at").
		Joins("LEFT JOIN users ON users.id = poll_votes.user_id").
		Where("poll_votes.poll_id = ? AND poll_votes.comment <> ''", poll.ID).
		Order("poll_votes.updated_at DESC").
		Scan(&comments).Error; err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load comments"})
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]any{
		"pollId":   poll.ID,
		"question": poll.Question,
		"total":    total,
		"options":  options,
		"comments": comments,
	})
}
```

(`time`, `models`, `services` are already imported in this file.)

In `routes.go`, inside `r.Route("/admin", ...)` after `r.Post("/sets/{id}/clear-reports", adminHandler.ClearReports)` add:

```go
		r.Get("/poll", adminHandler.GetPollResults)
```

- [ ] **Step 2: Add the admin UI tab and section**

In `admin.html`, in `<nav class="nav">` after the Content tab add:

```html
  <button class="nav-tab" data-section="poll">Poll</button>
```

After the closing `</section>` of `section-content` (before `</main>`) add:

```html
  <!-- Poll -->
  <section id="section-poll" hidden>
    <div class="section-header">
      <div class="section-title" id="poll-title">Feature Poll</div>
      <button class="btn btn-ghost" onclick="loadPoll()">Refresh</button>
    </div>
    <div class="stats-grid" id="poll-counts"></div>
    <div class="section-header" style="margin-top:24px">
      <div class="section-title">Comments</div>
    </div>
    <div id="poll-comments"></div>
  </section>
```

Before the `// ─── Init` comment in the `<script>` add:

```js
// ─── Poll ─────────────────────────────────────────────────────────────────────
async function loadPoll() {
  try {
    const d = await apiFetch('/admin/poll');
    document.getElementById('poll-title').textContent = `${d.question} (${d.total} votes)`;
    document.getElementById('poll-counts').innerHTML = d.options.map(o => {
      const pct = d.total ? Math.round(o.count * 100 / d.total) : 0;
      return `<div class="stat-card"><div class="stat-label">${escHtml(o.label)}</div><div class="stat-value">${o.count} <span style="font-size:13px;color:var(--text-400)">${pct}%</span></div></div>`;
    }).join('');
    const labels = Object.fromEntries(d.options.map(o => [o.key, o.label]));
    const container = document.getElementById('poll-comments');
    if (!d.comments.length) {
      container.innerHTML = '<div class="empty-state">No comments yet.</div>';
      return;
    }
    container.innerHTML = d.comments.map(c => `
      <div class="stat-card" style="margin-bottom:8px">
        <div class="stat-label">${escHtml(c.username || 'unknown')} · ${escHtml(labels[c.optionKey] || c.optionKey)} · ${fmtDateTime(c.updatedAt)}</div>
        <div style="margin-top:4px;white-space:pre-wrap">${escHtml(c.comment)}</div>
      </div>`).join('');
  } catch (e) {
    showToast('Failed to load poll: ' + e.message, 'error');
  }
}
sectionLoaders.poll = loadPoll;
```

Before writing, check that `.stats-grid` is the class used by the Stats section's grid wrapper (`grep -n "stats-grid\|stat-grid" admin.html`) and that `apiFetch` returns parsed JSON and throws on non-OK (read `admin.html:543-558`); adjust the class name / error handling to match what's there.

- [ ] **Step 3: Developer verifies build**

Run: `cd backend && go vet ./... && go test ./...`
Expected: clean / PASS.

- [ ] **Step 4: Developer verifies manually**

With `docker-compose up`: cast a vote as a registered user via `curl` or the UI (after Task 4), open `/admin-ui`, click **Poll** — counts and any comment appear.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/admin_handler.go backend/internal/handlers/admin.html backend/internal/routes/routes.go
git commit -m "Show feature poll results in admin panel"
```

---

### Task 4: FeaturePoll component + homepage placement

**Files:**
- Create: `frontend/src/components/FeaturePoll.js`
- Modify: `frontend/src/app/HomePageClient.js` (import; wrapper `div` at ~line 247; CSS block ~line 218)

**Interfaces:**
- Consumes: `GET /poll` → `{ id, question, options:[{key,label,description}], myVote:{optionKey,comment}|null, results:{total, percentages:{[key]:int}}|null }`; `POST /poll/vote` body `{optionKey, comment}` → same shape (200) or plain-text error (400/403); `UserContext` → `{ user: {id, isGuest}, isLoading }`; `apiFetch` from `@/lib/api`.
- Produces: `export default function FeaturePoll()` — renders `null` when hidden.

- [ ] **Step 1: Read the design schema**

Read `/home/tjraff5/projects/GuessWho/designSchema.txt` in full (required by CLAUDE.md).

- [ ] **Step 2: Create the component**

`frontend/src/components/FeaturePoll.js`:

```jsx
"use client";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UserContext } from "@/context/UserContext";

/* Design tokens — v3.0 schema */
const T = {
  surface0: "#FFFFFF",
  surface1: "#F2EDE7",
  surface2: "#E8E0D8",
  accent: "#D9572B",
  accentLight: "#F2C5B4",
  accentDim: "#B84422",
  text900: "#1A1510",
  text600: "#5C5047",
  text400: "#A0937F",
  border: "#DDD5CA",
  borderStrong: "#C4B8A8",
  stateOut: "#C0392B",
};

const MAX_COMMENT = 500;
const EASE_OUT = [0.0, 0.0, 0.2, 1];

const dismissKey = (pollId) => `poll-dismissed-${pollId}`;

function readDismissed(pollId) {
  try {
    return localStorage.getItem(dismissKey(pollId)) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(pollId) {
  try {
    localStorage.setItem(dismissKey(pollId), "1");
  } catch {}
}

export default function FeaturePoll() {
  const { user, isLoading } = useContext(UserContext);
  const reduceMotion = useReducedMotion();

  const [poll, setPoll] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [mode, setMode] = useState("vote"); // "vote" | "results"
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !user) return;
    let cancelled = false;
    apiFetch("/poll")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPoll(data);
        setDismissed(readDismissed(data.id));
        setMode(data.myVote ? "results" : "vote");
        setSelected(data.myVote?.optionKey ?? null);
        setComment(data.myVote?.comment ?? "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoading, user?.id, user?.isGuest]);

  if (isLoading || !user || !poll || dismissed) return null;

  const isGuest = !!user.isGuest;
  const hasVoted = !!poll.myVote;

  const dismiss = () => {
    writeDismissed(poll.id);
    setDismissed(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch("/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionKey: selected, comment }),
      });
      if (!res.ok) {
        setError((await res.text()).trim() || "Couldn't save your vote");
        return;
      }
      const data = await res.json();
      setPoll(data);
      setComment(data.myVote?.comment ?? "");
      setMode("results");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.aside
      className="feature-poll"
      aria-labelledby="feature-poll-title"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <style>{`
        .feature-poll {
          width: 100%; max-width: 360px;
          background: ${T.surface0}; border: 1px solid ${T.border};
          border-radius: 6px; padding: 24px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .feature-poll__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .feature-poll__eyebrow {
          font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: ${T.accent}; margin-bottom: 4px;
        }
        .feature-poll__title {
          font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700;
          line-height: 1.2; letter-spacing: -0.02em; color: ${T.text900};
        }
        .feature-poll__close {
          flex-shrink: 0; width: 44px; height: 44px; margin: -12px -12px 0 0;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; border-radius: 6px;
          color: ${T.text400}; cursor: pointer;
          transition: color 150ms, background 150ms;
        }
        .feature-poll__close:hover { color: ${T.text900}; background: ${T.surface1}; }
        .feature-poll__close:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }

        .feature-poll__options { display: flex; flex-direction: column; gap: 8px; border: none; }
        .feature-poll__option {
          display: flex; gap: 12px; align-items: flex-start;
          min-height: 44px; padding: 12px;
          background: ${T.surface0}; border: 1px solid ${T.border}; border-radius: 6px;
          cursor: pointer; transition: border-color 150ms, background 150ms;
        }
        .feature-poll__option:hover { border-color: ${T.borderStrong}; background: ${T.surface1}; }
        .feature-poll__option--selected,
        .feature-poll__option--selected:hover { border-color: ${T.accent}; background: ${T.surface1}; }
        .feature-poll__option:focus-within { outline: 2px solid ${T.accent}; outline-offset: 2px; }
        .feature-poll__radio { position: absolute; opacity: 0; width: 1px; height: 1px; }
        .feature-poll__dot {
          flex-shrink: 0; width: 16px; height: 16px; margin-top: 2px;
          border: 1.5px solid ${T.borderStrong}; border-radius: 50%; /* circular radio indicator — explicit exception */
          display: flex; align-items: center; justify-content: center;
        }
        .feature-poll__option--selected .feature-poll__dot { border-color: ${T.accent}; }
        .feature-poll__option--selected .feature-poll__dot::after {
          content: ""; width: 8px; height: 8px; border-radius: 50%; background: ${T.accent};
        }
        .feature-poll__label { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: ${T.text900}; }
        .feature-poll__desc { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; line-height: 1.5; color: ${T.text600}; margin-top: 2px; }

        .feature-poll__comment {
          width: 100%; min-height: 72px; padding: 12px; resize: vertical;
          background: ${T.surface0}; border: 1px solid ${T.border}; border-radius: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.6; color: ${T.text900};
          outline: none; transition: border-color 150ms;
        }
        .feature-poll__comment::placeholder { color: ${T.text400}; }
        .feature-poll__comment:focus { border-color: ${T.accent}; }
        .feature-poll__meta {
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
          color: ${T.text400}; font-variant-numeric: tabular-nums;
        }
        .feature-poll__error { font-family: 'DM Sans', sans-serif; font-size: 12px; color: ${T.stateOut}; }

        .feature-poll__submit {
          height: 44px; padding: 0 24px; align-self: flex-end;
          background: ${T.accent}; border: 1px solid ${T.accent}; border-radius: 6px;
          color: #FFFFFF; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          letter-spacing: 0.02em; cursor: pointer; outline: none;
          transition: background 150ms, border-color 150ms;
        }
        .feature-poll__submit:hover:not(:disabled) { background: ${T.accentDim}; border-color: ${T.accentDim}; }
        .feature-poll__submit:active:not(:disabled) { transform: scale(0.98); }
        .feature-poll__submit:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
        .feature-poll__submit:disabled { opacity: 0.38; cursor: not-allowed; }

        .feature-poll__link {
          background: none; border: none; padding: 0; min-height: 44px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: ${T.accent}; cursor: pointer; text-decoration: none;
          display: inline-flex; align-items: center;
        }
        .feature-poll__link:hover { color: ${T.accentDim}; text-decoration: underline; }
        .feature-poll__link:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; border-radius: 6px; }

        .feature-poll__result { display: flex; flex-direction: column; gap: 6px; }
        .feature-poll__result-row {
          display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: ${T.text900};
        }
        .feature-poll__result-row--mine { font-weight: 600; }
        .feature-poll__pct { font-variant-numeric: tabular-nums; color: ${T.text600}; }
        .feature-poll__track { height: 8px; background: ${T.surface1}; border-radius: 6px; overflow: hidden; }
        .feature-poll__bar { height: 100%; background: ${T.borderStrong}; border-radius: 6px; }
        .feature-poll__bar--mine { background: ${T.accent}; }

        @media (max-width: 1024px) {
          .feature-poll { max-width: 520px; }
        }
      `}</style>

      <div className="feature-poll__head">
        <div>
          <p className="feature-poll__eyebrow">Feature poll</p>
          <h2 id="feature-poll-title" className="feature-poll__title">{poll.question}</h2>
        </div>
        <button type="button" className="feature-poll__close" onClick={dismiss} aria-label="Dismiss poll">
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {isGuest && (
        <>
          <ul className="feature-poll__options" style={{ listStyle: "none" }}>
            {poll.options.map((o) => (
              <li key={o.key} className="feature-poll__option" style={{ cursor: "default" }}>
                <div>
                  <div className="feature-poll__label">{o.label}</div>
                  <div className="feature-poll__desc">{o.description}</div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/signup" className="feature-poll__link">Sign up to vote →</Link>
        </>
      )}

      {!isGuest && mode === "vote" && (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <fieldset className="feature-poll__options">
            <legend className="feature-poll__meta" style={{ marginBottom: 4 }}>Pick one</legend>
            {poll.options.map((o) => {
              const isSel = selected === o.key;
              return (
                <label key={o.key} className={`feature-poll__option${isSel ? " feature-poll__option--selected" : ""}`}>
                  <input
                    type="radio"
                    name="feature-poll"
                    value={o.key}
                    checked={isSel}
                    onChange={() => setSelected(o.key)}
                    className="feature-poll__radio"
                  />
                  <span className="feature-poll__dot" aria-hidden="true" />
                  <span>
                    <span className="feature-poll__label" style={{ display: "block" }}>{o.label}</span>
                    <span className="feature-poll__desc" style={{ display: "block" }}>{o.description}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div>
            <textarea
              className="feature-poll__comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
              maxLength={MAX_COMMENT}
              placeholder="Something else? Tell us (optional)"
              aria-label="Optional comment"
            />
            <div className="feature-poll__meta" style={{ textAlign: "right" }}>
              {comment.length}/{MAX_COMMENT}
            </div>
          </div>

          {error && <p className="feature-poll__error" role="alert">{error}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {hasVoted ? (
              <button type="button" className="feature-poll__link" onClick={() => { setMode("results"); setError(""); }}>
                Cancel
              </button>
            ) : <span />}
            <button type="submit" className="feature-poll__submit" disabled={!selected || submitting}>
              {submitting ? "Saving…" : hasVoted ? "Update vote" : "Vote"}
            </button>
          </div>
        </form>
      )}

      {!isGuest && mode === "results" && poll.results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-live="polite">
          {poll.options.map((o) => {
            const pct = poll.results.percentages[o.key] ?? 0;
            const mine = poll.myVote?.optionKey === o.key;
            return (
              <div key={o.key} className="feature-poll__result">
                <div className={`feature-poll__result-row${mine ? " feature-poll__result-row--mine" : ""}`}>
                  <span>{o.label}{mine && <span className="feature-poll__meta"> · your vote</span>}</span>
                  <span className="feature-poll__pct">{pct}%</span>
                </div>
                <div className="feature-poll__track">
                  <motion.div
                    className={`feature-poll__bar${mine ? " feature-poll__bar--mine" : ""}`}
                    initial={{ width: reduceMotion ? `${pct}%` : 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE_OUT }}
                  />
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span className="feature-poll__meta">
              Thanks for voting · {poll.results.total} {poll.results.total === 1 ? "vote" : "votes"}
            </span>
            <button
              type="button"
              className="feature-poll__link"
              onClick={() => {
                setSelected(poll.myVote?.optionKey ?? null);
                setComment(poll.myVote?.comment ?? "");
                setMode("vote");
              }}
            >
              Change vote
            </button>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
```

- [ ] **Step 3: Place it on the homepage**

In `frontend/src/app/HomePageClient.js`:

Add import after the `Footer` import:

```js
import FeaturePoll from "../components/FeaturePoll";
```

Replace the wrapper `div` that directly contains `content-col` (currently ~line 247):

```jsx
        <div style={{
          width: "100%", margin: "0 auto",
          display: "flex", justifyContent: "center",
        }}>
```

with:

```jsx
        <div className="home-row" style={{
          width: "100%", margin: "0 auto",
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 48,
        }}>
```

Immediately after the closing `</div>` of `content-col` (the one following the trailing divider `<div style={{ height: 1, background: T.border }} />`), and before the wrapper's closing `</div>`, add:

```jsx
          <FeaturePoll />
```

(When `FeaturePoll` returns `null`, the row has one child and `gap` has no effect — layout is identical to today.)

In the `<style>` block, extend the existing `@media (max-width: 1024px)` rule:

```css
        @media (max-width: 1024px) {
          .board-col { display: none !important; }
          .content-col { max-width: 520px !important; }
          .home-row { flex-direction: column; align-items: center !important; gap: 32px !important; }
        }
```

- [ ] **Step 4: Developer verifies**

Run: `cd frontend && npm run lint && npm run build`
Expected: no errors.

Manual check with `docker-compose up`, http://localhost:3080:
- Guest (fresh browser): card to the right of the hero, options listed read-only, "Sign up to vote →" goes to `/signup`.
- Sign in: Vote disabled until an option is picked; vote → results bars with your choice in terracotta, total count.
- "Change vote" → options prefilled, button says "Update vote"; pick another → results update, total unchanged.
- Reload → results state persists.
- Dismiss (✕) → card gone, hero re-centers; reload → still gone. Clear `poll-dismissed-next-feature-2026-10` from localStorage → returns.
- Width ≤ 1024px: card stacks under "Join with code".
- Stop backend → homepage renders normally with no card.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FeaturePoll.js frontend/src/app/HomePageClient.js
git commit -m "Add feature poll card to homepage"
```
