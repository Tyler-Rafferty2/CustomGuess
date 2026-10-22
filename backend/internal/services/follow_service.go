package services

import (
	"errors"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Errors shared by every social feature (follows, friends, profiles, invites).
var (
	ErrGuestNotAllowed = errors.New("sign up to use social features")
	ErrSelf            = errors.New("cannot do that to yourself")
	ErrUserNotFound    = errors.New("user not found")
)

type UserSummary struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
}

const followFeedLimit = 50

type FollowStore interface {
	Follow(followerID, creatorID uuid.UUID) error
	Unfollow(followerID, creatorID uuid.UUID) error
	IsFollowing(followerID, creatorID uuid.UUID) (bool, error)
	FollowerCount(creatorID uuid.UUID) (int64, error)
	FollowedCreators(followerID uuid.UUID) ([]UserSummary, error)
	// UserIsRegistered is true only for existing, non-guest users.
	UserIsRegistered(id uuid.UUID) (bool, error)
}

type gormFollowStore struct {
	db *gorm.DB
}

func (g *gormFollowStore) Follow(followerID, creatorID uuid.UUID) error {
	return g.db.Clauses(clause.OnConflict{DoNothing: true}).
		Create(&models.Follow{FollowerID: followerID, CreatorID: creatorID}).Error
}

func (g *gormFollowStore) Unfollow(followerID, creatorID uuid.UUID) error {
	return g.db.Where("follower_id = ? AND creator_id = ?", followerID, creatorID).
		Delete(&models.Follow{}).Error
}

func (g *gormFollowStore) IsFollowing(followerID, creatorID uuid.UUID) (bool, error) {
	var n int64
	err := g.db.Model(&models.Follow{}).
		Where("follower_id = ? AND creator_id = ?", followerID, creatorID).
		Count(&n).Error
	return n > 0, err
}

func (g *gormFollowStore) FollowerCount(creatorID uuid.UUID) (int64, error) {
	var n int64
	err := g.db.Model(&models.Follow{}).Where("creator_id = ?", creatorID).Count(&n).Error
	return n, err
}

func (g *gormFollowStore) FollowedCreators(followerID uuid.UUID) ([]UserSummary, error) {
	out := []UserSummary{}
	err := g.db.Model(&models.User{}).
		Select("users.id, users.username").
		Joins("JOIN follows ON follows.creator_id = users.id").
		Where("follows.follower_id = ?", followerID).
		Order("users.username").
		Scan(&out).Error
	return out, err
}

func (g *gormFollowStore) UserIsRegistered(id uuid.UUID) (bool, error) {
	return userIsRegistered(g.db, id)
}

func userIsRegistered(db *gorm.DB, id uuid.UUID) (bool, error) {
	var n int64
	err := db.Model(&models.User{}).Where("id = ? AND is_guest = ?", id, false).Count(&n).Error
	return n > 0, err
}

type FollowFeed struct {
	Creators []UserSummary         `json:"creators"`
	Sets     []CharacterSetResponse `json:"sets"`
}

type FollowService struct {
	Store   FollowStore
	Players *PlayerService
}

func NewFollowService(db *gorm.DB, players *PlayerService) *FollowService {
	return &FollowService{Store: &gormFollowStore{db: db}, Players: players}
}

// Follow is idempotent: following someone you already follow is not an error.
func (s *FollowService) Follow(user *models.User, creatorID uuid.UUID) error {
	if user.IsGuest {
		return ErrGuestNotAllowed
	}
	if user.ID == creatorID {
		return ErrSelf
	}
	ok, err := s.Store.UserIsRegistered(creatorID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrUserNotFound
	}
	return s.Store.Follow(user.ID, creatorID)
}

func (s *FollowService) Unfollow(user *models.User, creatorID uuid.UUID) error {
	if user.IsGuest {
		return ErrGuestNotAllowed
	}
	return s.Store.Unfollow(user.ID, creatorID)
}

// Feed returns the creators the user follows and their public sets, newest first.
func (s *FollowService) Feed(user *models.User) (FollowFeed, error) {
	if user.IsGuest {
		return FollowFeed{}, ErrGuestNotAllowed
	}
	creators, err := s.Store.FollowedCreators(user.ID)
	if err != nil {
		return FollowFeed{}, err
	}
	feed := FollowFeed{Creators: creators, Sets: []CharacterSetResponse{}}
	if len(creators) == 0 {
		return feed, nil
	}
	ids := make([]uuid.UUID, len(creators))
	for i, c := range creators {
		ids[i] = c.ID
	}
	var sets []models.CharacterSet
	if err := s.Players.DB.
		Where("user_id IN ? AND public = ?", ids, true).
		Order("created_at DESC").
		Limit(followFeedLimit).
		Find(&sets).Error; err != nil {
		return FollowFeed{}, err
	}
	feed.Sets = s.Players.attachLikes(sets, &user.ID)
	return feed, nil
}
