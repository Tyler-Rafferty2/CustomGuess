package middleware

import (
	"net/http"
	"os"
	"strings"
)

// AllowedOrigins returns the frontend origins from ALLOWED_ORIGINS (comma-separated),
// defaulting to the local dev frontend.
func AllowedOrigins() []string {
	allowed := os.Getenv("ALLOWED_ORIGINS")
	if allowed == "" {
		allowed = "http://localhost:3080"
	}
	origins := strings.Split(allowed, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}
	return origins
}

func CORSMiddleware(next http.Handler) http.Handler {
	origins := AllowedOrigins()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only the configured frontends get credentialed CORS. Never reflect "null":
		// sandboxed iframes and file:// pages all send it, so allowing it would let any
		// such page make requests with the user's session cookie. The admin dashboard is
		// served same-origin at /admin-ui and needs no CORS.
		origin := r.Header.Get("Origin")
		for _, o := range origins {
			if origin == o {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				break
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, x-umami-website-id, x-umami-hostname, x-umami-cache")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
