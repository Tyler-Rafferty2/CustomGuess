package middleware

import (
    "context"
    "net/http"

    "github.com/google/uuid"
    "github.com/tyler-rafferty2/GuessWho/internal/config"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

// Key type to avoid context collisions
type contextKey string

const UserContextKey contextKey = "user"

// UserMiddleware reads "userId" from headers and injects the user into context
func UserMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userIDStr := r.Header.Get("X-User-ID") // client must send this header
        if userIDStr == "" {
            http.Error(w, "missing X-User-ID header", http.StatusBadRequest)
            return
        }

        userID, err := uuid.Parse(userIDStr)
        if err != nil {
            http.Error(w, "invalid user ID", http.StatusBadRequest)
            return
        }

        var user models.User
        if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
            http.Error(w, "user not found", http.StatusNotFound)
            return
        }

        // Inject user into context
        ctx := context.WithValue(r.Context(), UserContextKey, &user)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Helper function to get user from context in handlers
func GetUserFromContext(r *http.Request) *models.User {
    user, ok := r.Context().Value(UserContextKey).(*models.User)
    if !ok {
        return nil
    }
    return user
}
