package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
)

const profileSetLimit = 60

type ProfileResponse struct {
	ID            uuid.UUID              `json:"id"`
	Username      string                 `json:"username"`
	JoinedAt      time.Time              `json:"joinedAt"`
	FriendCount   int64                  `json:"friendCount"`
	FollowerCount int64                  `json:"followerCount"`
	SetCount      int                    `json:"setCount"`
	GamesPlayed   int64                  `json:"gamesPlayed"`
	WinRate       float64                `json:"winRate"`
	SetPlays      int64                  `json:"setPlays"`
	SetLikes      int64                  `json:"setLikes"`
	Sets          []CharacterSetResponse `json:"sets"`
	Relationship  string                 `json:"relationship"`
	Following     bool                   `json:"following"`
	// Status is only set for friends, once the presence layer is wired in.
	Status string `json:"status,omitempty"`
}

type ProfileService struct {
	DB      *gorm.DB
	Friends *FriendService
	Follows *FollowService
	Players *PlayerService
}

// Get builds the public profile of userID as seen by viewer (nil when signed out).
func (s *ProfileService) Get(viewer *models.User, userID uuid.UUID) (*ProfileResponse, error) {
	var user models.User
	err := s.DB.Select("id", "username", "created_at", "is_guest").First(&user, "id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) || (err == nil && user.IsGuest) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	resp := &ProfileResponse{ID: user.ID, Username: user.Username, JoinedAt: user.CreatedAt, Relationship: RelNone}

	if resp.FriendCount, err = s.Friends.Store.CountFriends(user.ID); err != nil {
		return nil, err
	}
	if resp.FollowerCount, err = s.Follows.Store.FollowerCount(user.ID); err != nil {
		return nil, err
	}

	var games struct {
		Total int64
		Wins  int64
	}
	if err := s.DB.Model(&models.GameRecord{}).
		Select("COUNT(*) AS total, COUNT(*) FILTER (WHERE result IN ?) AS wins",
			[]models.GameResultType{models.ResultWin, models.ResultForfeitWin}).
		Where("user_id = ?", user.ID).
		Scan(&games).Error; err != nil {
		return nil, err
	}
	resp.GamesPlayed = games.Total
	if games.Total > 0 {
		resp.WinRate = float64(games.Wins) / float64(games.Total)
	}

	publicSets := s.DB.Model(&models.CharacterSet{}).Where("user_id = ? AND public = ?", user.ID, true)
	if err := publicSets.Session(&gorm.Session{}).Select("COALESCE(SUM(play_count), 0)").Scan(&resp.SetPlays).Error; err != nil {
		return nil, err
	}
	if err := s.DB.Model(&models.SetLike{}).
		Joins("JOIN character_sets ON character_sets.id = set_likes.set_id").
		Where("character_sets.user_id = ? AND character_sets.public = ?", user.ID, true).
		Count(&resp.SetLikes).Error; err != nil {
		return nil, err
	}
	var setCount int64
	if err := publicSets.Session(&gorm.Session{}).Count(&setCount).Error; err != nil {
		return nil, err
	}
	resp.SetCount = int(setCount)

	var sets []models.CharacterSet
	if err := publicSets.Session(&gorm.Session{}).Order("created_at DESC").Limit(profileSetLimit).Find(&sets).Error; err != nil {
		return nil, err
	}
	var callerID *uuid.UUID
	if viewer != nil {
		callerID = &viewer.ID
	}
	resp.Sets = s.Players.attachLikes(sets, callerID)

	if viewer != nil && !viewer.IsGuest {
		if resp.Relationship, err = s.Friends.Relationship(viewer.ID, user.ID); err != nil {
			return nil, err
		}
		if resp.Relationship != RelSelf {
			if resp.Following, err = s.Follows.Store.IsFollowing(viewer.ID, user.ID); err != nil {
				return nil, err
			}
		}
	}
	return resp, nil
}
