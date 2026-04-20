package middleware

import (
	"context"
	"net/http"

	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

type contextKey string

const UserContextKey contextKey = "user"

func NewUserMiddleware(sessionService *services.SessionService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("session_id")
			if err != nil {
				http.Error(w, "missing session", http.StatusUnauthorized)
				return
			}

			user, renewed, err := sessionService.GetSessionUser(cookie.Value)
			if err != nil {
				http.Error(w, "invalid or expired session", http.StatusUnauthorized)
				return
			}

			if renewed {
				SetSessionCookie(w, cookie.Value)
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserFromContext(r *http.Request) *models.User {
	user, ok := r.Context().Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}
