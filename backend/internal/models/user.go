package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type User struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Email     string    `gorm:"unique;not null" json:"email"`
    PasswordHash  string    `gorm:"not null"`
    CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`

    Players []Player `gorm:"foreignKey:UserID" json:"players"`
}

// BeforeCreate generates a UUID before inserting a new User
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
    if u.ID == uuid.Nil {
        u.ID = uuid.New()
    }
    return
}
