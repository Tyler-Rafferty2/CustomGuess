package models

import (
	"time"

	"github.com/google/uuid"
)

type SetLike struct {
	UserID    uuid.UUID `gorm:"type:uuid;not null;primaryKey" json:"userId"`
	SetID     uuid.UUID `gorm:"type:uuid;not null;primaryKey" json:"setId"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}
