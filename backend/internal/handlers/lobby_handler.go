package handlers

import (
    "encoding/json"
    "net/http"
    "errors"

    "github.com/google/uuid"
    "github.com/go-chi/chi/v5"
    "github.com/tyler-rafferty2/GuessWho/internal/services"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)



type LobbyHandler struct {
    Service *services.LobbyService
}

// GET /lobby/{lobbyID}/messages
func (h *LobbyHandler) GetMessageHistoryHandler(w http.ResponseWriter, r *http.Request) {
    lobbyID := chi.URLParam(r, "lobbyID")
    msgs, err := h.Service.GetMessageHistory(lobbyID)
    if err != nil {
        http.Error(w, "failed to fetch messages", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(msgs)
}

// POST /lobby/create
func (h *LobbyHandler) CreateLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    var req struct {
        SetID            uuid.UUID `json:"setId"`
        Private          bool      `json:"isPrivate"`
        RandomSecret     bool      `json:"randomizeSecret"`
        ChatFeature      bool      `json:"chatFeature"`
        TurnTimerSeconds int       `json:"turnTimerSeconds"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    lobby, err := h.Service.CreateLobby(user, req.SetID, req.Private, req.RandomSecret, req.ChatFeature, req.TurnTimerSeconds)
    if err != nil {
        var lobbyErr *services.LobbyError
        if errors.As(err, &lobbyErr) {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusConflict)
            json.NewEncoder(w).Encode(map[string]any{
                "error":   lobbyErr.Code,
                "lobbyId": lobbyErr.LobbyID,
            })
            return
        }
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
        var lobbyErr *services.LobbyError
        if errors.As(err, &lobbyErr) {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusConflict)
            json.NewEncoder(w).Encode(map[string]any{
                "error":   lobbyErr.Code,
                "lobbyId": lobbyErr.LobbyID,
            })
            return
        }
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(lobby)
}

// GET /lobby/active — returns the caller's current active lobby, if any
func (h *LobbyHandler) GetActiveLobbyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    player, err := h.Service.GetPlayerByUser(user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    if player == nil {
        http.Error(w, "no active game", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"lobbyId": player.LobbyID.String()})
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

// POST /lobby/move
func (h *LobbyHandler) MakeMoveHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    var req struct {
        LobbyID     uuid.UUID `json:"lobbyId"`
        CharacterID string    `json:"characterId"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
        return
    }

    if err := h.Service.MakeMove(user, req.LobbyID, req.CharacterID); err != nil {
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
    lobby, secretChar, opponentChar, eliminated, err := h.Service.GetLobbyForPlayer(lobbyID, user.ID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Build response including secret character only for this user, plus opponent reveal on game over
    response := struct {
        Lobby                *models.Lobby          `json:"lobby"`
        SecretCharacter      *models.LobbyCharacter `json:"secretCharacter,omitempty"`
        OpponentCharacter    *models.LobbyCharacter `json:"opponentCharacter,omitempty"`
        EliminatedCharacters []string               `json:"eliminatedCharacters"`
    }{
        Lobby:                lobby,
        SecretCharacter:      secretChar,
        OpponentCharacter:    opponentChar,
        EliminatedCharacters: eliminated,
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

// POST /lobby/unready
func (h *LobbyHandler) UnreadyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    var req struct {
        LobbyID uuid.UUID `json:"lobbyId"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    if err := h.Service.SetPlayerUnready(user, req.LobbyID); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{"ok": true})
}

// POST /lobby/ready
func (h *LobbyHandler) ReadyHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    var req struct {
        LobbyID uuid.UUID `json:"lobbyId"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    allReady, err := h.Service.SetPlayerReady(user, req.LobbyID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{"allReady": allReady})
}

// POST /lobby/{id}/rematch
func (h *LobbyHandler) RequestRematchHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    lobbyID, err := uuid.Parse(chi.URLParam(r, "lobbyID"))
    if err != nil {
        http.Error(w, "invalid lobbyID", http.StatusBadRequest)
        return
    }
    var req struct {
        CharacterSetID uuid.UUID `json:"characterSetId"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    if err := h.Service.RequestRematch(user, lobbyID, req.CharacterSetID); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    w.WriteHeader(http.StatusOK)
}

// POST /lobby/{id}/rematch/accept
func (h *LobbyHandler) AcceptRematchHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    lobbyID, err := uuid.Parse(chi.URLParam(r, "lobbyID"))
    if err != nil {
        http.Error(w, "invalid lobbyID", http.StatusBadRequest)
        return
    }

    newLobby, err := h.Service.AcceptRematch(user, lobbyID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(newLobby)
}

// POST /lobby/{id}/rematch/decline
func (h *LobbyHandler) DeclineRematchHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    lobbyID, err := uuid.Parse(chi.URLParam(r, "lobbyID"))
    if err != nil {
        http.Error(w, "invalid lobbyID", http.StatusBadRequest)
        return
    }

    if err := h.Service.DeclineRematch(user, lobbyID); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    w.WriteHeader(http.StatusOK)
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