package services

import (
	"errors"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

// fakeFriendStore is an in-memory FriendStore keyed on (requester, addressee).
type fakeFriendStore struct {
	rows  map[[2]uuid.UUID]*models.Friendship
	users map[uuid.UUID]*models.User
}

func newFakeFriendStore() *fakeFriendStore {
	return &fakeFriendStore{rows: map[[2]uuid.UUID]*models.Friendship{}, users: map[uuid.UUID]*models.User{}}
}

func (f *fakeFriendStore) Get(a, b uuid.UUID) (*models.Friendship, error) {
	if r, ok := f.rows[[2]uuid.UUID{a, b}]; ok {
		cp := *r
		return &cp, nil
	}
	if r, ok := f.rows[[2]uuid.UUID{b, a}]; ok {
		cp := *r
		return &cp, nil
	}
	return nil, nil
}

func (f *fakeFriendStore) Save(fr *models.Friendship) error {
	delete(f.rows, [2]uuid.UUID{fr.AddresseeID, fr.RequesterID})
	cp := *fr
	f.rows[[2]uuid.UUID{fr.RequesterID, fr.AddresseeID}] = &cp
	return nil
}

func (f *fakeFriendStore) Delete(requesterID, addresseeID uuid.UUID) error {
	delete(f.rows, [2]uuid.UUID{requesterID, addresseeID})
	return nil
}

func (f *fakeFriendStore) ListForUser(userID uuid.UUID) ([]models.Friendship, error) {
	out := []models.Friendship{}
	for _, r := range f.rows {
		if r.RequesterID == userID || r.AddresseeID == userID {
			out = append(out, *r)
		}
	}
	return out, nil
}

func (f *fakeFriendStore) Usernames(ids []uuid.UUID) (map[uuid.UUID]string, error) {
	out := map[uuid.UUID]string{}
	for _, id := range ids {
		if u, ok := f.users[id]; ok {
			out[id] = u.Username
		}
	}
	return out, nil
}

func (f *fakeFriendStore) FindRegisteredByUsername(username string) (*models.User, error) {
	for _, u := range f.users {
		if u.Username == username && !u.IsGuest {
			return u, nil
		}
	}
	return nil, nil
}

func (f *fakeFriendStore) UserIsRegistered(id uuid.UUID) (bool, error) {
	u, ok := f.users[id]
	return ok && !u.IsGuest, nil
}

func (f *fakeFriendStore) CountFriends(userID uuid.UUID) (int64, error) {
	var n int64
	for _, r := range f.rows {
		if r.Status == models.FriendshipAccepted && (r.RequesterID == userID || r.AddresseeID == userID) {
			n++
		}
	}
	return n, nil
}

func (f *fakeFriendStore) SearchRegistered(prefix string, excludeID uuid.UUID, limit int) ([]UserSummary, error) {
	out := []UserSummary{}
	for _, u := range f.users {
		if !u.IsGuest && u.ID != excludeID && strings.HasPrefix(strings.ToLower(u.Username), strings.ToLower(prefix)) {
			out = append(out, UserSummary{ID: u.ID, Username: u.Username})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Username < out[j].Username })
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

type friendFixture struct {
	svc   *FriendService
	store *fakeFriendStore
	now   time.Time
}

func newFriendFixture() *friendFixture {
	fx := &friendFixture{store: newFakeFriendStore(), now: time.Date(2026, 10, 22, 12, 0, 0, 0, time.UTC)}
	fx.svc = &FriendService{Store: fx.store, Now: func() time.Time { return fx.now }}
	return fx
}

func (fx *friendFixture) user(name string) *models.User {
	u := &models.User{ID: uuid.New(), Username: name}
	fx.store.users[u.ID] = u
	return u
}

func mustRel(t *testing.T, fx *friendFixture, viewer, target *models.User, want string) {
	t.Helper()
	got, err := fx.svc.Relationship(viewer.ID, target.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("relationship %s→%s: want %q, got %q", viewer.Username, target.Username, want, got)
	}
}

func TestFriend_GuestRejected(t *testing.T) {
	fx := newFriendFixture()
	guest := &models.User{ID: uuid.New(), IsGuest: true}
	other := fx.user("b").ID
	checks := map[string]error{}
	_, checks["Request"] = fx.svc.Request(guest, other)
	_, checks["RequestByUsername"] = fx.svc.RequestByUsername(guest, "b")
	checks["Accept"] = fx.svc.Accept(guest, other)
	checks["Decline"] = fx.svc.Decline(guest, other)
	checks["Cancel"] = fx.svc.Cancel(guest, other)
	checks["Remove"] = fx.svc.Remove(guest, other)
	_, checks["List"] = fx.svc.List(guest)
	for name, err := range checks {
		if !errors.Is(err, ErrGuestNotAllowed) {
			t.Errorf("%s: expected ErrGuestNotAllowed, got %v", name, err)
		}
	}
	if len(fx.store.rows) != 0 {
		t.Fatalf("guest calls must not create rows, got %d", len(fx.store.rows))
	}
}

func TestFriend_RequestThenAccept(t *testing.T) {
	fx := newFriendFixture()
	a, b := fx.user("a"), fx.user("b")
	rel, err := fx.svc.Request(a, b.ID)
	if err != nil || rel != RelOutgoing {
		t.Fatalf("want outgoing, got %q %v", rel, err)
	}
	mustRel(t, fx, b, a, RelIncoming)
	if err := fx.svc.Accept(b, a.ID); err != nil {
		t.Fatal(err)
	}
	mustRel(t, fx, a, b, RelFriends)
	mustRel(t, fx, b, a, RelFriends)
}

func TestFriend_MutualRequestAccepts(t *testing.T) {
	fx := newFriendFixture()
	a, b := fx.user("a"), fx.user("b")
	if _, err := fx.svc.Request(a, b.ID); err != nil {
		t.Fatal(err)
	}
	rel, err := fx.svc.Request(b, a.ID)
	if err != nil || rel != RelFriends {
		t.Fatalf("want friends, got %q %v", rel, err)
	}
	mustRel(t, fx, a, b, RelFriends)
}

func TestFriend_DeclineCooldown(t *testing.T) {
	fx := newFriendFixture()
	a, b := fx.user("a"), fx.user("b")
	fx.svc.Request(a, b.ID)
	if err := fx.svc.Decline(b, a.ID); err != nil {
		t.Fatal(err)
	}
	mustRel(t, fx, a, b, RelNone)

	fx.now = fx.now.Add(time.Hour)
	if _, err := fx.svc.Request(a, b.ID); !errors.Is(err, ErrRequestCooldown) {
		t.Fatalf("expected ErrRequestCooldown at +1h, got %v", err)
	}

	fx.now = fx.now.Add(24 * time.Hour)
	rel, err := fx.svc.Request(a, b.ID)
	if err != nil || rel != RelOutgoing {
		t.Fatalf("want outgoing at +25h, got %q %v", rel, err)
	}
}

func TestFriend_SelfRequest(t *testing.T) {
	fx := newFriendFixture()
	a := fx.user("a")
	if _, err := fx.svc.Request(a, a.ID); !errors.Is(err, ErrSelf) {
		t.Fatalf("expected ErrSelf, got %v", err)
	}
}

func TestFriend_RequestByUsername_Unknown(t *testing.T) {
	fx := newFriendFixture()
	a := fx.user("a")
	g := fx.user("guesty")
	g.IsGuest = true
	if _, err := fx.svc.RequestByUsername(a, "nobody"); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("unknown: expected ErrUserNotFound, got %v", err)
	}
	if _, err := fx.svc.RequestByUsername(a, "guesty"); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("guest: expected ErrUserNotFound, got %v", err)
	}
}

func TestFriend_AcceptWithoutPending(t *testing.T) {
	fx := newFriendFixture()
	a, b := fx.user("a"), fx.user("b")
	if err := fx.svc.Accept(b, a.ID); !errors.Is(err, ErrNoPendingRequest) {
		t.Fatalf("expected ErrNoPendingRequest, got %v", err)
	}
	// The requester cannot accept their own outgoing request.
	fx.svc.Request(a, b.ID)
	if err := fx.svc.Accept(a, b.ID); !errors.Is(err, ErrNoPendingRequest) {
		t.Fatalf("requester accepting own request: expected ErrNoPendingRequest, got %v", err)
	}
}

func TestFriend_Remove(t *testing.T) {
	fx := newFriendFixture()
	a, b := fx.user("a"), fx.user("b")
	fx.svc.Request(a, b.ID)
	fx.svc.Accept(b, a.ID)
	if err := fx.svc.Remove(b, a.ID); err != nil {
		t.Fatal(err)
	}
	mustRel(t, fx, a, b, RelNone)
	mustRel(t, fx, b, a, RelNone)
}

func TestFriend_ListSplitsByState(t *testing.T) {
	fx := newFriendFixture()
	a, b, c, d := fx.user("a"), fx.user("b"), fx.user("c"), fx.user("d")
	fx.svc.Request(a, b.ID)
	fx.svc.Accept(b, a.ID)
	fx.svc.Request(c, a.ID)
	fx.svc.Request(a, d.ID)
	list, err := fx.svc.List(a)
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Friends) != 1 || list.Friends[0].Username != "b" || list.Friends[0].Status != "offline" {
		t.Fatalf("friends: %+v", list.Friends)
	}
	if len(list.Incoming) != 1 || list.Incoming[0].Username != "c" {
		t.Fatalf("incoming: %+v", list.Incoming)
	}
	if len(list.Outgoing) != 1 || list.Outgoing[0].Username != "d" {
		t.Fatalf("outgoing: %+v", list.Outgoing)
	}
}

func TestSearchUsers_PrefixMatchWithRelationships(t *testing.T) {
	fx := newFriendFixture()
	me := fx.user("tyler")
	friend, pending, stranger := fx.user("Tyra"), fx.user("tyson"), fx.user("tycho")
	fx.user("betty")
	g := fx.user("tyguest")
	g.IsGuest = true
	fx.svc.Request(me, friend.ID)
	fx.svc.Accept(friend, me.ID)
	fx.svc.Request(pending, me.ID)

	results, err := fx.svc.SearchUsers(me, "TY")
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]string{}
	for _, r := range results {
		got[r.Username] = r.Relationship
	}
	want := map[string]string{"Tyra": RelFriends, "tyson": RelIncoming, "tycho": RelNone}
	if len(got) != len(want) {
		t.Fatalf("want %v, got %v (self, guests and non-prefix matches must be excluded)", want, got)
	}
	for name, rel := range want {
		if got[name] != rel {
			t.Errorf("%s: want %q, got %q", name, rel, got[name])
		}
	}
	_ = stranger
}

func TestSearchUsers_ShortQueryReturnsNothing(t *testing.T) {
	fx := newFriendFixture()
	me := fx.user("tyler")
	fx.user("tycho")
	results, err := fx.svc.SearchUsers(me, " t ")
	if err != nil || len(results) != 0 {
		t.Fatalf("want no results for 1-char query, got %v %v", results, err)
	}
}

func TestSearchUsers_LimitsResults(t *testing.T) {
	fx := newFriendFixture()
	me := fx.user("me")
	for i := 0; i < 12; i++ {
		fx.user("player" + string(rune('a'+i)))
	}
	results, _ := fx.svc.SearchUsers(me, "pl")
	if len(results) != 8 {
		t.Fatalf("want 8 results, got %d", len(results))
	}
}

func TestSearchUsers_GuestRejected(t *testing.T) {
	fx := newFriendFixture()
	guest := &models.User{ID: uuid.New(), IsGuest: true}
	if _, err := fx.svc.SearchUsers(guest, "ty"); !errors.Is(err, ErrGuestNotAllowed) {
		t.Fatalf("expected ErrGuestNotAllowed, got %v", err)
	}
}

func TestEscapeLike(t *testing.T) {
	if got := escapeLike(`50%_off\`); got != `50\%\_off\\` {
		t.Fatalf("escapeLike: got %q", got)
	}
}
