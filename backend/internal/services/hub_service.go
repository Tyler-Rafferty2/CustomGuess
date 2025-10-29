package services

import (
	"log"
	"sync"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

type Hub struct {
	lobbies    map[string]map[string]*models.Client
	broadcast  chan models.Message
	register   chan *models.Client
	unregister chan *models.Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		lobbies:    make(map[string]map[string]*models.Client),
		broadcast:  make(chan models.Message),
		register:   make(chan *models.Client),
		unregister: make(chan *models.Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if _, ok := h.lobbies[client.LobbyID]; !ok {
				h.lobbies[client.LobbyID] = make(map[string]*models.Client)
				log.Printf("Created new lobby: %s", client.LobbyID)
			}
			
			// Check if user is already connected (by PlayerId)
			if client.PlayerId != "" {
				for existingClientID, existingClient := range h.lobbies[client.LobbyID] {
					if existingClient.PlayerId == client.PlayerId && existingClientID != client.ID {
						log.Printf("User %s already connected in lobby %s, removing old connection", client.PlayerId, client.LobbyID)
						close(existingClient.Send)
						delete(h.lobbies[client.LobbyID], existingClientID)
					}
				}
			}
			
			h.lobbies[client.LobbyID][client.ID] = client
			lobbySize := len(h.lobbies[client.LobbyID])
			h.mu.Unlock()
			log.Printf("Client registered: %s (%s) in lobby %s. Lobby size: %d", client.Username, client.ID, client.LobbyID, lobbySize)

		case client := <-h.unregister:
			h.mu.Lock()
			if lobby, ok := h.lobbies[client.LobbyID]; ok {
				if _, ok := lobby[client.ID]; ok {
					delete(lobby, client.ID)
					close(client.Send)
					lobbySize := len(lobby)
					// Clean up empty lobbies
					if lobbySize == 0 {
						delete(h.lobbies, client.LobbyID)
						log.Printf("Lobby %s removed (empty)", client.LobbyID)
					}
					log.Printf("Client unregistered: %s (%s) from lobby %s. Lobby size: %d", client.Username, client.ID, client.LobbyID, lobbySize)
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			lobby, ok := h.lobbies[message.LobbyID]
			clientCount := 0
			if ok {
				clientCount = len(lobby)
			}
			h.mu.RUnlock()
			
			log.Printf("Broadcasting message to lobby %s: Type=%s, Content=%s, Username=%s, Clients in lobby: %d", 
				message.LobbyID, message.Type, message.Content, message.Username, clientCount)
			
			if !ok {
				log.Printf("WARNING: Lobby %s not found for broadcast!", message.LobbyID)
				continue
			}
			
			h.mu.Lock()
			successCount := 0
			failCount := 0
			for clientID, client := range lobby {
				select {
				case client.Send <- message:
					successCount++
					log.Printf("Message sent to client %s (%s)", client.Username, clientID)
				default:
					failCount++
					log.Printf("Failed to send to client %s (%s), closing connection", client.Username, clientID)
					close(client.Send)
					delete(lobby, clientID)
				}
			}
			h.mu.Unlock()
			
			log.Printf("Broadcast complete: %d successful, %d failed", successCount, failCount)
		}
	}
}

func (h *Hub) BroadcastMessage(msg models.Message) {
	h.broadcast <- msg
}

func (h *Hub) RegisterClient(client *models.Client) {
	h.register <- client
}

func (h *Hub) UnregisterClient(client *models.Client) {
	h.unregister <- client
}

func (h *Hub) GetLobbyClientCount(lobbyID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if lobby, ok := h.lobbies[lobbyID]; ok {
		return len(lobby)
	}
	return 0
}