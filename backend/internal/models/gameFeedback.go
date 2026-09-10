package models

import (
	"time"

	"github.com/google/uuid"
)

type GameFeedback struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	LobbyID   uuid.UUID `gorm:"type:uuid;not null;index"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	Rating    int       `gorm:"not null"`
	Comment   string    `gorm:"type:text"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}
