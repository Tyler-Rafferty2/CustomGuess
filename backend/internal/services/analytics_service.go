package services

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

// AnalyticsService sends custom server-side events to the self-hosted Umami
// instance, so backend-only funnel stages (lobby created/joined, game
// started/finished) show up as events in the Umami dashboard alongside
// client-side pageviews.
type AnalyticsService struct {
	baseURL   string
	websiteID string
	client    *http.Client
}

func NewAnalyticsService() *AnalyticsService {
	baseURL := os.Getenv("UMAMI_URL")
	if baseURL == "" {
		baseURL = "http://umami:3000"
	}
	websiteID := os.Getenv("UMAMI_WEBSITE_ID")
	if websiteID == "" {
		websiteID = "82b27817-dfc1-424d-af39-bea327b77cbb"
	}

	return &AnalyticsService{
		baseURL:   baseURL,
		websiteID: websiteID,
		client:    &http.Client{Timeout: 5 * time.Second},
	}
}

// TrackEvent fires a custom Umami event in the background. It never blocks
// or returns an error to the caller — a failed analytics call must not
// affect gameplay.
func (s *AnalyticsService) TrackEvent(name string, data map[string]any) {
	go func() {
		body, err := json.Marshal(map[string]any{
			"type": "event",
			"payload": map[string]any{
				"website":  s.websiteID,
				"hostname": "backend",
				"url":      "/server-event",
				"name":     name,
				"data":     data,
			},
		})
		if err != nil {
			log.Printf("warn: analytics event %q marshal failed: %v", name, err)
			return
		}

		resp, err := s.client.Post(s.baseURL+"/api/send", "application/json", bytes.NewReader(body))
		if err != nil {
			log.Printf("warn: analytics event %q send failed: %v", name, err)
			return
		}
		defer resp.Body.Close()
	}()
}
