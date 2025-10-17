package models

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Lobby struct {
    ID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Code    string    `gorm:"unique;not null" json:"code"`
    TurnID  *uuid.UUID `gorm:"type:uuid" json:"turn"`
    Players []Player   `gorm:"foreignKey:LobbyID" json:"players"`
}

func (l *Lobby) BeforeCreate(tx *gorm.DB) (err error) {
    if l.ID == uuid.Nil {
        l.ID = uuid.New()
    }
    return
}
