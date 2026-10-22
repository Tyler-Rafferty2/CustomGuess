package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

const (
	presencePingInterval = 30 * time.Second
	presenceReadTimeout  = 60 * time.Second
	presenceWriteTimeout = 10 * time.Second
)

// PresenceWSHandler serves the site-wide socket used for presence and invites.
// Unlike the lobby socket it is authenticated by the session cookie, so it
// only accepts upgrades from the configured frontend origins.
type PresenceWSHandler struct {
	Presence *services.PresenceHub
	Sessions *services.SessionService
	upgrader websocket.Upgrader
}

func NewPresenceWSHandler(presence *services.PresenceHub, sessions *services.SessionService) *PresenceWSHandler {
	origins := middleware.AllowedOrigins()
	return &PresenceWSHandler{
		Presence: presence,
		Sessions: sessions,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				for _, o := range origins {
					if origin == o {
						return true
					}
				}
				return false
			},
		},
	}
}

// GET /presence/ws
func (h *PresenceWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "missing session", http.StatusUnauthorized)
		return
	}
	user, _, err := h.Sessions.GetSessionUser(cookie.Value)
	if err != nil || user.IsGuest {
		http.Error(w, "sign up to use social features", http.StatusUnauthorized)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("presence upgrade error: %v", err)
		return
	}

	send := make(chan services.PresenceEvent, 32)
	unregister := h.Presence.Register(user.ID, send)
	done := make(chan struct{})

	// Read pump: we expect nothing but pongs and the close frame.
	go func() {
		defer close(done)
		conn.SetReadLimit(512)
		conn.SetReadDeadline(time.Now().Add(presenceReadTimeout))
		conn.SetPongHandler(func(string) error {
			return conn.SetReadDeadline(time.Now().Add(presenceReadTimeout))
		})
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	ticker := time.NewTicker(presencePingInterval)
	defer func() {
		ticker.Stop()
		unregister()
		conn.Close()
	}()

	for {
		select {
		case ev := <-send:
			conn.SetWriteDeadline(time.Now().Add(presenceWriteTimeout))
			if err := conn.WriteJSON(ev); err != nil {
				return
			}
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(presenceWriteTimeout))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-done:
			return
		}
	}
}
