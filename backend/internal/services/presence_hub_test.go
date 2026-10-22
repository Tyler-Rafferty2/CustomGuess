package services

import (
	"testing"

	"github.com/google/uuid"
)

// fakeFriendLister returns a fixed friend list per user.
type fakeFriendLister map[uuid.UUID][]uuid.UUID

func (f fakeFriendLister) FriendIDs(userID uuid.UUID) ([]uuid.UUID, error) { return f[userID], nil }

func mutualFriends(a, b uuid.UUID) fakeFriendLister {
	return fakeFriendLister{a: {b}, b: {a}}
}

// drain returns every event currently buffered on ch.
func drain(ch chan PresenceEvent) []PresenceEvent {
	var out []PresenceEvent
	for {
		select {
		case ev := <-ch:
			out = append(out, ev)
		default:
			return out
		}
	}
}

func onlyPresence(t *testing.T, events []PresenceEvent, userID uuid.UUID, status string) {
	t.Helper()
	if len(events) != 1 {
		t.Fatalf("want 1 event, got %d: %+v", len(events), events)
	}
	u, ok := events[0].Data.(presenceUpdate)
	if events[0].Type != "presence" || !ok || u.UserID != userID || u.Status != status {
		t.Fatalf("want presence{%s,%s}, got %+v", userID, status, events[0])
	}
}

func TestPresenceHub_StaysOnlineUntilLastConnection(t *testing.T) {
	a := uuid.New()
	hub := NewPresenceHub(fakeFriendLister{})
	off1 := hub.Register(a, make(chan PresenceEvent, 8))
	off2 := hub.Register(a, make(chan PresenceEvent, 8))
	off1()
	if got := hub.Status(a); got != StatusOnline {
		t.Fatalf("after closing one of two tabs: want online, got %s", got)
	}
	off1() // calling an unregister twice must not drop the other tab
	if got := hub.Status(a); got != StatusOnline {
		t.Fatalf("double unregister: want online, got %s", got)
	}
	off2()
	if got := hub.Status(a); got != StatusOffline {
		t.Fatalf("after closing last tab: want offline, got %s", got)
	}
}

func TestPresenceHub_NotifiesFriendsOnOnlineOffline(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	hub := NewPresenceHub(mutualFriends(a, b))
	bCh := make(chan PresenceEvent, 8)
	hub.Register(b, bCh)
	drain(bCh)

	offA := hub.Register(a, make(chan PresenceEvent, 8))
	onlyPresence(t, drain(bCh), a, StatusOnline)
	offA()
	onlyPresence(t, drain(bCh), a, StatusOffline)
}

func TestPresenceHub_SecondTabDoesNotRenotify(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	hub := NewPresenceHub(mutualFriends(a, b))
	bCh := make(chan PresenceEvent, 8)
	hub.Register(b, bCh)
	hub.Register(a, make(chan PresenceEvent, 8))
	drain(bCh)

	off := hub.Register(a, make(chan PresenceEvent, 8))
	off()
	if events := drain(bCh); len(events) != 0 {
		t.Fatalf("second tab open/close must not notify friends, got %+v", events)
	}
}

func TestPresenceHub_InGame(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	hub := NewPresenceHub(mutualFriends(a, b))
	bCh := make(chan PresenceEvent, 8)
	hub.Register(b, bCh)
	hub.Register(a, make(chan PresenceEvent, 8))
	drain(bCh)

	hub.SetInGame([]uuid.UUID{a}, true)
	if got := hub.Status(a); got != StatusInGame {
		t.Fatalf("want in_game, got %s", got)
	}
	onlyPresence(t, drain(bCh), a, StatusInGame)

	hub.SetInGame([]uuid.UUID{a}, false)
	onlyPresence(t, drain(bCh), a, StatusOnline)

	c := uuid.New()
	hub.SetInGame([]uuid.UUID{c}, true)
	if got := hub.Status(c); got != StatusOffline {
		t.Fatalf("offline user marked in game: want offline, got %s", got)
	}
}

func TestPresenceHub_SendToUserFullChannelDoesNotBlock(t *testing.T) {
	a := uuid.New()
	hub := NewPresenceHub(fakeFriendLister{})
	ch := make(chan PresenceEvent, 1)
	hub.Register(a, ch)
	hub.SendToUser(a, PresenceEvent{Type: "x"})
	hub.SendToUser(a, PresenceEvent{Type: "y"}) // buffer full: must return, not block
	if events := drain(ch); len(events) != 1 || events[0].Type != "x" {
		t.Fatalf("want only the first event, got %+v", events)
	}
}

// hookedFriendLister runs onLookup (once) in the middle of a FriendIDs call,
// standing in for another connection change that lands during the DB query.
type hookedFriendLister struct {
	friends  fakeFriendLister
	onLookup func()
}

func (h *hookedFriendLister) FriendIDs(userID uuid.UUID) ([]uuid.UUID, error) {
	if hook := h.onLookup; hook != nil {
		h.onLookup = nil
		hook()
	}
	return h.friends.FriendIDs(userID)
}

func TestPresenceHub_ReloadRaceEndsOnCurrentStatus(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	lister := &hookedFriendLister{friends: mutualFriends(a, b)}
	hub := NewPresenceHub(lister)
	bCh := make(chan PresenceEvent, 8)
	hub.Register(b, bCh)
	closeOldTab := hub.Register(a, make(chan PresenceEvent, 8))
	drain(bCh)

	// The old tab closes; while its "offline" lookup runs, the reloaded tab connects.
	lister.onLookup = func() { hub.Register(a, make(chan PresenceEvent, 8)) }
	closeOldTab()

	events := drain(bCh)
	if len(events) == 0 {
		t.Fatal("want presence events for a")
	}
	last := events[len(events)-1].Data.(presenceUpdate)
	if last.UserID != a || last.Status != StatusOnline {
		t.Fatalf("friend's last event must be a=online, got %+v (all: %+v)", last, events)
	}
}
