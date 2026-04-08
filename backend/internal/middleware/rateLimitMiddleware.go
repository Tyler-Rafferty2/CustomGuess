package middleware

import (
	"net/http"
	"sync"

	"golang.org/x/time/rate"
)

type ipLimiter struct {
	limiter *rate.Limiter
}

type rateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*ipLimiter
	r        rate.Limit
	b        int
}

func newRateLimiter(r rate.Limit, b int) *rateLimiter {
	return &rateLimiter{
		limiters: make(map[string]*ipLimiter),
		r:        r,
		b:        b,
	}
}

func (rl *rateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	if l, ok := rl.limiters[ip]; ok {
		return l.limiter
	}
	l := &ipLimiter{limiter: rate.NewLimiter(rl.r, rl.b)}
	rl.limiters[ip] = l
	return l.limiter
}

// globalLimiter: 30 req/s per IP, burst of 60
var globalLimiter = newRateLimiter(30, 60)

// strictLimiter: 5 req/s per IP, burst of 10 — for write-heavy game actions
var strictLimiter = newRateLimiter(5, 10)

func getIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return ip
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}

// RateLimitMiddleware applies a global per-IP rate limit to all routes.
func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		if !globalLimiter.getLimiter(ip).Allow() {
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// StrictRateLimitMiddleware applies a tighter per-IP rate limit for game action routes.
func StrictRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		if !strictLimiter.getLimiter(ip).Allow() {
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
