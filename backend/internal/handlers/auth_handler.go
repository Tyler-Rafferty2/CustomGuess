package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

type AuthHandler struct {
	SessionService *services.SessionService
}

func NewAuthHandler(sessionService *services.SessionService) *AuthHandler {
	return &AuthHandler{SessionService: sessionService}
}

// POST /auth/session — return existing session user, or create a new guest session.
// If the cookie points to an expired registered-user session, return 401 {expired:true}
// so the frontend can prompt sign-in rather than silently downgrade to guest.
func (h *AuthHandler) GetOrCreateSession(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie("session_id"); err == nil {
		user, renewed, err := h.SessionService.GetSessionUser(cookie.Value)
		if err == nil {
			if renewed {
				middleware.SetSessionCookie(w, cookie.Value)
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(user)
			return
		}

		// Session was found but expired — if it belonged to a registered user, tell the
		// frontend so it can show a sign-in prompt rather than silently making a new guest.
		if errors.Is(err, services.ErrSessionExpired) {
			// We need to know whether the expired session was a registered user.
			// GetSessionUser already deleted it, so query the soft-delete record.
			// Instead, we track this via a separate lightweight lookup before deletion.
			// For now we rely on the fact that ErrSessionExpired was returned, meaning
			// the record existed. We re-check is_guest from the deleted row via Unscoped.
			var session struct{ IsGuest bool }
			h.SessionService.DB.Table("sessions").
				Unscoped().
				Select("is_guest").
				Where("id = ?", cookie.Value).
				Scan(&session)

			if !session.IsGuest {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]any{"expired": true})
				return
			}
		}
	}

	// No cookie, expired guest, or no session found → create a new guest session
	guestID := uuid.New()
	newSession, err := h.SessionService.CreateSession(guestID, true)
	if err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		return
	}

	middleware.SetSessionCookie(w, newSession.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"id":      guestID,
		"email":   "guest",
		"isGuest": true,
	})
}

// GET /auth/me — return current session user (requires valid session cookie)
func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		http.Error(w, "not authenticated", http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// POST /auth/logout — delete session and clear cookie
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie("session_id"); err == nil {
		h.SessionService.DeleteSession(cookie.Value)
	}
	middleware.ClearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}
