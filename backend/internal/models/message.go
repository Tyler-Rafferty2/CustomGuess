package models

type Message struct {
	Type     string `json:"type"`
	Username string `json:"username"`
	Content  string `json:"content"`
	Time     string `json:"time"`
	LobbyID  string `json:"lobbyId"`
}

type Client struct {
	ID       string
	Username string
	LobbyID  string
	UserID   string
	Send     chan Message
}