package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
)

const sessionDuration = 30 * 24 * time.Hour
const renewalWindow = 7 * 24 * time.Hour

var ErrSessionNotFound = errors.New("session not found")
var ErrSessionExpired = errors.New("session expired")

type SessionService struct {
	DB *gorm.DB
}

func NewSessionService(db *gorm.DB) *SessionService {
	return &SessionService{DB: db}
}

func (s *SessionService) CreateSession(userID uuid.UUID, isGuest bool) (*models.Session, error) {
	session := &models.Session{
		ID:        uuid.New().String(),
		UserID:    userID,
		IsGuest:   isGuest,
		ExpiresAt: time.Now().Add(sessionDuration),
	}
	if err := s.DB.Create(session).Error; err != nil {
		return nil, err
	}
	return session, nil
}

// GetSessionUser validates the session and returns the user.
// Also returns renewed=true if the session was extended (within renewal window).
// Returns ErrSessionNotFound or ErrSessionExpired on failure.
func (s *SessionService) GetSessionUser(sessionID string) (*models.User, bool, error) {
	var session models.Session
	if err := s.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		return nil, false, ErrSessionNotFound
	}

	if time.Now().After(session.ExpiresAt) {
		s.DB.Delete(&session)
		return nil, false, ErrSessionExpired
	}

	renewed := false
	if time.Until(session.ExpiresAt) < renewalWindow {
		session.ExpiresAt = time.Now().Add(sessionDuration)
		s.DB.Save(&session)
		renewed = true
	}

	if session.IsGuest {
		return &models.User{
			ID:      session.UserID,
			Email:   "guest",
			IsGuest: true,
		}, renewed, nil
	}

	var user models.User
	if err := s.DB.First(&user, "id = ?", session.UserID).Error; err != nil {
		return nil, false, ErrSessionNotFound
	}
	return &user, renewed, nil
}

func (s *SessionService) DeleteSession(sessionID string) error {
	return s.DB.Where("id = ?", sessionID).Delete(&models.Session{}).Error
}
