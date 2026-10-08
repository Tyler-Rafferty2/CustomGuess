package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

type memPollStore struct{ votes map[string]*models.PollVote }

func (m *memPollStore) GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error) {
	v, ok := m.votes[pollID+userID.String()]
	if !ok {
		return nil, nil
	}
	return v, nil
}
func (m *memPollStore) UpsertVote(v *models.PollVote) error {
	cp := *v
	m.votes[v.PollID+v.UserID.String()] = &cp
	return nil
}
func (m *memPollStore) CountByOption(pollID string) (map[string]int64, error) {
	out := map[string]int64{}
	for _, v := range m.votes {
		if v.PollID == pollID {
			out[v.OptionKey]++
		}
	}
	return out, nil
}

func newTestPollHandler() *PollHandler {
	return &PollHandler{Service: &services.PollService{
		Store: &memPollStore{votes: map[string]*models.PollVote{}},
		Poll:  services.CurrentPoll,
	}}
}

func withUser(r *http.Request, u *models.User) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), middleware.UserContextKey, u))
}

func postVote(h *PollHandler, u *models.User, body string) *httptest.ResponseRecorder {
	req := withUser(httptest.NewRequest(http.MethodPost, "/poll/vote", strings.NewReader(body)), u)
	rec := httptest.NewRecorder()
	h.VoteHandler(rec, req)
	return rec
}

func TestVoteHandler_GuestForbidden(t *testing.T) {
	rec := postVote(newTestPollHandler(), &models.User{ID: uuid.New(), IsGuest: true}, `{"optionKey":"friends"}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestVoteHandler_BadRequests(t *testing.T) {
	cases := map[string]string{
		"malformed json":   `{"optionKey":`,
		"missing option":   `{}`,
		"unknown option":   `{"optionKey":"bogus"}`,
		"comment too long": `{"optionKey":"friends","comment":"` + strings.Repeat("a", 501) + `"}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			rec := postVote(newTestPollHandler(), &models.User{ID: uuid.New()}, body)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d (%s)", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestVoteHandler_SuccessReturnsView(t *testing.T) {
	rec := postVote(newTestPollHandler(), &models.User{ID: uuid.New()}, `{"optionKey":"cosmetics","comment":"hats"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	var view services.PollView
	if err := json.NewDecoder(rec.Body).Decode(&view); err != nil {
		t.Fatal(err)
	}
	if view.MyVote == nil || view.MyVote.OptionKey != "cosmetics" || view.Results == nil || view.Results.Percentages["cosmetics"] != 100 {
		t.Fatalf("unexpected view: %+v", view)
	}
}

func TestGetPollHandler_ResultsNullBeforeVote(t *testing.T) {
	h := newTestPollHandler()
	req := withUser(httptest.NewRequest(http.MethodGet, "/poll", nil), &models.User{ID: uuid.New()})
	rec := httptest.NewRecorder()
	h.GetPollHandler(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var raw map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&raw); err != nil {
		t.Fatal(err)
	}
	if raw["myVote"] != nil || raw["results"] != nil {
		t.Fatalf("expected null myVote/results, got %v / %v", raw["myVote"], raw["results"])
	}
	if raw["id"] != services.CurrentPoll.ID {
		t.Fatalf("expected poll id %q, got %v", services.CurrentPoll.ID, raw["id"])
	}
}
