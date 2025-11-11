package models

import (
    "github.com/google/uuid"
    "gorm.io/datatypes"
    "gorm.io/gorm"
)

type GameState struct {
    ID                   uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
    PlayerID             uuid.UUID      `gorm:"type:uuid;not null" json:"playerId"` 
    LobbyID              uuid.UUID      `gorm:"type:uuid;not null" json:"lobbyId"`
    SecretCharacterID    *uuid.UUID      `gorm:"type:uuid" json:"secretCharacterId"` // pointer so it can be null
    SecretCharacter      *Character      `gorm:"foreignKey:SecretCharacterID" json:"secretCharacter"` // pointer to allow nil
    EliminatedCharacters datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"eliminatedCharacters"`
}

// BeforeCreate generates a UUID before inserting a new GameState
func (g *GameState) BeforeCreate(tx *gorm.DB) (err error) {
    if g.ID == uuid.Nil {
        g.ID = uuid.New()
    }
    return
}
