package services

import (
	"log"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/config"

	"github.com/gorilla/websocket"
	"github.com/google/uuid"
)

type WebSocketService struct {
	hub  *Hub
	conn *websocket.Conn
}

func NewWebSocketService(hub *Hub, conn *websocket.Conn) *WebSocketService {
	return &WebSocketService{
		hub:  hub,
		conn: conn,
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
		if client.PlayerId != lobby.TurnID.String() && message.Channel == "game" || client.PlayerId == lobby.TurnID.String() && message.Channel == "response"{
			// Not this player's turn
			client.Send <- models.Message{
				Type:    "error",
				Content: "It's not your turn!",
			}
			continue
		}else if message.Channel == "response" && getStringValue(msg, "swap") == "yes" {
			err = lobbySwapTurn(lobby)
			if err != nil {
				log.Printf("Error swapping turn: %v", err)
			}
		} 

		message.LobbyTurn = (*lobby.TurnID).String()

		// Persist game/response messages
		saveMessageToDB(message)

		// Broadcast valid move
		ws.hub.BroadcastMessage(message)

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
	defer ws.conn.Close()

	for message := range client.Send {
		log.Printf("WritePump sending to client %s: Type=%s, Content=%s, LobbyID=%s", 
			client.Username, message.Type, message.Content, message.LobbyID)
		err := ws.conn.WriteJSON(message)
		if err != nil {
			log.Printf("WritePump error for client %s: %v", client.Username, err)
			return
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