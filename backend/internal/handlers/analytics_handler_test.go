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

func TestAnalyticsProxyHandler_StripsUpstreamCORSHeaders(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, POST, PUT")
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	proxy := NewAnalyticsProxyHandler(upstream.URL, "/analytics-collect")

	req := httptest.NewRequest(http.MethodPost, "/analytics-collect/api/send", nil)
	req.Header.Set("Access-Control-Allow-Origin", "https://example.com") // simulates the app's own CORS middleware having already set this on w before the proxy ran
	rec := httptest.NewRecorder()
	rec.Header().Set("Access-Control-Allow-Origin", "https://example.com")

	proxy.ServeHTTP(rec, req)

	if got := rec.Header().Values("Access-Control-Allow-Origin"); len(got) != 1 || got[0] != "https://example.com" {
		t.Fatalf("expected exactly one Access-Control-Allow-Origin value from the app's own CORS middleware, got %v", got)
	}
	if got := rec.Header().Values("Access-Control-Allow-Headers"); len(got) != 0 {
		t.Fatalf("expected upstream's Access-Control-Allow-Headers to be stripped, got %v", got)
	}
}
