package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

type ContactHandler struct {
	EmailService *services.EmailService
}

func (h *ContactHandler) SendContactHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Subject string `json:"subject"`
		Message string `json:"message"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Subject = strings.TrimSpace(req.Subject)
	req.Message = strings.TrimSpace(req.Message)

	w.Header().Set("Content-Type", "application/json")

	if req.Name == "" || req.Email == "" || req.Subject == "" || req.Message == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "All fields are required"})
		return
	}

	if err := h.EmailService.SendContactEmail(req.Name, req.Email, req.Subject, req.Message); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to send message"})
		return
	}

	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
