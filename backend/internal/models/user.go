package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type User struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Email     string    `gorm:"unique" json:"email"`
    PasswordHash  string    `json:"-"`
    IsGuest bool `gorm:"default:false" json:"isGuest"`
    CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
    Players []Player `gorm:"foreignKey:UserID" json:"players,omitempty"`
    ResetToken          string     `gorm:"index" json:"-"`
    ResetTokenExpiresAt *time.Time `json:"-"`
}

// BeforeCreate generates a UUID before inserting a new User
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
    if u.ID == uuid.Nil {
        u.ID = uuid.New()
    }
    return
}
