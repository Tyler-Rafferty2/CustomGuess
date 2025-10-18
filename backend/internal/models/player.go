package models

import (
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Player struct {
    ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
    LobbyID   uuid.UUID  `gorm:"type:uuid;not null" json:"lobbyId"`   // FK → Lobby.ID
    UserID    uuid.UUID  `gorm:"type:uuid;not null" json:"userId"`    // FK → User.ID
    Name      string     `gorm:"not null" json:"name"`                // display name in this game
    GameState GameState  `gorm:"foreignKey:PlayerID" json:"gameState"` // player's game state

    User      User       `gorm:"foreignKey:UserID" json:"-"`          // optional: preload user
}

// BeforeCreate generates a UUID before inserting a new Player
func (p *Player) BeforeCreate(tx *gorm.DB) (err error) {
    if p.ID == uuid.Nil {
        p.ID = uuid.New()
    }
    return
}
