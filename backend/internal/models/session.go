package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Session struct {
	ID        string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index" json:"userId"`
	IsGuest   bool      `gorm:"default:false" json:"isGuest"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
