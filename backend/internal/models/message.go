package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	Type     string `json:"type"`
	Username string `json:"username"`
	SenderId string `json:"SenderId"`
	Content  string `json:"content"`
	Time     string `json:"time"`
	LobbyID  string `json:"lobbyId"`
	Channel  string `json:"channel"`
	LobbyTurn string `json:"lobbyTurn"`
	Lobby     *Lobby  `json:"lobby,omitempty"`
}

type StoredMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	LobbyID   string    `gorm:"index" json:"LobbyID"`
	SenderID  string    `json:"SenderID"`
	Username  string    `json:"Username"`
	Content   string    `json:"Content"`
	Channel   string    `json:"Channel"`
	LobbyTurn string    `json:"LobbyTurn"`
	CreatedAt time.Time `gorm:"autoCreateTime;index" json:"CreatedAt"`
}

func (s *StoredMessage) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

type Client struct {
	ID       string
	Username string
	LobbyID  string
	PlayerId   string
	Send     chan Message
}