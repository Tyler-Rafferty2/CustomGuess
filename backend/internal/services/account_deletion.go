package services

import (
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/tyler-rafferty2/GuessWho/internal/config"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/gorm"
)

// ErrUserNotFound is returned when the user to preview or delete does not exist.
var ErrUserNotFound = errors.New("user not found")

// deletedUserName replaces the opponent name on other users' game records.
const deletedUserName = "Deleted user"

// DeletionPreview counts what deleting an account will remove.
type DeletionPreview struct {
	Username      string `json:"username"`
	Email         string `json:"email"`
	Sets          int64  `json:"sets"`
	Characters    int64  `json:"characters"`
	Images        int64  `json:"images"`
	GameRecords   int64  `json:"game_records"`
	Friendships   int64  `json:"friendships"`
	Follows       int64  `json:"follows"`
	Likes         int64  `json:"likes"`
	Reports       int64  `json:"reports"`
	PollVotes     int64  `json:"poll_votes"`
	Feedback      int64  `json:"feedback"`
	Messages      int64  `json:"messages"`
	Sessions      int64  `json:"sessions"`
	HostedLobbies int64  `json:"hosted_lobbies"`
}

// AccountDeletionService permanently removes a user and every row linked to them.
type AccountDeletionService struct {
	DB     *gorm.DB
	Images *ImageCleaner
}

// accountScope holds the IDs collected for a user before anything is deleted.
type accountScope struct {
	user           models.User
	playerIDs      []uuid.UUID
	hostedLobbyIDs []uuid.UUID
	setIDs         []uuid.UUID
}

// loadAccountScope loads the user and collects their player, hosted lobby and set IDs.
// Guests are stored in guest_id on players and lobbies, so both columns are matched.
func loadAccountScope(tx *gorm.DB, userID uuid.UUID) (*accountScope, error) {
	// A nil ID would match every guest-hosted lobby and guest player (user_id is the zero UUID there).
	if userID == uuid.Nil {
		return nil, ErrUserNotFound
	}
	var sc accountScope
	if err := tx.First(&sc.user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	if err := tx.Model(&models.Player{}).Where("user_id = ? OR guest_id = ?", userID, userID).Pluck("id", &sc.playerIDs).Error; err != nil {
		return nil, err
	}
	if err := tx.Model(&models.Lobby{}).Where("user_id = ? OR guest_id = ?", userID, userID).Pluck("id", &sc.hostedLobbyIDs).Error; err != nil {
		return nil, err
	}
	if err := tx.Model(&models.CharacterSet{}).Where("user_id = ?", userID).Pluck("id", &sc.setIDs).Error; err != nil {
		return nil, err
	}
	return &sc, nil
}

func uuidStrings(ids []uuid.UUID) []string {
	out := make([]string, len(ids))
	for i, id := range ids {
		out[i] = id.String()
	}
	return out
}

// usernameMatchable reports whether stored_messages may be matched by this user's username.
// Guests and users without a username are skipped so the fallback can't sweep up other people's messages.
func (sc *accountScope) usernameMatchable() bool {
	return !sc.user.IsGuest && sc.user.Username != ""
}

// messageCondition builds the OR condition matching stored messages sent by the user's players
// plus the username fallback, and, when includeHosted is set, every message in their hosted lobbies.
// ok is false when nothing can match.
func (sc *accountScope) messageCondition(includeHosted bool) (query string, args []interface{}, ok bool) {
	var conds []string
	if includeHosted && len(sc.hostedLobbyIDs) > 0 {
		conds = append(conds, "lobby_id IN ?")
		args = append(args, uuidStrings(sc.hostedLobbyIDs))
	}
	if len(sc.playerIDs) > 0 {
		conds = append(conds, "sender_id IN ?")
		args = append(args, uuidStrings(sc.playerIDs))
	}
	if sc.usernameMatchable() {
		conds = append(conds, "username = ?")
		args = append(args, sc.user.Username)
	}
	if len(conds) == 0 {
		return "", nil, false
	}
	return strings.Join(conds, " OR "), args, true
}

// Preview returns counts of what Delete would remove for the user.
func (s *AccountDeletionService) Preview(userID uuid.UUID) (*DeletionPreview, error) {
	sc, err := loadAccountScope(s.DB, userID)
	if err != nil {
		return nil, err
	}
	p := &DeletionPreview{
		Username:      sc.user.Username,
		Email:         sc.user.Email,
		Sets:          int64(len(sc.setIDs)),
		HostedLobbies: int64(len(sc.hostedLobbyIDs)),
	}

	if len(sc.setIDs) > 0 {
		if err := s.DB.Model(&models.Character{}).Where("set_id IN ?", sc.setIDs).Count(&p.Characters).Error; err != nil {
			return nil, err
		}
		var covers, images []string
		if err := s.DB.Model(&models.CharacterSet{}).Where("id IN ? AND cover_image <> ''", sc.setIDs).Pluck("cover_image", &covers).Error; err != nil {
			return nil, err
		}
		if err := s.DB.Model(&models.Character{}).Where("set_id IN ? AND image <> ''", sc.setIDs).Pluck("image", &images).Error; err != nil {
			return nil, err
		}
		prefix := config.R2PublicURL + "/"
		distinct := map[string]bool{}
		for _, u := range append(covers, images...) {
			if strings.HasPrefix(u, prefix) && len(u) > len(prefix) {
				distinct[u] = true
			}
		}
		p.Images = int64(len(distinct))
	}

	counts := []struct {
		model interface{}
		where string
		args  []interface{}
		dest  *int64
	}{
		{&models.GameRecord{}, "user_id = ?", []interface{}{userID}, &p.GameRecords},
		{&models.Friendship{}, "requester_id = ? OR addressee_id = ?", []interface{}{userID, userID}, &p.Friendships},
		{&models.Follow{}, "follower_id = ? OR creator_id = ?", []interface{}{userID, userID}, &p.Follows},
		{&models.SetLike{}, "user_id = ?", []interface{}{userID}, &p.Likes},
		{&models.SetReport{}, "user_id = ?", []interface{}{userID}, &p.Reports},
		{&models.PollVote{}, "user_id = ?", []interface{}{userID}, &p.PollVotes},
		{&models.GameFeedback{}, "user_id = ?", []interface{}{userID}, &p.Feedback},
		{&models.Session{}, "user_id = ?", []interface{}{userID}, &p.Sessions},
	}
	for _, c := range counts {
		if err := s.DB.Model(c.model).Where(c.where, c.args...).Count(c.dest).Error; err != nil {
			return nil, err
		}
	}

	if q, args, ok := sc.messageCondition(true); ok {
		if err := s.DB.Model(&models.StoredMessage{}).Where(q, args...).Count(&p.Messages).Error; err != nil {
			return nil, err
		}
	}
	return p, nil
}

// Delete permanently removes the user and every row linked to them in one transaction,
// anonymizes other users' game records against them, then cleans up their sets' R2 images.
func (s *AccountDeletionService) Delete(userID uuid.UUID) error {
	var urls []string
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// 1–2. Load the user and collect IDs.
		sc, err := loadAccountScope(tx, userID)
		if err != nil {
			return err
		}

		// 3. Their sets, with characters, categories, likes and reports on them.
		urls, err = deleteSetTx(tx, sc.setIDs)
		if err != nil {
			return err
		}

		// 4. Lobbies they hosted, with everything in them.
		if len(sc.hostedLobbyIDs) > 0 {
			if err := tx.Where("lobby_id IN ?", sc.hostedLobbyIDs).Delete(&models.LobbyCharacter{}).Error; err != nil {
				return err
			}
			if err := tx.Where("lobby_id IN ?", sc.hostedLobbyIDs).Delete(&models.GameState{}).Error; err != nil {
				return err
			}
			if err := tx.Where("lobby_id IN ?", uuidStrings(sc.hostedLobbyIDs)).Delete(&models.StoredMessage{}).Error; err != nil {
				return err
			}
			if err := tx.Where("lobby_id IN ?", sc.hostedLobbyIDs).Delete(&models.Player{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", sc.hostedLobbyIDs).Delete(&models.Lobby{}).Error; err != nil {
				return err
			}
		}

		// 5. Messages they sent anywhere: by player ID, with username as a fallback.
		if q, args, ok := sc.messageCondition(false); ok {
			if err := tx.Where(q, args...).Delete(&models.StoredMessage{}).Error; err != nil {
				return err
			}
		}

		// 6. Their own rows.
		if len(sc.playerIDs) > 0 {
			if err := tx.Where("player_id IN ?", sc.playerIDs).Delete(&models.GameState{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", sc.playerIDs).Delete(&models.Player{}).Error; err != nil {
				return err
			}
		}
		for _, m := range []interface{}{
			&models.Session{},
			&models.GameRecord{},
			&models.SetLike{},
			&models.SetReport{},
			&models.PollVote{},
			&models.GameFeedback{},
		} {
			if err := tx.Where("user_id = ?", userID).Delete(m).Error; err != nil {
				return err
			}
		}

		// 7. Social links on either side.
		if err := tx.Where("requester_id = ? OR addressee_id = ?", userID, userID).Delete(&models.Friendship{}).Error; err != nil {
			return err
		}
		if err := tx.Where("follower_id = ? OR creator_id = ?", userID, userID).Delete(&models.Follow{}).Error; err != nil {
			return err
		}

		// 8. Other users' history against them.
		if err := tx.Model(&models.GameRecord{}).Where("opponent_user_id = ?", userID).
			Updates(map[string]interface{}{"opponent_user_id": nil, "opponent_name": deletedUserName}).Error; err != nil {
			return err
		}

		// 9. The user.
		return tx.Where("id = ?", userID).Delete(&models.User{}).Error
	})
	if err != nil {
		return err
	}
	s.Images.Cleanup(urls)
	return nil
}
