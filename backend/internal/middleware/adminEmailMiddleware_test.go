package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

func TestAdminEmailMiddleware_AllowsMatchingAdminEmail(t *testing.T) {
	os.Setenv("ADMIN_EMAIL", "tjraff5@gmail.com")
	defer os.Unsetenv("ADMIN_EMAIL")

	called := false
	handler := AdminEmailMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	user := &models.User{ID: uuid.New(), Email: "tjraff5@gmail.com"}
	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/", nil)
	req = req.WithContext(context.WithValue(req.Context(), UserContextKey, user))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler to be called for matching admin email")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestAdminEmailMiddleware_Returns404ForNonAdminEmail(t *testing.T) {
	os.Setenv("ADMIN_EMAIL", "tjraff5@gmail.com")
	defer os.Unsetenv("ADMIN_EMAIL")

	called := false
	handler := AdminEmailMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	user := &models.User{ID: uuid.New(), Email: "someone-else@example.com"}
	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/", nil)
	req = req.WithContext(context.WithValue(req.Context(), UserContextKey, user))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if called {
		t.Fatal("expected next handler NOT to be called for non-admin email")
	}
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestAdminEmailMiddleware_Returns404ForNoUserInContext(t *testing.T) {
	os.Setenv("ADMIN_EMAIL", "tjraff5@gmail.com")
	defer os.Unsetenv("ADMIN_EMAIL")

	called := false
	handler := AdminEmailMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if called {
		t.Fatal("expected next handler NOT to be called with no user in context")
	}
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}
