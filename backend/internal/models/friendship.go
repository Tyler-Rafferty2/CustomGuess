package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	FriendshipPending  = "pending"
	FriendshipAccepted = "accepted"
	FriendshipDeclined = "declined"
)

// Friendship is one row per pair of users. RequesterID is whoever sent the
// most recent request; a row in either direction counts for the pair.
type Friendship struct {
	RequesterID uuid.UUID `gorm:"type:uuid;not null;primaryKey" json:"requesterId"`
	AddresseeID uuid.UUID `gorm:"type:uuid;not null;primaryKey;index" json:"addresseeId"`
	Status      string    `gorm:"type:varchar(16);not null" json:"status"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
