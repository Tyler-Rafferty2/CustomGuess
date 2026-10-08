package services

import (
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
)

// fakePollStore is an in-memory PollStore keyed on (pollID, userID),
// mirroring the unique index on the real table.
type fakePollStore struct {
	votes map[string]*models.PollVote
}

func newFakePollStore() *fakePollStore {
	return &fakePollStore{votes: map[string]*models.PollVote{}}
}

func fakeKey(pollID string, userID uuid.UUID) string { return pollID + "|" + userID.String() }

func (f *fakePollStore) GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error) {
	v, ok := f.votes[fakeKey(pollID, userID)]
	if !ok {
		return nil, nil
	}
	cp := *v
	return &cp, nil
}

func (f *fakePollStore) UpsertVote(v *models.PollVote) error {
	cp := *v
	f.votes[fakeKey(v.PollID, v.UserID)] = &cp
	return nil
}

func (f *fakePollStore) CountByOption(pollID string) (map[string]int64, error) {
	out := map[string]int64{}
	for _, v := range f.votes {
		if v.PollID == pollID {
			out[v.OptionKey]++
		}
	}
	return out, nil
}

func newTestPollService() (*PollService, *fakePollStore) {
	store := newFakePollStore()
	return &PollService{Store: store, Poll: CurrentPoll}, store
}

func registered() *models.User { return &models.User{ID: uuid.New()} }

func TestCurrentPoll_HasExpectedOptions(t *testing.T) {
	want := []string{"friends", "cosmetics", "creator_rewards"}
	if len(CurrentPoll.Options) != len(want) {
		t.Fatalf("expected %d options, got %d", len(want), len(CurrentPoll.Options))
	}
	for i, k := range want {
		if CurrentPoll.Options[i].Key != k {
			t.Fatalf("option %d: expected %q, got %q", i, k, CurrentPoll.Options[i].Key)
		}
	}
}

func TestCastVote_GuestRejected(t *testing.T) {
	svc, store := newTestPollService()
	_, err := svc.CastVote(&models.User{ID: uuid.New(), IsGuest: true}, "friends", "")
	if !errors.Is(err, ErrGuestCannotVote) {
		t.Fatalf("expected ErrGuestCannotVote, got %v", err)
	}
	if len(store.votes) != 0 {
		t.Fatal("guest vote must not be stored")
	}
}

func TestCastVote_UnknownOptionRejected(t *testing.T) {
	svc, _ := newTestPollService()
	_, err := svc.CastVote(registered(), "bogus", "")
	if !errors.Is(err, ErrInvalidPollOption) {
		t.Fatalf("expected ErrInvalidPollOption, got %v", err)
	}
}

func TestCastVote_CommentLengthCountsRunes(t *testing.T) {
	svc, _ := newTestPollService()
	ok := strings.Repeat("é", MaxPollCommentLength) // 500 runes, 1000 bytes
	if _, err := svc.CastVote(registered(), "friends", ok); err != nil {
		t.Fatalf("expected 500-rune comment to be accepted, got %v", err)
	}
	tooLong := strings.Repeat("é", MaxPollCommentLength+1)
	if _, err := svc.CastVote(registered(), "friends", tooLong); !errors.Is(err, ErrPollCommentTooLong) {
		t.Fatalf("expected ErrPollCommentTooLong, got %v", err)
	}
}

func TestCastVote_TrimsComment(t *testing.T) {
	svc, _ := newTestPollService()
	view, err := svc.CastVote(registered(), "friends", "   more sets please  ")
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote.Comment != "more sets please" {
		t.Fatalf("expected trimmed comment, got %q", view.MyVote.Comment)
	}
}

func TestCastVote_ChangingVoteOverwrites(t *testing.T) {
	svc, store := newTestPollService()
	u := registered()
	if _, err := svc.CastVote(u, "friends", "first"); err != nil {
		t.Fatal(err)
	}
	view, err := svc.CastVote(u, "cosmetics", "changed my mind")
	if err != nil {
		t.Fatal(err)
	}
	if len(store.votes) != 1 {
		t.Fatalf("expected 1 stored vote after change, got %d", len(store.votes))
	}
	if view.MyVote.OptionKey != "cosmetics" || view.MyVote.Comment != "changed my mind" {
		t.Fatalf("expected updated vote, got %+v", view.MyVote)
	}
	if view.Results.Total != 1 || view.Results.Percentages["cosmetics"] != 100 || view.Results.Percentages["friends"] != 0 {
		t.Fatalf("unexpected results after change: %+v", view.Results)
	}
}

func TestGetPollForUser_NoResultsBeforeVoting(t *testing.T) {
	svc, _ := newTestPollService()
	_, _ = svc.CastVote(registered(), "friends", "") // someone else voted
	view, err := svc.GetPollForUser(registered())
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote != nil || view.Results != nil {
		t.Fatalf("expected no vote/results before voting, got %+v / %+v", view.MyVote, view.Results)
	}
	if view.ID != CurrentPoll.ID || len(view.Options) != 3 {
		t.Fatalf("expected poll definition in view, got %+v", view)
	}
}

func TestGetPollForUser_ResultsAfterVoting(t *testing.T) {
	svc, _ := newTestPollService()
	u := registered()
	_, _ = svc.CastVote(u, "friends", "hi")
	_, _ = svc.CastVote(registered(), "friends", "")
	_, _ = svc.CastVote(registered(), "cosmetics", "")
	_, _ = svc.CastVote(registered(), "creator_rewards", "")
	view, err := svc.GetPollForUser(u)
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote == nil || view.MyVote.OptionKey != "friends" || view.MyVote.Comment != "hi" {
		t.Fatalf("expected my vote, got %+v", view.MyVote)
	}
	want := map[string]int{"friends": 50, "cosmetics": 25, "creator_rewards": 25}
	if view.Results.Total != 4 {
		t.Fatalf("expected total 4, got %d", view.Results.Total)
	}
	for k, p := range want {
		if view.Results.Percentages[k] != p {
			t.Fatalf("%s: expected %d%%, got %d%%", k, p, view.Results.Percentages[k])
		}
	}
}

func TestGetPollForUser_GuestGetsDefinitionOnly(t *testing.T) {
	svc, _ := newTestPollService()
	view, err := svc.GetPollForUser(&models.User{ID: uuid.New(), IsGuest: true})
	if err != nil {
		t.Fatal(err)
	}
	if view.MyVote != nil || view.Results != nil || len(view.Options) != 3 {
		t.Fatalf("unexpected guest view: %+v", view)
	}
}

func TestComputePollResults_SumsTo100(t *testing.T) {
	res := computePollResults(CurrentPoll.Options, map[string]int64{"friends": 1, "cosmetics": 1, "creator_rewards": 1})
	sum := 0
	for _, p := range res.Percentages {
		sum += p
	}
	if sum != 100 {
		t.Fatalf("expected percentages to sum to 100, got %d (%v)", sum, res.Percentages)
	}
}

func TestComputePollResults_IgnoresUnknownKeys(t *testing.T) {
	res := computePollResults(CurrentPoll.Options, map[string]int64{"friends": 1, "removed_option": 5})
	if res.Total != 1 || res.Percentages["friends"] != 100 {
		t.Fatalf("expected unknown keys ignored, got %+v", res)
	}
	if _, ok := res.Percentages["removed_option"]; ok {
		t.Fatal("unknown key must not appear in percentages")
	}
}

func TestComputePollResults_ZeroVotes(t *testing.T) {
	res := computePollResults(CurrentPoll.Options, map[string]int64{})
	if res.Total != 0 {
		t.Fatalf("expected total 0, got %d", res.Total)
	}
	for _, o := range CurrentPoll.Options {
		if res.Percentages[o.Key] != 0 {
			t.Fatalf("expected 0%% for %s, got %d", o.Key, res.Percentages[o.Key])
		}
	}
}
