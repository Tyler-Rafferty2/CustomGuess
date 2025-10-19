package services

import (
	"log"
	"github.com/tyler-rafferty2/GuessWho/internal/models"

	"github.com/gorilla/websocket"
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

func (ws *WebSocketService) ReadPump(client *models.Client) {
	defer func() {
		ws.hub.UnregisterClient(client)
		ws.conn.Close()
	}()

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
			Username: client.Username,
			LobbyID:  client.LobbyID, // Always use client's LobbyID
		}
		
		log.Printf("ReadPump received message: Type=%s, Content=%s, LobbyID=%s, Username=%s", 
			message.Type, message.Content, message.LobbyID, message.Username)
		
		ws.hub.BroadcastMessage(message)
	}
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