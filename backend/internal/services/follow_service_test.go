package services

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

// fakeFollowStore is an in-memory FollowStore keyed on (follower, creator),
// mirroring the composite primary key on the real table.
type fakeFollowStore struct {
	follows    map[[2]uuid.UUID]bool
	registered map[uuid.UUID]bool
}

func newFakeFollowStore() *fakeFollowStore {
	return &fakeFollowStore{follows: map[[2]uuid.UUID]bool{}, registered: map[uuid.UUID]bool{}}
}

func (f *fakeFollowStore) Follow(followerID, creatorID uuid.UUID) error {
	f.follows[[2]uuid.UUID{followerID, creatorID}] = true
	return nil
}

func (f *fakeFollowStore) Unfollow(followerID, creatorID uuid.UUID) error {
	delete(f.follows, [2]uuid.UUID{followerID, creatorID})
	return nil
}

func (f *fakeFollowStore) IsFollowing(followerID, creatorID uuid.UUID) (bool, error) {
	return f.follows[[2]uuid.UUID{followerID, creatorID}], nil
}

func (f *fakeFollowStore) FollowerCount(creatorID uuid.UUID) (int64, error) {
	var n int64
	for k := range f.follows {
		if k[1] == creatorID {
			n++
		}
	}
	return n, nil
}

func (f *fakeFollowStore) FollowedCreators(followerID uuid.UUID) ([]UserSummary, error) {
	out := []UserSummary{}
	for k := range f.follows {
		if k[0] == followerID {
			out = append(out, UserSummary{ID: k[1]})
		}
	}
	return out, nil
}

func (f *fakeFollowStore) UserIsRegistered(id uuid.UUID) (bool, error) {
	return f.registered[id], nil
}

func newTestFollowService() (*FollowService, *fakeFollowStore) {
	store := newFakeFollowStore()
	return &FollowService{Store: store}, store
}

func TestFollow_GuestRejected(t *testing.T) {
	svc, store := newTestFollowService()
	creator := uuid.New()
	store.registered[creator] = true
	guest := &models.User{ID: uuid.New(), IsGuest: true}
	if err := svc.Follow(guest, creator); !errors.Is(err, ErrGuestNotAllowed) {
		t.Fatalf("expected ErrGuestNotAllowed, got %v", err)
	}
}

func TestFollow_SelfRejected(t *testing.T) {
	svc, store := newTestFollowService()
	u := registered()
	store.registered[u.ID] = true
	if err := svc.Follow(u, u.ID); !errors.Is(err, ErrSelf) {
		t.Fatalf("expected ErrSelf, got %v", err)
	}
}

func TestFollow_UnknownOrGuestCreator(t *testing.T) {
	svc, _ := newTestFollowService()
	if err := svc.Follow(registered(), uuid.New()); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("expected ErrUserNotFound, got %v", err)
	}
}

func TestFollow_Idempotent(t *testing.T) {
	svc, store := newTestFollowService()
	creator := uuid.New()
	store.registered[creator] = true
	u := registered()
	if err := svc.Follow(u, creator); err != nil {
		t.Fatal(err)
	}
	if err := svc.Follow(u, creator); err != nil {
		t.Fatal(err)
	}
	if n, _ := store.FollowerCount(creator); n != 1 {
		t.Fatalf("expected 1 follower, got %d", n)
	}
}

func TestUnfollow_NotFollowing_NoError(t *testing.T) {
	svc, _ := newTestFollowService()
	if err := svc.Unfollow(registered(), uuid.New()); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}
