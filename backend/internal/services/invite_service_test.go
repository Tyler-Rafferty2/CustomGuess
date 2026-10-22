package services

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

// fakeInviteLobbies records calls and serves canned lobby state. fullAtJoin
// and startedAtLeave simulate another request winning a race mid-accept.
type fakeInviteLobbies struct {
	lobbies map[uuid.UUID]InviteLobby
	current map[uuid.UUID]struct {
		lobby   uuid.UUID
		started bool
	}
	fullAtJoin     bool
	startedAtLeave bool
	left           []uuid.UUID
	joined         []string
}

func newFakeInviteLobbies() *fakeInviteLobbies {
	return &fakeInviteLobbies{
		lobbies: map[uuid.UUID]InviteLobby{},
		current: map[uuid.UUID]struct {
			lobby   uuid.UUID
			started bool
		}{},
	}
}

func (f *fakeInviteLobbies) InviteLobbyInfo(id uuid.UUID) (InviteLobby, error) {
	l, ok := f.lobbies[id]
	if !ok {
		return InviteLobby{}, errors.New("not found")
	}
	return l, nil
}

func (f *fakeInviteLobbies) CurrentLobby(user *models.User) (uuid.UUID, bool, bool, error) {
	c, ok := f.current[user.ID]
	return c.lobby, c.started, ok, nil
}

func (f *fakeInviteLobbies) JoinFromInvite(user *models.User, leaveLobbyID uuid.UUID, code string) error {
	if f.fullAtJoin {
		return ErrLobbyFull
	}
	if leaveLobbyID != uuid.Nil {
		if f.startedAtLeave {
			return ErrInGame
		}
		f.left = append(f.left, leaveLobbyID)
		delete(f.current, user.ID)
	}
	f.joined = append(f.joined, code)
	return nil
}

type inviteFixture struct {
	svc      *InviteService
	lobbies  *fakeInviteLobbies
	presence *PresenceHub
	from, to *models.User
	fromCh   chan PresenceEvent
	toCh     chan PresenceEvent
	lobbyID  uuid.UUID
}

// newInviteFixture sets up two friends, both online, and a private waiting lobby owned by `from`.
func newInviteFixture(ttl time.Duration) *inviteFixture {
	ffx := newFriendFixture()
	from, to := ffx.user("alice"), ffx.user("bob")
	ffx.svc.Request(from, to.ID)
	ffx.svc.Accept(to, from.ID)

	fx := &inviteFixture{
		lobbies:  newFakeInviteLobbies(),
		presence: NewPresenceHub(fakeFriendLister{}),
		from:     from,
		to:       to,
		fromCh:   make(chan PresenceEvent, 16),
		toCh:     make(chan PresenceEvent, 16),
		lobbyID:  uuid.New(),
	}
	fx.presence.Register(from.ID, fx.fromCh)
	fx.presence.Register(to.ID, fx.toCh)
	fx.lobbies.lobbies[fx.lobbyID] = InviteLobby{ID: fx.lobbyID, Code: "ABC123", CreatorUserID: from.ID, PlayerCount: 1, Private: true, SetName: "Office"}
	fx.svc = NewInviteService(fx.lobbies, fx.presence, ffx.svc, ttl)
	return fx
}

func (fx *inviteFixture) send(t *testing.T) *Invite {
	t.Helper()
	inv, err := fx.svc.Send(fx.from, fx.to.ID, fx.lobbyID)
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	drain(fx.toCh)
	return inv
}

func resolvedOutcome(events []PresenceEvent) string {
	for _, ev := range events {
		if ev.Type == "invite_resolved" {
			return ev.Data.(inviteEvent).Outcome
		}
	}
	return ""
}

func TestInvite_NotFriends_Rejected(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	stranger := &models.User{ID: uuid.New(), Username: "carol"}
	fx.presence.Register(stranger.ID, make(chan PresenceEvent, 4))
	if _, err := fx.svc.Send(fx.from, stranger.ID, fx.lobbyID); !errors.Is(err, ErrNotFriends) {
		t.Fatalf("expected ErrNotFriends, got %v", err)
	}
}

func TestInvite_RecipientOffline_Rejected(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	fx.presence = NewPresenceHub(fakeFriendLister{})
	fx.svc.presence = fx.presence
	if _, err := fx.svc.Send(fx.from, fx.to.ID, fx.lobbyID); !errors.Is(err, ErrFriendUnavailable) {
		t.Fatalf("expected ErrFriendUnavailable, got %v", err)
	}
}

func TestInvite_RecipientInGame_Rejected(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	fx.presence.SetInGame([]uuid.UUID{fx.to.ID}, true)
	if _, err := fx.svc.Send(fx.from, fx.to.ID, fx.lobbyID); !errors.Is(err, ErrFriendUnavailable) {
		t.Fatalf("expected ErrFriendUnavailable, got %v", err)
	}
}

func TestInvite_NotCreatorOrNotWaiting_Rejected(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	l := fx.lobbies.lobbies[fx.lobbyID]
	l.CreatorUserID = uuid.New()
	fx.lobbies.lobbies[fx.lobbyID] = l
	if _, err := fx.svc.Send(fx.from, fx.to.ID, fx.lobbyID); !errors.Is(err, ErrInviteLobbyInvalid) {
		t.Fatalf("not creator: expected ErrInviteLobbyInvalid, got %v", err)
	}
	l.CreatorUserID = fx.from.ID
	l.PlayerCount = 2
	fx.lobbies.lobbies[fx.lobbyID] = l
	if _, err := fx.svc.Send(fx.from, fx.to.ID, fx.lobbyID); !errors.Is(err, ErrInviteLobbyInvalid) {
		t.Fatalf("full lobby: expected ErrInviteLobbyInvalid, got %v", err)
	}
}

func TestInvite_PublicLobbyAllowed(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	l := fx.lobbies.lobbies[fx.lobbyID]
	l.Private = false
	fx.lobbies.lobbies[fx.lobbyID] = l
	if _, err := fx.svc.Send(fx.from, fx.to.ID, fx.lobbyID); err != nil {
		t.Fatalf("public waiting lobby should accept invites, got %v", err)
	}
}

func TestInvite_SendPushesToRecipient(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	if _, err := fx.svc.Send(fx.from, fx.to.ID, fx.lobbyID); err != nil {
		t.Fatal(err)
	}
	events := drain(fx.toCh)
	if len(events) != 1 || events[0].Type != "invite_received" {
		t.Fatalf("want invite_received, got %+v", events)
	}
	inv := events[0].Data.(Invite)
	if inv.From.Username != "alice" || inv.SetName != "Office" || inv.LobbyID != fx.lobbyID {
		t.Fatalf("unexpected invite payload %+v", inv)
	}
}

func TestInvite_AcceptJoins(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	inv := fx.send(t)
	lobbyID, err := fx.svc.Accept(fx.to, inv.ID, false)
	if err != nil || lobbyID != fx.lobbyID {
		t.Fatalf("accept: %v %v", lobbyID, err)
	}
	if len(fx.lobbies.joined) != 1 || fx.lobbies.joined[0] != "ABC123" {
		t.Fatalf("want join with lobby code, got %v", fx.lobbies.joined)
	}
	if got := resolvedOutcome(drain(fx.fromCh)); got != "accepted" {
		t.Fatalf("sender: want accepted, got %q", got)
	}
	if _, err := fx.svc.Accept(fx.to, inv.ID, false); !errors.Is(err, ErrInviteGone) {
		t.Fatalf("second accept: expected ErrInviteGone, got %v", err)
	}
}

func TestInvite_AcceptWhileWaiting_NeedsLeave(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	own := uuid.New()
	fx.lobbies.current[fx.to.ID] = struct {
		lobby   uuid.UUID
		started bool
	}{own, false}
	inv := fx.send(t)

	_, err := fx.svc.Accept(fx.to, inv.ID, false)
	var needs *NeedsLeaveError
	if !errors.As(err, &needs) || needs.LobbyID != own {
		t.Fatalf("expected NeedsLeaveError{%s}, got %v", own, err)
	}
	if len(fx.lobbies.left) != 0 || len(fx.lobbies.joined) != 0 {
		t.Fatal("must not leave or join before the user confirms")
	}

	if _, err := fx.svc.Accept(fx.to, inv.ID, true); err != nil {
		t.Fatalf("accept with leaveCurrent: %v", err)
	}
	if len(fx.lobbies.left) != 1 || fx.lobbies.left[0] != own || len(fx.lobbies.joined) != 1 {
		t.Fatalf("want leave(%s) then join, got left=%v joined=%v", own, fx.lobbies.left, fx.lobbies.joined)
	}
}

func TestInvite_AcceptWhileInStartedGame_Refused(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	inv := fx.send(t)
	fx.lobbies.current[fx.to.ID] = struct {
		lobby   uuid.UUID
		started bool
	}{uuid.New(), true}
	if _, err := fx.svc.Accept(fx.to, inv.ID, true); !errors.Is(err, ErrInGame) {
		t.Fatalf("expected ErrInGame, got %v", err)
	}
	if len(fx.lobbies.left) != 0 || len(fx.lobbies.joined) != 0 {
		t.Fatalf("must never leave a started game or join: left=%v joined=%v", fx.lobbies.left, fx.lobbies.joined)
	}
}

func TestInvite_AcceptAfterLobbyFull_DoesNotLeaveCurrent(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	own := uuid.New()
	fx.lobbies.current[fx.to.ID] = struct {
		lobby   uuid.UUID
		started bool
	}{own, false}
	inv := fx.send(t)
	l := fx.lobbies.lobbies[fx.lobbyID]
	l.PlayerCount = 2
	fx.lobbies.lobbies[fx.lobbyID] = l

	if _, err := fx.svc.Accept(fx.to, inv.ID, true); !errors.Is(err, ErrInviteGone) {
		t.Fatalf("expected ErrInviteGone, got %v", err)
	}
	if len(fx.lobbies.left) != 0 || len(fx.lobbies.joined) != 0 {
		t.Fatalf("dead invite must not cost the user their lobby: left=%v joined=%v", fx.lobbies.left, fx.lobbies.joined)
	}
}

func TestInvite_Expires(t *testing.T) {
	fx := newInviteFixture(20 * time.Millisecond)
	inv := fx.send(t)
	drain(fx.fromCh)
	time.Sleep(80 * time.Millisecond)

	if _, err := fx.svc.Accept(fx.to, inv.ID, false); !errors.Is(err, ErrInviteGone) {
		t.Fatalf("expected ErrInviteGone after ttl, got %v", err)
	}
	if got := resolvedOutcome(drain(fx.fromCh)); got != "expired" {
		t.Fatalf("sender: want expired, got %q", got)
	}
	if got := resolvedOutcome(drain(fx.toCh)); got != "expired" {
		t.Fatalf("recipient: want expired, got %q", got)
	}
}

func TestInvite_ResendReplacesPrevious(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	first := fx.send(t)
	second := fx.send(t)
	if _, err := fx.svc.Accept(fx.to, first.ID, false); !errors.Is(err, ErrInviteGone) {
		t.Fatalf("old invite: expected ErrInviteGone, got %v", err)
	}
	if _, err := fx.svc.Accept(fx.to, second.ID, false); err != nil {
		t.Fatalf("new invite: %v", err)
	}
}

func TestInvite_DeclineNotifiesSender(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	inv := fx.send(t)
	drain(fx.fromCh)
	if err := fx.svc.Decline(fx.to, inv.ID); err != nil {
		t.Fatal(err)
	}
	if got := resolvedOutcome(drain(fx.fromCh)); got != "declined" {
		t.Fatalf("sender: want declined, got %q", got)
	}
}

func TestInvite_SeatTakenDuringAccept_KeepsOwnLobbyAndNotifiesSender(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	own := uuid.New()
	fx.lobbies.current[fx.to.ID] = struct {
		lobby   uuid.UUID
		started bool
	}{own, false}
	inv := fx.send(t)
	drain(fx.fromCh)
	fx.lobbies.fullAtJoin = true

	if _, err := fx.svc.Accept(fx.to, inv.ID, true); !errors.Is(err, ErrInviteGone) {
		t.Fatalf("expected ErrInviteGone, got %v", err)
	}
	if len(fx.lobbies.left) != 0 {
		t.Fatalf("a full lobby must not cost the user their own: left=%v", fx.lobbies.left)
	}
	if got := resolvedOutcome(drain(fx.fromCh)); got != "expired" {
		t.Fatalf("sender must be told so they can re-invite, got %q", got)
	}
}

func TestInvite_GameStartsDuringLeave_Refused(t *testing.T) {
	fx := newInviteFixture(time.Minute)
	fx.lobbies.current[fx.to.ID] = struct {
		lobby   uuid.UUID
		started bool
	}{uuid.New(), false}
	inv := fx.send(t)
	drain(fx.fromCh)
	fx.lobbies.startedAtLeave = true

	if _, err := fx.svc.Accept(fx.to, inv.ID, true); !errors.Is(err, ErrInGame) {
		t.Fatalf("expected ErrInGame, got %v", err)
	}
	if len(fx.lobbies.left) != 0 || len(fx.lobbies.joined) != 0 {
		t.Fatalf("must not leave or join: left=%v joined=%v", fx.lobbies.left, fx.lobbies.joined)
	}
	if got := resolvedOutcome(drain(fx.fromCh)); got != "expired" {
		t.Fatalf("sender: want expired, got %q", got)
	}
}
