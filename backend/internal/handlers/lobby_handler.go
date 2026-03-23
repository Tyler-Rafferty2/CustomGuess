package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/google/uuid"
    "github.com/go-chi/chi/v5"
    "github.com/tyler-rafferty2/GuessWho/internal/services"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)



type LobbyHandler struct {
    Service *services.LobbyService
}

// POST /lobby/create
func (h *LobbyHandler) CreateLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    var req struct {
        SetID   uuid.UUID `json:"setId"`
        Private bool      `json:"isPrivate"`
        RandomSecret bool `json:"randomizeSecret"`
        ChatFeature bool  `json:"chatFeature"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    lobby, err := h.Service.CreateLobby(user, req.SetID, req.Private, req.RandomSecret, req.ChatFeature)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}

// POST /find
func (h *LobbyHandler) FindLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    lobby, err := h.Service.FindLobby(user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}

// POST /lobby/join
func (h *LobbyHandler) JoinLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

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

// GET /lobby/:lobbyId/status
func (h *LobbyHandler) GetLobbyStatus(w http.ResponseWriter, r *http.Request) {
    lobbyId := chi.URLParam(r, "lobbyId")
    
    status, err := h.Service.GetLobbyStatus(lobbyId)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }
    
    json.NewEncoder(w).Encode(status)
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

// Get /{lobbyID}
func (h *LobbyHandler) GetLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    if user == nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    lobbyIDStr := chi.URLParam(r, "lobbyID")
    if lobbyIDStr == "" {
        http.Error(w, "missing lobbyID", http.StatusBadRequest)
        return
    }

    // Parse string to uuid.UUID
    lobbyID, err := uuid.Parse(lobbyIDStr)
    if err != nil {
        http.Error(w, "invalid lobbyID", http.StatusBadRequest)
        return
    }

    // Call service with lobbyID and userID
    lobby, secretChar, err := h.Service.GetLobbyForPlayer(lobbyID, user.ID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Build response including secret character only for this user
    response := struct {
        Lobby       *models.Lobby      `json:"lobby"`
        SecretCharacter *models.Character `json:"secretCharacter,omitempty"`
    }{
        Lobby: lobby,
        SecretCharacter: secretChar,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// POST /guess
func (h *LobbyHandler) GuessLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    var req struct {
        LobbyID uuid.UUID `json:"lobbyId"`
        CharacterId    string    `json:"characterId"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    lobby, err := h.Service.MakeGuessLobby(user, req.LobbyID, req.CharacterId)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}

// POST /setSecretChar
func (h *LobbyHandler) SetSecretCharHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    var req struct {
        LobbyCode uuid.UUID `json:"lobbyCode"`
        CharacterId    uuid.UUID    `json:"secretCharacter"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    lobby, err := h.Service.SetSecretChar(user, req.LobbyCode, req.CharacterId)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}

// POST /lobby/forfeit
func (h *LobbyHandler) ForfeitHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    var req struct {
        LobbyID uuid.UUID `json:"lobbyId"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    lobby, err := h.Service.ForfeitLobby(user, req.LobbyID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}