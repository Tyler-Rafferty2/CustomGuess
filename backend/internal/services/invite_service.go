package services

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
)

const InviteTTL = 60 * time.Second

var (
	ErrNotFriends         = errors.New("you can only invite friends")
	ErrFriendUnavailable  = errors.New("that friend isn't available right now")
	ErrInviteLobbyInvalid = errors.New("invites need a private lobby you created that is still waiting for a player")
	ErrInviteGone         = errors.New("this invite is no longer available")
	ErrInGame             = errors.New("you're in a game")
)

// NeedsLeaveError means the recipient is waiting in another lobby and must
// confirm leaving it before accepting.
type NeedsLeaveError struct {
	LobbyID uuid.UUID
}

func (e *NeedsLeaveError) Error() string { return "leave your current lobby to accept" }

type Invite struct {
	ID        string      `json:"id"`
	From      UserSummary `json:"from"`
	ToUserID  uuid.UUID   `json:"toUserId"`
	LobbyID   uuid.UUID   `json:"lobbyId"`
	SetName   string      `json:"setName"`
	ExpiresAt time.Time   `json:"expiresAt"`
}

type InviteLobby struct {
	ID            uuid.UUID
	Code          string
	CreatorUserID uuid.UUID
	PlayerCount   int
	Private       bool
	Started       bool
	GameOver      bool
	SetName       string
}

func (l InviteLobby) joinable() bool {
	return !l.Started && !l.GameOver && l.PlayerCount < 2
}

// InviteLobbies is the slice of lobby behaviour invites need.
type InviteLobbies interface {
	InviteLobbyInfo(lobbyID uuid.UUID) (InviteLobby, error)
	// CurrentLobby reports the user's unfinished lobby, if any, and whether its game has started.
	CurrentLobby(user *models.User) (lobbyID uuid.UUID, started bool, found bool, err error)
	// LeaveWaitingLobby leaves a lobby whose game has not started; it refuses a started game.
	LeaveWaitingLobby(user *models.User, lobbyID uuid.UUID) error
	Join(user *models.User, code string) error
}

type inviteEvent struct {
	InviteID string `json:"inviteId"`
	Outcome  string `json:"outcome"` // "accepted" | "declined" | "expired"
}

type pendingInvite struct {
	Invite
	timer *time.Timer
}

// InviteService keeps game invites in memory; they live for ttl and are
// pushed to users over the presence socket.
type InviteService struct {
	lobbies  InviteLobbies
	presence *PresenceHub
	friends  *FriendService
	ttl      time.Duration

	mu      sync.Mutex
	pending map[string]*pendingInvite
}

func NewInviteService(lobbies InviteLobbies, presence *PresenceHub, friends *FriendService, ttl time.Duration) *InviteService {
	return &InviteService{lobbies: lobbies, presence: presence, friends: friends, ttl: ttl, pending: make(map[string]*pendingInvite)}
}

func (s *InviteService) Send(from *models.User, toUserID, lobbyID uuid.UUID) (*Invite, error) {
	if from.IsGuest {
		return nil, ErrGuestNotAllowed
	}
	rel, err := s.friends.Relationship(from.ID, toUserID)
	if err != nil {
		return nil, err
	}
	if rel != RelFriends {
		return nil, ErrNotFriends
	}
	if s.presence.Status(toUserID) != StatusOnline {
		return nil, ErrFriendUnavailable
	}
	info, err := s.lobbies.InviteLobbyInfo(lobbyID)
	if err != nil || info.CreatorUserID != from.ID || !info.Private || !info.joinable() {
		return nil, ErrInviteLobbyInvalid
	}

	inv := &pendingInvite{Invite: Invite{
		ID:        uuid.NewString(),
		From:      UserSummary{ID: from.ID, Username: from.Username},
		ToUserID:  toUserID,
		LobbyID:   lobbyID,
		SetName:   info.SetName,
		ExpiresAt: time.Now().Add(s.ttl),
	}}

	s.mu.Lock()
	// One pending invite per sender→recipient pair: a new one replaces the old.
	for id, old := range s.pending {
		if old.From.ID == from.ID && old.ToUserID == toUserID {
			old.timer.Stop()
			delete(s.pending, id)
		}
	}
	inviteID := inv.ID
	inv.timer = time.AfterFunc(s.ttl, func() { s.expire(inviteID) })
	s.pending[inv.ID] = inv
	s.mu.Unlock()

	s.presence.SendToUser(toUserID, PresenceEvent{Type: "invite_received", Data: inv.Invite})
	out := inv.Invite
	return &out, nil
}

// take removes and returns an invite addressed to userID, or nil.
func (s *InviteService) take(inviteID string, userID uuid.UUID) *pendingInvite {
	s.mu.Lock()
	defer s.mu.Unlock()
	inv, ok := s.pending[inviteID]
	if !ok || inv.ToUserID != userID {
		return nil
	}
	inv.timer.Stop()
	delete(s.pending, inviteID)
	return inv
}

func (s *InviteService) peek(inviteID string, userID uuid.UUID) (Invite, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	inv, ok := s.pending[inviteID]
	if !ok || inv.ToUserID != userID {
		return Invite{}, false
	}
	return inv.Invite, true
}

func (s *InviteService) expire(inviteID string) {
	s.mu.Lock()
	inv, ok := s.pending[inviteID]
	if ok {
		delete(s.pending, inviteID)
	}
	s.mu.Unlock()
	if !ok {
		return
	}
	ev := PresenceEvent{Type: "invite_resolved", Data: inviteEvent{InviteID: inviteID, Outcome: "expired"}}
	s.presence.SendToUser(inv.From.ID, ev)
	s.presence.SendToUser(inv.ToUserID, ev)
}

// Accept joins the inviter's lobby. If the user is waiting in another lobby it
// returns *NeedsLeaveError unless leaveCurrent is set; it never touches a started game.
func (s *InviteService) Accept(user *models.User, inviteID string, leaveCurrent bool) (uuid.UUID, error) {
	inv, ok := s.peek(inviteID, user.ID)
	if !ok {
		return uuid.Nil, ErrInviteGone
	}

	// Check the target first so a dead invite never costs the user their own lobby.
	info, err := s.lobbies.InviteLobbyInfo(inv.LobbyID)
	if err != nil || !info.joinable() {
		s.take(inviteID, user.ID)
		return uuid.Nil, ErrInviteGone
	}

	current, started, found, err := s.lobbies.CurrentLobby(user)
	if err != nil {
		return uuid.Nil, err
	}
	alreadyThere := found && current == inv.LobbyID
	mustLeave := found && !alreadyThere
	if mustLeave && started {
		return uuid.Nil, ErrInGame
	}
	if mustLeave && !leaveCurrent {
		return uuid.Nil, &NeedsLeaveError{LobbyID: current}
	}

	// Claim the invite before leaving anything, so an expiry can't strand the user.
	if s.take(inviteID, user.ID) == nil {
		return uuid.Nil, ErrInviteGone
	}
	if mustLeave {
		if err := s.lobbies.LeaveWaitingLobby(user, current); err != nil {
			return uuid.Nil, err
		}
	}
	if !alreadyThere {
		if err := s.lobbies.Join(user, info.Code); err != nil {
			return uuid.Nil, ErrInviteGone
		}
	}
	s.presence.SendToUser(inv.From.ID, PresenceEvent{Type: "invite_resolved", Data: inviteEvent{InviteID: inviteID, Outcome: "accepted"}})
	return inv.LobbyID, nil
}

// Decline is a no-op for invites that already expired.
func (s *InviteService) Decline(user *models.User, inviteID string) error {
	inv := s.take(inviteID, user.ID)
	if inv == nil {
		return nil
	}
	s.presence.SendToUser(inv.From.ID, PresenceEvent{Type: "invite_resolved", Data: inviteEvent{InviteID: inviteID, Outcome: "declined"}})
	return nil
}

// lobbyInvites adapts LobbyService to InviteLobbies.
type lobbyInvites struct {
	*LobbyService
}

func NewLobbyInvites(ls *LobbyService) InviteLobbies { return lobbyInvites{ls} }

func (l lobbyInvites) InviteLobbyInfo(lobbyID uuid.UUID) (InviteLobby, error) {
	var lobby models.Lobby
	if err := l.DB.Preload("Players").Preload("CharacterSet", func(db *gorm.DB) *gorm.DB {
		return db.Select("id", "name")
	}).First(&lobby, "id = ?", lobbyID).Error; err != nil {
		return InviteLobby{}, err
	}
	return InviteLobby{
		ID:            lobby.ID,
		Code:          lobby.Code,
		CreatorUserID: lobby.UserID,
		PlayerCount:   len(lobby.Players),
		Private:       lobby.Private,
		Started:       lobby.GameStartedAt != nil,
		GameOver:      lobby.GameOver,
		SetName:       lobby.CharacterSet.Name,
	}, nil
}

func (l lobbyInvites) CurrentLobby(user *models.User) (uuid.UUID, bool, bool, error) {
	player, err := l.GetPlayerByUser(user)
	if err != nil || player == nil {
		return uuid.Nil, false, false, err
	}
	var lobby models.Lobby
	if err := l.DB.Select("id", "game_started_at").First(&lobby, "id = ?", player.LobbyID).Error; err != nil {
		return uuid.Nil, false, false, err
	}
	return lobby.ID, lobby.GameStartedAt != nil, true, nil
}

func (l lobbyInvites) LeaveWaitingLobby(user *models.User, lobbyID uuid.UUID) error {
	var lobby models.Lobby
	if err := l.DB.Select("id", "game_started_at").First(&lobby, "id = ?", lobbyID).Error; err != nil {
		return err
	}
	if lobby.GameStartedAt != nil {
		return ErrInGame
	}
	_, err := l.ForfeitLobby(user, lobbyID)
	return err
}

func (l lobbyInvites) Join(user *models.User, code string) error {
	_, err := l.JoinLobby(user, code)
	return err
}
