package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAnalyticsProxyHandler_ForwardsToTargetWithStrippedPrefix(t *testing.T) {
	var gotPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))
	defer upstream.Close()

	proxy := NewAnalyticsProxyHandler(upstream.URL, "/admin/analytics")

	req := httptest.NewRequest(http.MethodGet, "/admin/analytics/script.js", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if gotPath != "/script.js" {
		t.Fatalf("expected upstream to receive /script.js, got %q", gotPath)
	}
}

func TestAnalyticsProxyHandler_ForwardsCollectPathWithDifferentPrefix(t *testing.T) {
	var gotPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	proxy := NewAnalyticsProxyHandler(upstream.URL, "/analytics-collect")

	req := httptest.NewRequest(http.MethodPost, "/analytics-collect/api/send", nil)
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if gotPath != "/api/send" {
		t.Fatalf("expected upstream to receive /api/send, got %q", gotPath)
	}
}
