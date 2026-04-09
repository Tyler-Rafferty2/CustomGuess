package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Lobby struct {
    ID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
    LastActive time.Time `gorm:"autoUpdateTime" json:"lastActive"`
    UserID   uuid.UUID  `gorm:"type:uuid;" json:"userId"`
    GuestID   uuid.UUID  `gorm:"type:uuid;" json:"userId"`
    User     User       `gorm:"foreignKey:UserID" json:"user"`
    Code    string    `gorm:"unique;not null" json:"code"`
    Private bool    `gorm:"default:false" json:"isPrivate"`
    RandomSecret bool `gorm:"default:false" json:"randomizeSecret"`
    ChatFeature bool `json:"chatFeature"`
    TurnID  *uuid.UUID `gorm:"type:uuid" json:"turn"`
    Players []Player `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE;" json:"players"`

    CharacterSetID  uuid.UUID        `gorm:"type:uuid;not null" json:"characterSetId"`
    CharacterSet    CharacterSet     `gorm:"foreignKey:CharacterSetID" json:"characterSet"`
    LobbyCharacters []LobbyCharacter `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE;" json:"lobbyCharacters"`

    GameOver      bool        `gorm:"default:false" json:"gameOver"`
    GameOverAt    *time.Time  `json:"gameOverAt"`
    Winner        *uuid.UUID  `gorm:"type:uuid" json:"winner"`
    GameStartedAt *time.Time  `json:"gameStartedAt"`

    RematchRequestedBy    *uuid.UUID `gorm:"type:uuid" json:"rematchRequestedBy"`
    RematchCharacterSetID *uuid.UUID `gorm:"type:uuid" json:"rematchCharacterSetID"`

    TurnTimerSeconds  int        `gorm:"default:0" json:"turnTimerSeconds"`
    TurnStartedAt     *time.Time `json:"turnStartedAt"`
    TurnTimerPaused   bool       `gorm:"default:false" json:"turnTimerPaused"`
    TurnRemainingMs   int64      `gorm:"default:0" json:"turnRemainingMs"`
    PauseRequestedBy  *uuid.UUID `gorm:"type:uuid" json:"pauseRequestedBy"`
    ResumeRequestedBy *uuid.UUID `gorm:"type:uuid" json:"resumeRequestedBy"`
}

func (l *Lobby) BeforeCreate(tx *gorm.DB) (err error) {
    if l.ID == uuid.Nil {
        l.ID = uuid.New()
    }
    return
}
