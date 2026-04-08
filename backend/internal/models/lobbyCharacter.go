package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LobbyCharacter struct {
	ID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	LobbyID uuid.UUID `gorm:"type:uuid;not null" json:"lobbyId"`
	Name    string    `gorm:"not null" json:"name"`
	Image   string    `json:"image"`
}

func (lc *LobbyCharacter) BeforeCreate(tx *gorm.DB) (err error) {
	if lc.ID == uuid.Nil {
		lc.ID = uuid.New()
	}
	return
}
