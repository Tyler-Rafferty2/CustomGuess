package services

import (
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
)

// Relationship of a target user as seen by a viewer.
const (
	RelNone     = "none"
	RelOutgoing = "outgoing" // viewer sent a request
	RelIncoming = "incoming" // target sent the viewer a request
	RelFriends  = "friends"
	RelSelf     = "self"
)

// declineCooldown is how long a declined requester must wait before asking again.
const declineCooldown = 24 * time.Hour

var (
	ErrRequestCooldown  = errors.New("you can send another request later")
	ErrNoPendingRequest = errors.New("no pending request")
)

type FriendStore interface {
	// Get returns the row for the pair in either direction, or (nil, nil) if none.
	Get(a, b uuid.UUID) (*models.Friendship, error)
	// Save writes the row and removes any row for the reverse direction.
	Save(f *models.Friendship) error
	Delete(requesterID, addresseeID uuid.UUID) error
	ListForUser(userID uuid.UUID) ([]models.Friendship, error)
	Usernames(ids []uuid.UUID) (map[uuid.UUID]string, error)
	// FindRegisteredByUsername returns (nil, nil) when no non-guest user has that name.
	FindRegisteredByUsername(username string) (*models.User, error)
	UserIsRegistered(id uuid.UUID) (bool, error)
	CountFriends(userID uuid.UUID) (int64, error)
}

type gormFriendStore struct {
	db *gorm.DB
}

func (g *gormFriendStore) Get(a, b uuid.UUID) (*models.Friendship, error) {
	var f models.Friendship
	err := g.db.Where("(requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)", a, b, b, a).
		First(&f).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (g *gormFriendStore) Save(f *models.Friendship) error {
	return g.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("requester_id = ? AND addressee_id = ?", f.AddresseeID, f.RequesterID).
			Delete(&models.Friendship{}).Error; err != nil {
			return err
		}
		return tx.Save(f).Error
	})
}

func (g *gormFriendStore) Delete(requesterID, addresseeID uuid.UUID) error {
	return g.db.Where("requester_id = ? AND addressee_id = ?", requesterID, addresseeID).
		Delete(&models.Friendship{}).Error
}

func (g *gormFriendStore) ListForUser(userID uuid.UUID) ([]models.Friendship, error) {
	var rows []models.Friendship
	err := g.db.Where("(requester_id = ? OR addressee_id = ?) AND status IN ?", userID, userID,
		[]string{models.FriendshipPending, models.FriendshipAccepted}).
		Find(&rows).Error
	return rows, err
}

func (g *gormFriendStore) Usernames(ids []uuid.UUID) (map[uuid.UUID]string, error) {
	out := make(map[uuid.UUID]string, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	var rows []UserSummary
	if err := g.db.Model(&models.User{}).Select("id, username").Where("id IN ?", ids).Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		out[r.ID] = r.Username
	}
	return out, nil
}

func (g *gormFriendStore) FindRegisteredByUsername(username string) (*models.User, error) {
	var u models.User
	err := g.db.Where("LOWER(username) = LOWER(?) AND is_guest = ?", username, false).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (g *gormFriendStore) UserIsRegistered(id uuid.UUID) (bool, error) {
	return userIsRegistered(g.db, id)
}

func (g *gormFriendStore) CountFriends(userID uuid.UUID) (int64, error) {
	var n int64
	err := g.db.Model(&models.Friendship{}).
		Where("(requester_id = ? OR addressee_id = ?) AND status = ?", userID, userID, models.FriendshipAccepted).
		Count(&n).Error
	return n, err
}

type FriendEntry struct {
	UserSummary
	Status string `json:"status"` // "online" | "in_game" | "offline"
}

type FriendList struct {
	Friends  []FriendEntry `json:"friends"`
	Incoming []UserSummary `json:"incoming"`
	Outgoing []UserSummary `json:"outgoing"`
}

type FriendService struct {
	Store FriendStore
	Now   func() time.Time
}

func NewFriendService(db *gorm.DB) *FriendService {
	return &FriendService{Store: &gormFriendStore{db: db}, Now: time.Now}
}

func (s *FriendService) Relationship(viewerID, targetID uuid.UUID) (string, error) {
	if viewerID == targetID {
		return RelSelf, nil
	}
	f, err := s.Store.Get(viewerID, targetID)
	if err != nil {
		return "", err
	}
	return relationshipFromRow(f, viewerID), nil
}

func relationshipFromRow(f *models.Friendship, viewerID uuid.UUID) string {
	if f == nil {
		return RelNone
	}
	switch f.Status {
	case models.FriendshipAccepted:
		return RelFriends
	case models.FriendshipPending:
		if f.RequesterID == viewerID {
			return RelOutgoing
		}
		return RelIncoming
	}
	return RelNone
}

// Request sends a friend request. If the target already asked the user, this
// accepts it instead. Returns the resulting relationship from the user's side.
func (s *FriendService) Request(user *models.User, targetID uuid.UUID) (string, error) {
	if user.IsGuest {
		return "", ErrGuestNotAllowed
	}
	if user.ID == targetID {
		return "", ErrSelf
	}
	ok, err := s.Store.UserIsRegistered(targetID)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", ErrUserNotFound
	}

	existing, err := s.Store.Get(user.ID, targetID)
	if err != nil {
		return "", err
	}
	now := s.Now()
	if existing != nil {
		switch existing.Status {
		case models.FriendshipAccepted:
			return RelFriends, nil
		case models.FriendshipPending:
			if existing.RequesterID == user.ID {
				return RelOutgoing, nil
			}
			existing.Status = models.FriendshipAccepted
			existing.UpdatedAt = now
			if err := s.Store.Save(existing); err != nil {
				return "", err
			}
			return RelFriends, nil
		case models.FriendshipDeclined:
			// Only the person who was declined has to wait; the decliner can change their mind.
			if existing.RequesterID == user.ID && now.Sub(existing.UpdatedAt) < declineCooldown {
				return "", ErrRequestCooldown
			}
		}
	}

	f := &models.Friendship{
		RequesterID: user.ID,
		AddresseeID: targetID,
		Status:      models.FriendshipPending,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.Store.Save(f); err != nil {
		return "", err
	}
	return RelOutgoing, nil
}

func (s *FriendService) RequestByUsername(user *models.User, username string) (string, error) {
	if user.IsGuest {
		return "", ErrGuestNotAllowed
	}
	target, err := s.Store.FindRegisteredByUsername(strings.TrimSpace(username))
	if err != nil {
		return "", err
	}
	if target == nil {
		return "", ErrUserNotFound
	}
	return s.Request(user, target.ID)
}

// pendingFrom returns the pending request from requesterID to user, or ErrNoPendingRequest.
func (s *FriendService) pendingFrom(user *models.User, requesterID uuid.UUID) (*models.Friendship, error) {
	if user.IsGuest {
		return nil, ErrGuestNotAllowed
	}
	f, err := s.Store.Get(user.ID, requesterID)
	if err != nil {
		return nil, err
	}
	if f == nil || f.Status != models.FriendshipPending || f.RequesterID != requesterID {
		return nil, ErrNoPendingRequest
	}
	return f, nil
}

func (s *FriendService) Accept(user *models.User, requesterID uuid.UUID) error {
	f, err := s.pendingFrom(user, requesterID)
	if err != nil {
		return err
	}
	f.Status = models.FriendshipAccepted
	f.UpdatedAt = s.Now()
	return s.Store.Save(f)
}

// Decline keeps the row as "declined" so the cooldown can be enforced.
func (s *FriendService) Decline(user *models.User, requesterID uuid.UUID) error {
	f, err := s.pendingFrom(user, requesterID)
	if err != nil {
		return err
	}
	f.Status = models.FriendshipDeclined
	f.UpdatedAt = s.Now()
	return s.Store.Save(f)
}

// Cancel withdraws the user's own pending request.
func (s *FriendService) Cancel(user *models.User, addresseeID uuid.UUID) error {
	if user.IsGuest {
		return ErrGuestNotAllowed
	}
	f, err := s.Store.Get(user.ID, addresseeID)
	if err != nil {
		return err
	}
	if f == nil || f.Status != models.FriendshipPending || f.RequesterID != user.ID {
		return ErrNoPendingRequest
	}
	return s.Store.Delete(f.RequesterID, f.AddresseeID)
}

func (s *FriendService) Remove(user *models.User, friendID uuid.UUID) error {
	if user.IsGuest {
		return ErrGuestNotAllowed
	}
	f, err := s.Store.Get(user.ID, friendID)
	if err != nil {
		return err
	}
	if f == nil || f.Status != models.FriendshipAccepted {
		return nil
	}
	return s.Store.Delete(f.RequesterID, f.AddresseeID)
}

func (s *FriendService) FriendIDs(userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := s.Store.ListForUser(userID)
	if err != nil {
		return nil, err
	}
	ids := []uuid.UUID{}
	for _, r := range rows {
		if r.Status == models.FriendshipAccepted {
			ids = append(ids, otherID(r, userID))
		}
	}
	return ids, nil
}

func otherID(f models.Friendship, userID uuid.UUID) uuid.UUID {
	if f.RequesterID == userID {
		return f.AddresseeID
	}
	return f.RequesterID
}

// List returns friends (status "offline" until the presence layer fills it in)
// and pending requests in both directions, each sorted by username.
func (s *FriendService) List(user *models.User) (FriendList, error) {
	if user.IsGuest {
		return FriendList{}, ErrGuestNotAllowed
	}
	rows, err := s.Store.ListForUser(user.ID)
	if err != nil {
		return FriendList{}, err
	}
	ids := make([]uuid.UUID, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, otherID(r, user.ID))
	}
	names, err := s.Store.Usernames(ids)
	if err != nil {
		return FriendList{}, err
	}

	list := FriendList{Friends: []FriendEntry{}, Incoming: []UserSummary{}, Outgoing: []UserSummary{}}
	for _, r := range rows {
		id := otherID(r, user.ID)
		summary := UserSummary{ID: id, Username: names[id]}
		switch relationshipFromRow(&r, user.ID) {
		case RelFriends:
			list.Friends = append(list.Friends, FriendEntry{UserSummary: summary, Status: "offline"})
		case RelIncoming:
			list.Incoming = append(list.Incoming, summary)
		case RelOutgoing:
			list.Outgoing = append(list.Outgoing, summary)
		}
	}
	sort.Slice(list.Friends, func(i, j int) bool { return list.Friends[i].Username < list.Friends[j].Username })
	sortSummaries(list.Incoming)
	sortSummaries(list.Outgoing)
	return list, nil
}

func sortSummaries(s []UserSummary) {
	sort.Slice(s, func(i, j int) bool { return s[i].Username < s[j].Username })
}
