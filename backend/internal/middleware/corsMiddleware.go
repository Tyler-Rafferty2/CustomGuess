package middleware

import (
	"net/http"
	"os"
	"strings"
)

func CORSMiddleware(next http.Handler) http.Handler {
	allowed := os.Getenv("ALLOWED_ORIGINS")
	if allowed == "" {
		allowed = "http://localhost:3080"
	}
	origins := strings.Split(allowed, ",")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "null" {
			w.Header().Set("Access-Control-Allow-Origin", "null")
		} else {
			for _, o := range origins {
				if origin == strings.TrimSpace(o) {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
