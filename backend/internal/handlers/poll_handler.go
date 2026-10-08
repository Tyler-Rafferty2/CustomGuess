package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

type PollHandler struct {
	Service *services.PollService
}

func writePollJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// GET /poll
func (h *PollHandler) GetPollHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)

	view, err := h.Service.GetPollForUser(user)
	if err != nil {
		http.Error(w, "failed to load poll", http.StatusInternalServerError)
		return
	}
	writePollJSON(w, view)
}

// POST /poll/vote
func (h *PollHandler) VoteHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)

	var req struct {
		OptionKey string `json:"optionKey"`
		Comment   string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	view, err := h.Service.CastVote(user, req.OptionKey, req.Comment)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrGuestCannotVote):
			http.Error(w, err.Error(), http.StatusForbidden)
		case errors.Is(err, services.ErrInvalidPollOption), errors.Is(err, services.ErrPollCommentTooLong):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, "failed to save vote", http.StatusInternalServerError)
		}
		return
	}
	writePollJSON(w, view)
}
