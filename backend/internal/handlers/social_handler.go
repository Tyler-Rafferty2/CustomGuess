package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

// SocialHandler serves profiles, follows, friends, and invites.
type SocialHandler struct {
	Follows  *services.FollowService
	Friends  *services.FriendService
	Profiles *services.ProfileService
}

func writeSocialJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func uuidParam(w http.ResponseWriter, r *http.Request, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, name))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return uuid.Nil, false
	}
	return id, true
}

// writeSocialError maps service errors to HTTP statuses.
func writeSocialError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrGuestNotAllowed):
		http.Error(w, err.Error(), http.StatusForbidden)
	case errors.Is(err, services.ErrSelf):
		http.Error(w, err.Error(), http.StatusBadRequest)
	case errors.Is(err, services.ErrUserNotFound), errors.Is(err, services.ErrNoPendingRequest):
		http.Error(w, err.Error(), http.StatusNotFound)
	case errors.Is(err, services.ErrRequestCooldown):
		http.Error(w, err.Error(), http.StatusTooManyRequests)
	default:
		log.Printf("social handler error: %v", err)
		http.Error(w, "something went wrong", http.StatusInternalServerError)
	}
}

// POST /follows/{id}
func (h *SocialHandler) FollowHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(w, r, "id")
	if !ok {
		return
	}
	if err := h.Follows.Follow(middleware.GetUserFromContext(r), id); err != nil {
		writeSocialError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /follows/{id}
func (h *SocialHandler) UnfollowHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(w, r, "id")
	if !ok {
		return
	}
	if err := h.Follows.Unfollow(middleware.GetUserFromContext(r), id); err != nil {
		writeSocialError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /follows
func (h *SocialHandler) FollowFeedHandler(w http.ResponseWriter, r *http.Request) {
	feed, err := h.Follows.Feed(middleware.GetUserFromContext(r))
	if err != nil {
		writeSocialError(w, err)
		return
	}
	writeSocialJSON(w, feed)
}
