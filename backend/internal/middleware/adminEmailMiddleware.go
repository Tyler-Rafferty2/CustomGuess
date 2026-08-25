package middleware

import (
	"net/http"
	"os"
)

// AdminEmailMiddleware restricts a route group to the single admin account,
// identified by email. Must run after NewUserMiddleware (or
// NewOptionalUserMiddleware) so the user is already in context.
//
// Returns 404 (not 401/403) on any rejection so the route's existence isn't
// hinted at to non-admins.
func AdminEmailMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromContext(r)
		adminEmail := os.Getenv("ADMIN_EMAIL")

		if user == nil || adminEmail == "" || user.Email != adminEmail {
			http.NotFound(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}
