package handlers

import (
	"log"
	"net/http"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/services"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Configure this properly in production
	},
}

type WebSocketHandler struct {
	Hub *services.Hub
}

func NewWebSocketHandler(hub *services.Hub) *WebSocketHandler {
	return &WebSocketHandler{
		Hub: hub,
	}
}

func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// IMPORTANT: Parse query params BEFORE upgrading
	query := r.URL.Query()
	username := query.Get("username")
	lobbyID := query.Get("lobbyId")
	playerId := query.Get("playerId")

	log.Printf("Raw query string: %s", r.URL.RawQuery)
	log.Printf("Parsed params: username=%s, lobbyId=%s, playerId=%s", username, lobbyID, playerId)

	if username == "" {
		username = "Anonymous"
	}

	if lobbyID == "" {
		log.Printf("ERROR: lobbyId is empty after parsing!")
		http.Error(w, "lobbyId is required", http.StatusBadRequest)
		return
	}

	// NOW upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}

	// Create client with the parsed lobbyID
	client := &models.Client{
		ID:       uuid.New().String(),
		Username: username,
		LobbyID:  lobbyID,
		PlayerId:   playerId,
		Send:     make(chan models.Message, 256),
	}

	log.Printf("Created client: ID=%s, Username=%s, LobbyID='%s', playerId=%s", 
		client.ID, client.Username, client.LobbyID, client.PlayerId)

	// Register client with hub
	h.Hub.RegisterClient(client)

	// Send join notification to lobby
	h.Hub.BroadcastMessage(models.Message{
		Type:     "join",
		Username: username,
		Content:  "joined the chat",
		LobbyID:  lobbyID,
	})

	// Create WebSocket service
	wsService := services.NewWebSocketService(h.Hub, conn)

	// Start pumps
	go wsService.WritePump(client)
	go wsService.ReadPump(client)
}