package models

import (
    "github.com/google/uuid"
    "gorm.io/datatypes"
    "gorm.io/gorm"
)

type GameState struct {
    ID                   uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
    PlayerID             uuid.UUID      `gorm:"type:uuid;not null" json:"playerId"` // FK → Player.ID
    SecretCharacter      string         `gorm:"not null" json:"secretCharacter"`
    EliminatedCharacters datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"eliminatedCharacters"`
}

// BeforeCreate generates a UUID before inserting a new GameState
func (g *GameState) BeforeCreate(tx *gorm.DB) (err error) {
    if g.ID == uuid.Nil {
        g.ID = uuid.New()
    }
    return
}
