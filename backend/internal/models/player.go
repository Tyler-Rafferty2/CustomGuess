package models

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Player struct {
    ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
    LobbyID   uuid.UUID  `gorm:"type:uuid;not null" json:"lobbyId"`   // FK → Lobby.ID
    UserID    uuid.UUID  `gorm:"type:uuid;" json:"userId"`    // No FK constraint
    GuestID   uuid.UUID  `gorm:"type:uuid" json:"guestId"`
    Name      string     `gorm:"not null" json:"name"`                // display name in this game
    Ready     bool       `gorm:"default:false" json:"ready"`
    GameState  GameState  `gorm:"constraint:OnDelete:CASCADE;" json:"gameState"`
}

// BeforeCreate generates a UUID before inserting a new Player
func (p *Player) BeforeCreate(tx *gorm.DB) (err error) {
    if p.ID == uuid.Nil {
        p.ID = uuid.New()
    }
    return
}
