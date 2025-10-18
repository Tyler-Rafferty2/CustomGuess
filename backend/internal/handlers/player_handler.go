package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/tyler-rafferty2/GuessWho/internal/services"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
)

type PlayerHandler struct {
    Service *services.PlayerService
}

// GET /
func (h *PlayerHandler) GetPlayersHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
    players, err := h.Service.GetPlayers(user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(players)
}