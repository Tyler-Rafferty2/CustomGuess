package middleware

import (
	"net/http"
	"os"
	"time"
)

func SetSessionCookie(w http.ResponseWriter, sessionID string) {
	secure := os.Getenv("COOKIE_SECURE") == "true"
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		MaxAge:   int((30 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
}

func ClearSessionCookie(w http.ResponseWriter) {
	secure := os.Getenv("COOKIE_SECURE") == "true"
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
}
