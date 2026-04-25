package services

import (
	"log"
	"sync"
	"time"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

type Hub struct {
	lobbies          map[string]map[string]*models.Client
	broadcast        chan models.Message
	register         chan *models.Client
	unregister       chan *models.Client
	mu               sync.RWMutex
	disconnectTimers map[string]*time.Timer
	disconnectMu     sync.Mutex
	// DisconnectHandler is called after the 2-minute grace period expires for a disconnected in-game player.
	DisconnectHandler func(playerID, lobbyID string)
	// PreGameDisconnectHandler is called after the 30-second grace period for pre-game disconnects.
	PreGameDisconnectHandler func(playerID, lobbyID string)
	// IsGameStarted returns whether the lobby's game has already begun (used to pick timer duration).
	IsGameStarted func(lobbyID string) bool

	turnTimers  map[string]*time.Timer // key: lobbyID
	turnTimerMu sync.Mutex
	// TurnExpiredHandler is called when a player's turn timer runs out.
	TurnExpiredHandler func(playerID, lobbyID string)

	// suppressDisconnect holds playerID:lobbyID keys for intentional leaves so the
	// next WS disconnect for that player is silent (no opponent_disconnected, no timer).
	suppressDisconnect map[string]bool
	suppressMu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		lobbies:            make(map[string]map[string]*models.Client),
		broadcast:          make(chan models.Message),
		register:           make(chan *models.Client),
		unregister:         make(chan *models.Client),
		disconnectTimers:   make(map[string]*time.Timer),
		turnTimers:         make(map[string]*time.Timer),
		suppressDisconnect: make(map[string]bool),
	}
}

// SuppressNextDisconnect marks a player's next WS disconnect as intentional so the
// hub skips the opponent_disconnected broadcast and grace-period timer.
func (h *Hub) SuppressNextDisconnect(playerID, lobbyID string) {
	key := playerID + ":" + lobbyID
	h.suppressMu.Lock()
	h.suppressDisconnect[key] = true
	h.suppressMu.Unlock()
}

// StartTurnTimer (re-)starts the per-lobby turn timer for playerID with the given duration.
// Calling it again cancels any running timer first.
func (h *Hub) StartTurnTimer(lobbyID, playerID string, duration time.Duration) {
	h.turnTimerMu.Lock()
	defer h.turnTimerMu.Unlock()
	if t, ok := h.turnTimers[lobbyID]; ok {
		t.Stop()
	}
	if duration <= 0 {
		delete(h.turnTimers, lobbyID)
		return
	}
	h.turnTimers[lobbyID] = time.AfterFunc(duration, func() {
		h.turnTimerMu.Lock()
		delete(h.turnTimers, lobbyID)
		h.turnTimerMu.Unlock()
		log.Printf("Turn timer expired for player %s in lobby %s", playerID, lobbyID)
		if h.TurnExpiredHandler != nil {
			h.TurnExpiredHandler(playerID, lobbyID)
		}
	})
}

// CancelTurnTimer stops and removes any running turn timer for the given lobby.
func (h *Hub) CancelTurnTimer(lobbyID string) {
	h.turnTimerMu.Lock()
	defer h.turnTimerMu.Unlock()
	if t, ok := h.turnTimers[lobbyID]; ok {
		t.Stop()
		delete(h.turnTimers, lobbyID)
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

			// Cancel any pending disconnect timer for this player (reconnect case)
			if client.PlayerId != "" {
				timerKey := client.PlayerId + ":" + client.LobbyID
				h.disconnectMu.Lock()
				if timer, ok := h.disconnectTimers[timerKey]; ok {
					timer.Stop()
					delete(h.disconnectTimers, timerKey)
					h.disconnectMu.Unlock()
					log.Printf("Cancelled disconnect timer for player %s (reconnected)", client.PlayerId)
					go func(lobbyID, playerID string) {
						h.broadcast <- models.Message{
							Type:     "player_reconnected",
							Channel:  "player_reconnected",
							SenderId: playerID,
							LobbyID:  lobbyID,
						}
					}(client.LobbyID, client.PlayerId)
				} else {
					h.disconnectMu.Unlock()
				}
			}

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

			// Start a forfeit countdown for disconnected players.
			// Pre-game: 30 seconds. In-game: 2 minutes.
			if client.PlayerId != "" {
				timerKey := client.PlayerId + ":" + client.LobbyID

				// If this disconnect was intentional (player left via button), skip
				// the opponent_disconnected broadcast and grace-period timer entirely.
				h.suppressMu.Lock()
				suppressed := h.suppressDisconnect[timerKey]
				if suppressed {
					delete(h.suppressDisconnect, timerKey)
				}
				h.suppressMu.Unlock()
				if suppressed {
					log.Printf("Suppressing disconnect notification for player %s (intentional leave)", client.PlayerId)
					continue
				}

				go func(lobbyID, playerID string) {
					h.broadcast <- models.Message{
						Type:     "opponent_disconnected",
						Channel:  "opponent_disconnected",
						SenderId: playerID,
						LobbyID:  lobbyID,
					}
				}(client.LobbyID, client.PlayerId)

				gameStarted := h.IsGameStarted != nil && h.IsGameStarted(client.LobbyID)
				duration := 2 * time.Minute
				if !gameStarted {
					duration = 30 * time.Second
				}

				h.disconnectMu.Lock()
				// Don't stack timers if one is already running
				if _, exists := h.disconnectTimers[timerKey]; !exists {
					timer := time.AfterFunc(duration, func() {
						h.disconnectMu.Lock()
						delete(h.disconnectTimers, timerKey)
						h.disconnectMu.Unlock()
						log.Printf("Disconnect timer expired for player %s in lobby %s — forfeiting (gameStarted=%v)", client.PlayerId, client.LobbyID, gameStarted)
						if gameStarted {
							if h.DisconnectHandler != nil {
								h.DisconnectHandler(client.PlayerId, client.LobbyID)
							}
						} else {
							if h.PreGameDisconnectHandler != nil {
								h.PreGameDisconnectHandler(client.PlayerId, client.LobbyID)
							}
						}
					})
					h.disconnectTimers[timerKey] = timer
				}
				h.disconnectMu.Unlock()
			}

		case message := <-h.broadcast:
			h.mu.RLock()
			lobby, ok := h.lobbies[message.LobbyID]
			h.mu.RUnlock()
			
			if !ok {
				log.Printf("WARNING: Lobby %s not found for broadcast!", message.LobbyID)
				continue
			}

			h.mu.Lock()
			failCount := 0
			for clientID, client := range lobby {
				select {
				case client.Send <- message:
				default:
					failCount++
					close(client.Send)
					delete(lobby, clientID)
				}
			}
			h.mu.Unlock()

			if failCount > 0 {
				log.Printf("Broadcast to lobby %s: %d client(s) dropped", message.LobbyID, failCount)
			}
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