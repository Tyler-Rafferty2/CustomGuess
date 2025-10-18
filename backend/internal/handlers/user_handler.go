package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/google/uuid"
    "github.com/tyler-rafferty2/GuessWho/internal/services"
)

type UserHandler struct {
    Service *services.UserService
}

// POST /signup
func (h *UserHandler) SignUpHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    user, err := h.Service.SignUp(req.Email, req.Password)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(user)
}

// POST /login
func (h *UserHandler) SignInHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    user, err := h.Service.Login(req.Email, req.Password)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "invalid credentials"})
        return
    }

    json.NewEncoder(w).Encode(user) // could return JWT token here
}

// GET /user/:id
func (h *UserHandler) GetUserHandler(w http.ResponseWriter, r *http.Request) {
    // Assume `id` comes from URL params, e.g., using gorilla/mux
    idStr := r.URL.Query().Get("id")
    id, err := uuid.Parse(idStr)
    if err != nil {
        http.Error(w, "invalid user id", http.StatusBadRequest)
        return
    }

    user, err := h.Service.GetUserByID(id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    json.NewEncoder(w).Encode(user)
}
