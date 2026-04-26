package middleware

import (
	"net"
	"net/http"
	"net/netip"
	"os"
)

func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := os.Getenv("ADMIN_TOKEN")
		if token != "" && (r.Header.Get("X-Admin-Token") == token || r.URL.Query().Get("token") == token) {
			next.ServeHTTP(w, r)
			return
		}

		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			host = r.RemoteAddr
		}
		addr, err := netip.ParseAddr(host)
		if err == nil && addr.IsLoopback() {
			next.ServeHTTP(w, r)
			return
		}

		http.Error(w, "forbidden", http.StatusForbidden)
	})
}
