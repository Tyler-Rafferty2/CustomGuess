package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/google/uuid"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
    "github.com/tyler-rafferty2/GuessWho/internal/services"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
)

type LobbyHandler struct {
    Service *services.LobbyService
}

// POST /lobby/create
func (h *LobbyHandler) CreateLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    lobby, err := h.Service.CreateLobby(user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}

// POST /lobby/join
func (h *LobbyHandler) JoinLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := r.Context().Value("user").(*models.User)

    var req struct {
        Code string `json:"code"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    lobby, err := h.Service.JoinLobby(user, req.Code)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}

// POST /player/move
func (h *LobbyHandler) MakeMoveHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        PlayerID uuid.UUID `json:"playerId"`
        Guess    string    `json:"guess"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    if err := h.Service.MakeMove(req.PlayerID, req.Guess); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
}
