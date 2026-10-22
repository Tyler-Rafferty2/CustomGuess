package models

import (
	"time"

	"github.com/google/uuid"
)

// Follow is a one-way subscription from a user to a set creator. No approval needed.
type Follow struct {
	FollowerID uuid.UUID `gorm:"type:uuid;not null;primaryKey" json:"followerId"`
	CreatorID  uuid.UUID `gorm:"type:uuid;not null;primaryKey;index" json:"creatorId"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"createdAt"`
}
