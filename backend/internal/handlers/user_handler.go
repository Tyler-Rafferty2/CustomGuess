package handlers

import (
    "encoding/json"
    "net/http"
    "strings"
    "unicode"

    "github.com/google/uuid"
    "github.com/tyler-rafferty2/GuessWho/internal/middleware"
    "github.com/tyler-rafferty2/GuessWho/internal/services"
)

func validatePassword(p string) string {
    if len(p) < 8 {
        return "Password must be at least 8 characters"
    }
    var hasUpper, hasDigit, hasSymbol bool
    for _, c := range p {
        switch {
        case unicode.IsUpper(c):
            hasUpper = true
        case unicode.IsDigit(c):
            hasDigit = true
        case !unicode.IsLetter(c) && !unicode.IsDigit(c):
            hasSymbol = true
        }
    }
    if !hasUpper {
        return "Password must contain at least one uppercase letter"
    }
    if !hasDigit {
        return "Password must contain at least one number"
    }
    if !hasSymbol {
        return "Password must contain at least one symbol"
    }
    return ""
}

type UserHandler struct {
	Service        *services.UserService
	SessionService *services.SessionService
}

// POST /signup
func (h *UserHandler) SignUpHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email    string `json:"email"`
        Password string `json:"password"`
        Username string `json:"username"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    if strings.ContainsAny(req.Username, " \t\n") {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Username cannot contain spaces"})
        return
    }
    if len(req.Username) > 20 {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Username must be 20 characters or fewer"})
        return
    }

    if msg := validatePassword(req.Password); msg != "" {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": msg})
        return
    }

    user, err := h.Service.SignUp(req.Email, req.Password, req.Username)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

// PUT /users/username
func (h *UserHandler) UpdateUsernameHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    if user == nil || user.IsGuest {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    var req struct {
        Username string `json:"username"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    updated, err := h.Service.UpdateUsername(user, req.Username)
    if err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(updated)
}

// POST /users/signin
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

	session, err := h.SessionService.CreateSession(user.ID, false)
	if err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		return
	}
	middleware.SetSessionCookie(w, session.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// POST /users/forgot-password
func (h *UserHandler) ForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email string `json:"email"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    // Always return 200 to avoid leaking whether an email exists
    h.Service.ForgotPassword(req.Email)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"message": "If that email exists, a reset link has been sent."})
}

// POST /users/reset-password
func (h *UserHandler) ResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Token    string `json:"token"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    if err := h.Service.ResetPassword(req.Token, req.Password); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"message": "Password updated successfully."})
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
