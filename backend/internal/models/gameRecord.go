package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GameResultType string

const (
	ResultWin         GameResultType = "win"
	ResultLoss        GameResultType = "loss"
	ResultForfeitWin  GameResultType = "forfeit_win"
	ResultForfeitLoss GameResultType = "forfeit_loss"
)

type GameRecord struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID           uuid.UUID      `gorm:"type:uuid;not null;index" json:"userId"`
	LobbyID          uuid.UUID      `gorm:"type:uuid;not null" json:"lobbyId"`
	OpponentName     string         `gorm:"not null" json:"opponentName"`
	Result           GameResultType `gorm:"type:varchar(20);not null" json:"result"`
	CharacterSetID   uuid.UUID      `gorm:"type:uuid;not null" json:"characterSetId"`
	CharacterSetName string         `gorm:"not null" json:"characterSetName"`
	DurationSeconds  *int           `json:"durationSeconds"`
	FinishedAt       time.Time      `gorm:"not null" json:"finishedAt"`
}

func (gr *GameRecord) BeforeCreate(tx *gorm.DB) (err error) {
	if gr.ID == uuid.Nil {
		gr.ID = uuid.New()
	}
	return
}
