package services

import (
	"log"
	"time"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/config"

	"github.com/gorilla/websocket"
	"github.com/google/uuid"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

type WebSocketService struct {
	hub          *Hub
	conn         *websocket.Conn
	lobbyService *LobbyService
}

func NewWebSocketService(hub *Hub, conn *websocket.Conn, lobbyService *LobbyService) *WebSocketService {
	return &WebSocketService{
		hub:          hub,
		conn:         conn,
		lobbyService: lobbyService,
	}
}

func (ws *WebSocketService) BroadcastLobbyUpdate(lobbyID string) {
	lobby, err := getLobbyFromDB(lobbyID)
	if err != nil {
		log.Printf("Error fetching lobby for update: %v", err)
		return
	}

	message := models.Message{
		Type:     "lobby_update",
		Content:  "",
		Time:     "",
		Channel: "lobby_update",
		Username: "",
		SenderId: "",
		LobbyID: lobbyID,
		LobbyTurn: "",
		Lobby:   lobby, 
	}

	log.Printf("Broadcasting lobby update for lobby %s with %d players", lobbyID, len(lobby.Players))
	ws.hub.BroadcastMessage(message)
}

func (ws *WebSocketService) ReadPump(client *models.Client) {
	defer func() {
		ws.hub.UnregisterClient(client)
		ws.conn.Close()
	}()

	ws.conn.SetReadDeadline(time.Now().Add(pongWait))
	ws.conn.SetPongHandler(func(string) error {
		ws.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	ws.BroadcastLobbyUpdate(client.LobbyID)

	if pendingQ, _ := getPendingQuestion(client.LobbyID); pendingQ != nil {
		channel := "pending_question"
		if pendingQ.SenderID == client.PlayerId {
			channel = "pending_waiting"
		}
		client.Send <- models.Message{
			Type:     "pending",
			Content:  pendingQ.Content,
			Channel:  channel,
			SenderId: pendingQ.SenderID,
			Username: pendingQ.Username,
			LobbyID:  client.LobbyID,
		}
	}

	for {
		var msg map[string]interface{}
		err := ws.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		
		// Build message with client metadata
		message := models.Message{
			Type:     getStringValue(msg, "type"),
			Content:  getStringValue(msg, "content"),
			Time:     getStringValue(msg, "time"),
			Channel: getStringValue(msg, "channel"),
			SenderId: client.PlayerId,
			Username: client.Username,
			LobbyID:  client.LobbyID,
			LobbyTurn: "",
		}

		log.Printf("ReadPump received message: Type=%s, Content=%s, LobbyID=%s, Username=%s",
			message.Type, message.Content, message.LobbyID, message.Username)

		lobby, err := getLobbyFromDB(client.LobbyID)
		log.Printf("Current turn in lobby %s: %v", lobby.ID, lobby.TurnID)
		log.Printf("You are %s", client.ID)
		log.Printf("You are really %s", client.PlayerId)

		// ── Pause / Resume channels — bypass turn check ──────────────────────────
		if message.Channel == "pause_request" {
			if ws.lobbyService != nil {
				ws.lobbyService.RequestPause(client.PlayerId, client.LobbyID)
			}
			continue
		}
		if message.Channel == "pause_accept" {
			if ws.lobbyService != nil {
				ws.lobbyService.AcceptPause(client.PlayerId, client.LobbyID)
			}
			continue
		}
		if message.Channel == "resume_request" {
			if ws.lobbyService != nil {
				ws.lobbyService.RequestResume(client.PlayerId, client.LobbyID)
			}
			continue
		}
		if message.Channel == "resume_accept" {
			if ws.lobbyService != nil {
				ws.lobbyService.AcceptResume(client.PlayerId, client.LobbyID)
			}
			continue
		}

		// ── Turn enforcement ──────────────────────────────────────────────────────
		if client.PlayerId != lobby.TurnID.String() && message.Channel == "game" || client.PlayerId == lobby.TurnID.String() && message.Channel == "response" {
			// Not this player's turn
			client.Send <- models.Message{
				Type:    "error",
				Content: "It's not your turn!",
			}
			continue
		} else if message.Channel == "response" && getStringValue(msg, "swap") == "yes" {
			err = lobbySwapTurn(lobby)
			if err != nil {
				log.Printf("Error swapping turn: %v", err)
			}
			// After swap: restart timer for the new turn player (the asker)
			if err == nil && lobby.TurnTimerSeconds > 0 && !lobby.TurnTimerPaused {
				updatedLobby, dbErr := getLobbyFromDB(client.LobbyID)
				if dbErr == nil && updatedLobby.TurnID != nil {
					now := time.Now()
					config.DB.Model(updatedLobby).Updates(map[string]interface{}{
						"turn_started_at":   now,
						"turn_remaining_ms": 0,
					})
					ws.hub.StartTurnTimer(client.LobbyID, updatedLobby.TurnID.String(),
						time.Duration(updatedLobby.TurnTimerSeconds)*time.Second)
				}
			}
		} else if message.Channel == "game" {
			// A question was asked: restart timer targeting the responder (non-turn player).
			if lobby.TurnTimerSeconds > 0 && !lobby.TurnTimerPaused {
				var responderID string
				for _, p := range lobby.Players {
					if p.ID.String() != lobby.TurnID.String() {
						responderID = p.ID.String()
						break
					}
				}
				if responderID != "" {
					now := time.Now()
					config.DB.Model(&models.Lobby{}).Where("id = ?", lobby.ID).Updates(map[string]interface{}{
						"turn_started_at":   now,
						"turn_remaining_ms": 0,
					})
					ws.hub.StartTurnTimer(client.LobbyID, responderID,
						time.Duration(lobby.TurnTimerSeconds)*time.Second)
				}
			}
		}

		message.LobbyTurn = (*lobby.TurnID).String()

		// Persist game/response messages
		saveMessageToDB(message)

		// Broadcast valid move
		ws.hub.BroadcastMessage(message)

		// Push a fresh lobby_update after any action that changes turn timer state
		// (swap updates lobby.turn; question asked updates turnStartedAt for responder).
		if message.Channel == "response" && getStringValue(msg, "swap") == "yes" ||
			(message.Channel == "game" && lobby.TurnTimerSeconds > 0) {
			ws.BroadcastLobbyUpdate(client.LobbyID)
		}

		// Update turn in DB to next player
		//lobby.TurnID = getNextPlayerID(lobby)
		//saveLobbyToDB(lobby)
	}
}

func getPendingQuestion(lobbyID string) (*models.StoredMessage, error) {
	var lastQuestion models.StoredMessage
	err := config.DB.Where("lobby_id = ? AND channel = ?", lobbyID, "game").
		Order("created_at desc").
		First(&lastQuestion).Error
	if err != nil {
		return nil, nil // no questions yet
	}

	var responseCount int64
	config.DB.Model(&models.StoredMessage{}).
		Where("lobby_id = ? AND channel = ? AND created_at > ?", lobbyID, "response", lastQuestion.CreatedAt).
		Count(&responseCount)

	if responseCount > 0 {
		return nil, nil // already answered
	}
	return &lastQuestion, nil
}

func saveMessageToDB(msg models.Message) {
	if msg.Channel != "game" && msg.Channel != "response" {
		return
	}
	stored := models.StoredMessage{
		LobbyID:   msg.LobbyID,
		SenderID:  msg.SenderId,
		Username:  msg.Username,
		Content:   msg.Content,
		Channel:   msg.Channel,
		LobbyTurn: msg.LobbyTurn,
	}
	if err := config.DB.Create(&stored).Error; err != nil {
		log.Printf("Failed to save message to DB: %v", err)
	}
}

func getLobbyFromDB(lobbyID string) (*models.Lobby, error) {
	var lobby models.Lobby
	lobbyUUID, err := uuid.Parse(lobbyID)
	if err != nil {
		// handle invalid UUID
	}
	if err := config.DB.Preload("Players").
		Preload("CharacterSet").
		Preload("LobbyCharacters").
		First(&lobby, "id = ?", lobbyUUID).Error; err != nil {
		return nil, err
	}
	return &lobby, nil
}

func lobbySwapTurn(lobby *models.Lobby) error {

	log.Printf("Swapping turn for lobby %s", lobby.ID)
	if *lobby.TurnID == lobby.Players[0].ID {
		lobby.TurnID = &lobby.Players[1].ID
	} else {
		lobby.TurnID = &lobby.Players[0].ID
	}
	
	if err := config.DB.Save(lobby).Error; err != nil {
		return err
	}
	
	return nil
}

func (ws *WebSocketService) WritePump(client *models.Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		ws.conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			ws.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				ws.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			log.Printf("WritePump sending to client %s: Type=%s, Content=%s, LobbyID=%s",
				client.Username, message.Type, message.Content, message.LobbyID)
			if err := ws.conn.WriteJSON(message); err != nil {
				log.Printf("WritePump error for client %s: %v", client.Username, err)
				return
			}
		case <-ticker.C:
			ws.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := ws.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Ping failed for client %s: %v", client.Username, err)
				return
			}
		}
	}
}

// Helper function to safely extract string values from map
func getStringValue(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}