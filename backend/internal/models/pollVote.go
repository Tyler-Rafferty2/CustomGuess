package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PollVote is one user's vote on a homepage feature poll. The composite
// unique index enforces one vote per user per poll; re-voting upserts.
type PollVote struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	PollID    string    `gorm:"not null;uniqueIndex:idx_poll_user" json:"pollId"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_poll_user" json:"userId"`
	OptionKey string    `gorm:"not null" json:"optionKey"`
	Comment   string    `gorm:"type:text" json:"comment"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (v *PollVote) BeforeCreate(tx *gorm.DB) (err error) {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return
}
