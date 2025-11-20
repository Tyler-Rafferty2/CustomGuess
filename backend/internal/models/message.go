package models

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

type Client struct {
	ID       string
	Username string
	LobbyID  string
	PlayerId   string
	Send     chan Message
}