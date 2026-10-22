package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

// SocialHandler serves profiles, follows, friends, and invites.
type SocialHandler struct {
	Follows  *services.FollowService
	Friends  *services.FriendService
	Profiles *services.ProfileService
	Presence *services.PresenceHub
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

// GET /profiles/{id}
func (h *SocialHandler) GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(w, r, "id")
	if !ok {
		return
	}
	profile, err := h.Profiles.Get(middleware.GetUserFromContext(r), id)
	if err != nil {
		writeSocialError(w, err)
		return
	}
	if h.Presence != nil && profile.Relationship == services.RelFriends {
		profile.Status = h.Presence.Status(profile.ID)
	}
	writeSocialJSON(w, profile)
}

// GET /friends
func (h *SocialHandler) ListFriendsHandler(w http.ResponseWriter, r *http.Request) {
	list, err := h.Friends.List(middleware.GetUserFromContext(r))
	if err != nil {
		writeSocialError(w, err)
		return
	}
	if h.Presence != nil {
		for i := range list.Friends {
			list.Friends[i].Status = h.Presence.Status(list.Friends[i].ID)
		}
	}
	writeSocialJSON(w, list)
}

// GET /friends/relationship/{id}
func (h *SocialHandler) RelationshipHandler(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(w, r, "id")
	if !ok {
		return
	}
	user := middleware.GetUserFromContext(r)
	rel := services.RelNone
	if !user.IsGuest {
		var err error
		if rel, err = h.Friends.Relationship(user.ID, id); err != nil {
			writeSocialError(w, err)
			return
		}
	}
	writeSocialJSON(w, map[string]string{"relationship": rel})
}

// POST /friends/requests  body: {"userId": "..."} or {"username": "..."}
func (h *SocialHandler) SendFriendRequestHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID   string `json:"userId"`
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	user := middleware.GetUserFromContext(r)

	var rel string
	var err error
	switch {
	case req.UserID != "":
		id, parseErr := uuid.Parse(req.UserID)
		if parseErr != nil {
			http.Error(w, "invalid userId", http.StatusBadRequest)
			return
		}
		rel, err = h.Friends.Request(user, id)
	case req.Username != "":
		rel, err = h.Friends.RequestByUsername(user, req.Username)
	default:
		http.Error(w, "userId or username is required", http.StatusBadRequest)
		return
	}
	if err != nil {
		writeSocialError(w, err)
		return
	}
	writeSocialJSON(w, map[string]string{"relationship": rel})
}

// friendAction adapts a FriendService method taking the other user's id to a 204 handler.
func friendAction(action func(*models.User, uuid.UUID) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := uuidParam(w, r, "id")
		if !ok {
			return
		}
		if err := action(middleware.GetUserFromContext(r), id); err != nil {
			writeSocialError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// POST /friends/requests/{id}/accept
func (h *SocialHandler) AcceptFriendHandler() http.HandlerFunc { return friendAction(h.Friends.Accept) }

// POST /friends/requests/{id}/decline
func (h *SocialHandler) DeclineFriendHandler() http.HandlerFunc { return friendAction(h.Friends.Decline) }

// DELETE /friends/requests/{id}
func (h *SocialHandler) CancelFriendRequestHandler() http.HandlerFunc {
	return friendAction(h.Friends.Cancel)
}

// DELETE /friends/{id}
func (h *SocialHandler) RemoveFriendHandler() http.HandlerFunc { return friendAction(h.Friends.Remove) }

// GET /users/search?q=prefix
func (h *SocialHandler) SearchUsersHandler(w http.ResponseWriter, r *http.Request) {
	results, err := h.Friends.SearchUsers(middleware.GetUserFromContext(r), r.URL.Query().Get("q"))
	if err != nil {
		writeSocialError(w, err)
		return
	}
	writeSocialJSON(w, results)
}
