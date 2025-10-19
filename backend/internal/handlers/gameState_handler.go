package handlers

import (
    "encoding/json"
    "net/http"

	"github.com/go-chi/chi/v5"
    "github.com/tyler-rafferty2/GuessWho/internal/services"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
)

type GameStateHandler struct {
    Service *services.GameStateService
}

// GET /{lobbyID}
func (h *GameStateHandler) GetGameStateHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
	if user == nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

	lobbyID := chi.URLParam(r, "lobbyID")
    if lobbyID == "" {
        http.Error(w, "missing lobbyID", http.StatusBadRequest)
        return
    }

    lobby, err := h.Service.GetGameState(user, lobbyID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}