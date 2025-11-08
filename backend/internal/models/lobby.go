package models

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Lobby struct {
    ID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    UserID   uuid.UUID  `gorm:"type:uuid;not null" json:"userId"`
    User     User       `gorm:"foreignKey:UserID" json:"user"`
    Code    string    `gorm:"unique;not null" json:"code"`
    TurnID  *uuid.UUID `gorm:"type:uuid" json:"turn"`
    Players []Player `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE;" json:"players"`

    CharacterSetID uuid.UUID     `gorm:"type:uuid;not null" json:"characterSetId"` 
    CharacterSet   CharacterSet  `gorm:"foreignKey:CharacterSetID" json:"characterSet"`

    GameOver    bool        `gorm:"default:false" json:"gameOver"`
    Winner    *uuid.UUID        `gorm:"type:uuid" json:"winner"`
}

func (l *Lobby) BeforeCreate(tx *gorm.DB) (err error) {
    if l.ID == uuid.Nil {
        l.ID = uuid.New()
    }
    return
}
