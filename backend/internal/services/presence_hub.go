package services

import (
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Presence statuses, as seen by friends.
const (
	StatusOffline = "offline"
	StatusOnline  = "online"
	StatusInGame  = "in_game"
)

// inGameTTL bounds how long an "in game" flag can outlive a game whose end we
// never heard about (e.g. a lobby deleted by cleanup mid-game).
const inGameTTL = 2 * time.Hour

// PresenceEvent is a message pushed over the site-wide socket.
type PresenceEvent struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type presenceUpdate struct {
	UserID uuid.UUID `json:"userId"`
	Status string    `json:"status"`
}

type FriendLister interface {
	FriendIDs(userID uuid.UUID) ([]uuid.UUID, error)
}

// PresenceHub tracks site-wide connections for signed-up users. It is separate
// from the per-lobby Hub and keeps everything in memory (single backend instance).
type PresenceHub struct {
	mu      sync.Mutex
	conns   map[uuid.UUID]map[chan PresenceEvent]struct{}
	inGame  map[uuid.UUID]time.Time
	friends FriendLister
	now     func() time.Time
}

func NewPresenceHub(friends FriendLister) *PresenceHub {
	return &PresenceHub{
		conns:   make(map[uuid.UUID]map[chan PresenceEvent]struct{}),
		inGame:  make(map[uuid.UUID]time.Time),
		friends: friends,
		now:     time.Now,
	}
}

// Register adds one connection (one browser tab) for a user and returns the
// function that removes it. Friends hear about the first and last connection only.
func (p *PresenceHub) Register(userID uuid.UUID, send chan PresenceEvent) (unregister func()) {
	p.mu.Lock()
	set, ok := p.conns[userID]
	if !ok {
		set = make(map[chan PresenceEvent]struct{})
		p.conns[userID] = set
	}
	first := len(set) == 0
	set[send] = struct{}{}
	status := p.statusLocked(userID)
	p.mu.Unlock()

	if first {
		p.notifyFriends(userID, status)
	}

	var once sync.Once
	return func() {
		once.Do(func() {
			p.mu.Lock()
			delete(p.conns[userID], send)
			last := len(p.conns[userID]) == 0
			if last {
				delete(p.conns, userID)
			}
			p.mu.Unlock()
			if last {
				p.notifyFriends(userID, StatusOffline)
			}
		})
	}
}

func (p *PresenceHub) Status(userID uuid.UUID) string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.statusLocked(userID)
}

func (p *PresenceHub) statusLocked(userID uuid.UUID) string {
	if len(p.conns[userID]) == 0 {
		return StatusOffline
	}
	if since, ok := p.inGame[userID]; ok {
		if p.now().Sub(since) < inGameTTL {
			return StatusInGame
		}
		delete(p.inGame, userID)
	}
	return StatusOnline
}

// SendToUser pushes an event to every open connection of a user. It never
// blocks: a connection whose buffer is full misses the event.
func (p *PresenceHub) SendToUser(userID uuid.UUID, ev PresenceEvent) {
	p.mu.Lock()
	chans := make([]chan PresenceEvent, 0, len(p.conns[userID]))
	for ch := range p.conns[userID] {
		chans = append(chans, ch)
	}
	p.mu.Unlock()
	for _, ch := range chans {
		select {
		case ch <- ev:
		default:
		}
	}
}

// SetInGame marks users as in (or out of) a started game and tells their
// friends when an online user's status changes.
func (p *PresenceHub) SetInGame(userIDs []uuid.UUID, inGame bool) {
	for _, id := range userIDs {
		if id == uuid.Nil {
			continue
		}
		p.mu.Lock()
		before := p.statusLocked(id)
		if inGame {
			p.inGame[id] = p.now()
		} else {
			delete(p.inGame, id)
		}
		after := p.statusLocked(id)
		p.mu.Unlock()
		if before != after {
			p.notifyFriends(id, after)
		}
	}
}

func (p *PresenceHub) notifyFriends(userID uuid.UUID, status string) {
	if p.friends == nil {
		return
	}
	ids, err := p.friends.FriendIDs(userID)
	if err != nil {
		log.Printf("presence: failed to load friends of %s: %v", userID, err)
		return
	}
	ev := PresenceEvent{Type: "presence", Data: presenceUpdate{UserID: userID, Status: status}}
	for _, id := range ids {
		p.SendToUser(id, ev)
	}
}
