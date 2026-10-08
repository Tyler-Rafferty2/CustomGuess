package services

import (
	"errors"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PollOption struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type Poll struct {
	ID       string
	Question string
	Options  []PollOption
}

// CurrentPoll is the poll shown on the homepage. To run a new poll, change
// the ID and options and deploy; votes for the old ID stay in the table.
var CurrentPoll = Poll{
	ID:       "next-feature-2026-10",
	Question: "What should we build next?",
	Options: []PollOption{
		{Key: "friends", Label: "Friends & rivals", Description: "Add friends, invite them directly, and track head-to-head records."},
		{Key: "cosmetics", Label: "Profile cosmetics", Description: "Avatars, badges, and card backs to make your profile yours."},
		{Key: "creator_rewards", Label: "Creator rewards", Description: "Perks and recognition when your sets get played a lot."},
	},
}

const MaxPollCommentLength = 500

var (
	ErrGuestCannotVote    = errors.New("sign up to vote")
	ErrInvalidPollOption  = errors.New("invalid poll option")
	ErrPollCommentTooLong = errors.New("comment is too long")
)

type PollStore interface {
	// GetVote returns (nil, nil) when the user has not voted.
	GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error)
	UpsertVote(v *models.PollVote) error
	CountByOption(pollID string) (map[string]int64, error)
}

type gormPollStore struct {
	db *gorm.DB
}

func (g *gormPollStore) GetVote(pollID string, userID uuid.UUID) (*models.PollVote, error) {
	var v models.PollVote
	err := g.db.Where("poll_id = ? AND user_id = ?", pollID, userID).First(&v).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (g *gormPollStore) UpsertVote(v *models.PollVote) error {
	return g.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "poll_id"}, {Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"option_key", "comment", "updated_at"}),
	}).Create(v).Error
}

func (g *gormPollStore) CountByOption(pollID string) (map[string]int64, error) {
	var rows []struct {
		OptionKey string
		Count     int64
	}
	err := g.db.Model(&models.PollVote{}).
		Select("option_key, COUNT(*) AS count").
		Where("poll_id = ?", pollID).
		Group("option_key").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[string]int64, len(rows))
	for _, r := range rows {
		out[r.OptionKey] = r.Count
	}
	return out, nil
}

type PollVoteView struct {
	OptionKey string `json:"optionKey"`
	Comment   string `json:"comment"`
}

type PollResults struct {
	Total       int64          `json:"total"`
	Percentages map[string]int `json:"percentages"`
}

type PollView struct {
	ID       string        `json:"id"`
	Question string        `json:"question"`
	Options  []PollOption  `json:"options"`
	MyVote   *PollVoteView `json:"myVote"`
	Results  *PollResults  `json:"results"`
}

type PollService struct {
	Store PollStore
	Poll  Poll
}

func NewPollService(db *gorm.DB) *PollService {
	return &PollService{Store: &gormPollStore{db: db}, Poll: CurrentPoll}
}

func (s *PollService) baseView() *PollView {
	return &PollView{ID: s.Poll.ID, Question: s.Poll.Question, Options: s.Poll.Options}
}

func (s *PollService) isValidOption(key string) bool {
	for _, o := range s.Poll.Options {
		if o.Key == key {
			return true
		}
	}
	return false
}

// GetPollForUser returns the poll definition, plus the user's vote and the
// tally once they have voted. Guests only ever get the definition.
func (s *PollService) GetPollForUser(user *models.User) (*PollView, error) {
	view := s.baseView()
	if user.IsGuest {
		return view, nil
	}
	vote, err := s.Store.GetVote(s.Poll.ID, user.ID)
	if err != nil {
		return nil, err
	}
	if vote == nil {
		return view, nil
	}
	counts, err := s.Store.CountByOption(s.Poll.ID)
	if err != nil {
		return nil, err
	}
	results := computePollResults(s.Poll.Options, counts)
	view.MyVote = &PollVoteView{OptionKey: vote.OptionKey, Comment: vote.Comment}
	view.Results = &results
	return view, nil
}

// CastVote creates or replaces the user's vote, then returns the updated view.
func (s *PollService) CastVote(user *models.User, optionKey, comment string) (*PollView, error) {
	if user.IsGuest {
		return nil, ErrGuestCannotVote
	}
	if !s.isValidOption(optionKey) {
		return nil, ErrInvalidPollOption
	}
	comment = strings.TrimSpace(comment)
	if utf8.RuneCountInString(comment) > MaxPollCommentLength {
		return nil, ErrPollCommentTooLong
	}
	if err := s.Store.UpsertVote(&models.PollVote{
		PollID:    s.Poll.ID,
		UserID:    user.ID,
		OptionKey: optionKey,
		Comment:   comment,
	}); err != nil {
		return nil, err
	}
	return s.GetPollForUser(user)
}

// computePollResults turns raw counts into whole-number percentages that sum
// to exactly 100 (largest-remainder method). Counts for keys not in options
// are ignored, so editing options without changing the poll ID can't skew totals.
func computePollResults(options []PollOption, counts map[string]int64) PollResults {
	res := PollResults{Percentages: make(map[string]int, len(options))}
	for _, o := range options {
		res.Total += counts[o.Key]
		res.Percentages[o.Key] = 0
	}
	if res.Total == 0 {
		return res
	}

	type rem struct {
		key string
		r   int64
		idx int
	}
	rems := make([]rem, 0, len(options))
	assigned := 0
	for i, o := range options {
		scaled := counts[o.Key] * 100
		p := int(scaled / res.Total)
		res.Percentages[o.Key] = p
		assigned += p
		rems = append(rems, rem{key: o.Key, r: scaled % res.Total, idx: i})
	}
	sort.SliceStable(rems, func(a, b int) bool {
		if rems[a].r != rems[b].r {
			return rems[a].r > rems[b].r
		}
		return rems[a].idx < rems[b].idx
	})
	for i := 0; assigned < 100; i++ {
		res.Percentages[rems[i%len(rems)].key]++
		assigned++
	}
	return res
}
