package handlers

import (
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
	"gorm.io/gorm"
)

//go:embed admin.html
var adminHTML string

type AdminHandler struct {
	DB    *gorm.DB
	Cache services.SetCache
	Redis *redis.Client

	Players  *services.PlayerService
	Accounts *services.AccountDeletionService
}

func (h *AdminHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// GET /admin-ui — serves the admin dashboard with the token pre-injected
func (h *AdminHandler) ServeUI(w http.ResponseWriter, r *http.Request) {
	token := os.Getenv("ADMIN_TOKEN")
	html := strings.Replace(adminHTML,
		`const ADMIN_TOKEN = ''`,
		fmt.Sprintf(`const ADMIN_TOKEN = '%s'`, token),
		1)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

// GET /admin/stats
func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	var registeredUsers, guestUsers, totalGames, gamesToday int64
	var activeLobbies, waitingLobbies, totalSets, publicSets, totalReports int64

	h.DB.Model(&models.User{}).Where("is_guest = false").Count(&registeredUsers)
	// Guests don't have a User row — count distinct guest sessions instead
	h.DB.Model(&models.Session{}).Where("is_guest = true").Distinct("user_id").Count(&guestUsers)
	h.DB.Model(&models.GameRecord{}).Count(&totalGames)

	today := time.Now().UTC().Truncate(24 * time.Hour)
	h.DB.Model(&models.GameRecord{}).Where("finished_at >= ?", today).Count(&gamesToday)

	h.DB.Model(&models.Lobby{}).Where("game_over = false AND game_started_at IS NOT NULL").Count(&activeLobbies)
	h.DB.Model(&models.Lobby{}).Where("game_over = false AND game_started_at IS NULL").Count(&waitingLobbies)

	h.DB.Model(&models.CharacterSet{}).Count(&totalSets)
	h.DB.Model(&models.CharacterSet{}).Where("public = true").Count(&publicSets)
	h.DB.Model(&models.SetReport{}).Count(&totalReports)

	stats := map[string]any{
		"total_users":           registeredUsers + guestUsers,
		"registered_users":      registeredUsers,
		"guest_users":           guestUsers,
		"total_games_played":    totalGames,
		"games_today":           gamesToday,
		"active_lobbies":        activeLobbies,
		"waiting_lobbies":       waitingLobbies,
		"total_character_sets":  totalSets,
		"public_character_sets": publicSets,
		"total_reports":         totalReports,
	}

	if h.Redis != nil {
		hits, misses, rate := services.CacheHitRate(h.Redis)
		stats["set_cache_hits"] = hits
		stats["set_cache_misses"] = misses
		stats["set_cache_hit_rate"] = rate
	}

	h.writeJSON(w, http.StatusOK, stats)
}

// GET /admin/users?page=1&limit=50
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	type adminUserRow struct {
		ID         string     `json:"id"`
		Email      string     `json:"email"`
		Username   string     `json:"username"`
		IsGuest    bool       `json:"is_guest"`
		CreatedAt  time.Time  `json:"created_at"`
		GameCount  int64      `json:"game_count"`
		LastLogin  *time.Time `json:"last_login"`
		LastPlayed *time.Time `json:"last_played"`
	}

	filter := r.URL.Query().Get("filter")

	query := h.DB.Table("users").
		Select(`users.id, users.email, users.username, users.is_guest, users.created_at,
			COUNT(DISTINCT game_records.id) AS game_count,
			MAX(sessions.created_at) AS last_login,
			MAX(game_records.finished_at) AS last_played`).
		Joins("LEFT JOIN game_records ON game_records.user_id = users.id").
		Joins("LEFT JOIN sessions ON sessions.user_id = users.id").
		Group("users.id").
		Order("users.created_at DESC")

	countQuery := h.DB.Model(&models.User{})
	switch filter {
	case "registered":
		query = query.Where("users.is_guest = false")
		countQuery = countQuery.Where("is_guest = false")
	case "guest":
		query = query.Where("users.is_guest = true")
		countQuery = countQuery.Where("is_guest = true")
	}

	if q := strings.TrimSpace(r.URL.Query().Get("q")); len(q) >= 2 {
		pattern := "%" + services.EscapeLike(q) + "%"
		query = query.Where("users.username ILIKE ? OR users.email ILIKE ?", pattern, pattern)
		countQuery = countQuery.Where("users.username ILIKE ? OR users.email ILIKE ?", pattern, pattern)
	}

	var results []adminUserRow
	query.Limit(limit).Offset(offset).Scan(&results)

	var total int64
	countQuery.Count(&total)

	h.writeJSON(w, http.StatusOK, map[string]any{
		"total": total,
		"page":  page,
		"limit": limit,
		"users": results,
	})
}

// DELETE /admin/users/{id}
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.Accounts.Delete(uid); err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}
		log.Printf("admin delete user %s: %v", uid, err)
		http.Error(w, "delete failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /admin/users/{id}/deletion-preview
func (h *AdminHandler) DeletionPreview(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	preview, err := h.Accounts.Preview(uid)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}
		log.Printf("admin deletion preview %s: %v", uid, err)
		http.Error(w, "preview failed", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, http.StatusOK, preview)
}

// GET /admin/lobbies?active=true
func (h *AdminHandler) ListLobbies(w http.ResponseWriter, r *http.Request) {
	type adminLobbyRow struct {
		ID               string     `json:"id"`
		Code             string     `json:"code"`
		HostUsername     string     `json:"host_username"`
		PlayerNames      []string   `json:"player_names"`
		GameOver         bool       `json:"game_over"`
		GameStartedAt    *time.Time `json:"game_started_at"`
		CreatedAt        time.Time  `json:"created_at"`
		LastActive       time.Time  `json:"last_active"`
		CharacterSetName string     `json:"character_set_name"`
	}

	var lobbies []models.Lobby
	query := h.DB.
		Preload("Players").
		Preload("User").
		Preload("CharacterSet").
		Order("last_active DESC").
		Limit(100)

	if r.URL.Query().Get("active") == "true" {
		query = query.Where("game_over = false")
	}
	query.Find(&lobbies)

	rows := make([]adminLobbyRow, 0, len(lobbies))
	for _, l := range lobbies {
		names := make([]string, 0, len(l.Players))
		for _, p := range l.Players {
			names = append(names, p.Name)
		}
		rows = append(rows, adminLobbyRow{
			ID:               l.ID.String(),
			Code:             l.Code,
			HostUsername:     l.User.Username,
			PlayerNames:      names,
			GameOver:         l.GameOver,
			GameStartedAt:    l.GameStartedAt,
			CreatedAt:        l.CreatedAt,
			LastActive:       l.LastActive,
			CharacterSetName: l.CharacterSet.Name,
		})
	}

	h.writeJSON(w, http.StatusOK, map[string]any{"lobbies": rows})
}

// DELETE /admin/lobbies/{id}
func (h *AdminHandler) DeleteLobby(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	h.DB.Delete(&models.Lobby{}, uid)
	w.WriteHeader(http.StatusNoContent)
}

// GET /admin/reports
func (h *AdminHandler) ListReports(w http.ResponseWriter, r *http.Request) {
	type reportEntry struct {
		Reason    string    `json:"reason"`
		CreatedAt time.Time `json:"created_at"`
	}
	type reportedSet struct {
		ID              string        `json:"id"`
		Name            string        `json:"name"`
		CreatorUsername string        `json:"creator_username"`
		ReportCount     int           `json:"report_count"`
		Public          bool          `json:"public"`
		Hidden          bool          `json:"hidden"`
		Reports         []reportEntry `json:"reports"`
	}

	var sets []models.CharacterSet
	h.DB.Where("report_count > 0").Order("report_count DESC").Find(&sets)

	if len(sets) == 0 {
		h.writeJSON(w, http.StatusOK, map[string]any{"reported_sets": []any{}})
		return
	}

	setIDs := make([]uuid.UUID, len(sets))
	userIDs := make([]uuid.UUID, len(sets))
	for i, s := range sets {
		setIDs[i] = s.ID
		userIDs[i] = s.UserID
	}

	var creators []models.User
	h.DB.Where("id IN ?", userIDs).Find(&creators)
	creatorMap := make(map[uuid.UUID]string, len(creators))
	for _, u := range creators {
		creatorMap[u.ID] = u.Username
	}

	var reports []models.SetReport
	h.DB.Where("set_id IN ?", setIDs).Find(&reports)
	reportsBySet := make(map[uuid.UUID][]reportEntry)
	for _, rp := range reports {
		reportsBySet[rp.SetID] = append(reportsBySet[rp.SetID], reportEntry{
			Reason:    string(rp.Reason),
			CreatedAt: rp.CreatedAt,
		})
	}

	result := make([]reportedSet, 0, len(sets))
	for _, s := range sets {
		entries := reportsBySet[s.ID]
		if entries == nil {
			entries = []reportEntry{}
		}
		result = append(result, reportedSet{
			ID:              s.ID.String(),
			Name:            s.Name,
			CreatorUsername: creatorMap[s.UserID],
			ReportCount:     s.ReportCount,
			Public:          s.Public,
			Hidden:          s.ReportCount >= services.ReportThreshold,
			Reports:         entries,
		})
	}

	h.writeJSON(w, http.StatusOK, map[string]any{"reported_sets": result})
}

// DELETE /admin/sets/{id}
func (h *AdminHandler) DeleteSet(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.Players.AdminDeleteSet(uid); err != nil {
		h.setError(w, "delete set", uid, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) setError(w http.ResponseWriter, op string, id uuid.UUID, err error) {
	if errors.Is(err, services.ErrSetNotFound) {
		http.Error(w, "set not found", http.StatusNotFound)
		return
	}
	log.Printf("admin %s %s: %v", op, id, err)
	http.Error(w, "operation failed", http.StatusInternalServerError)
}

// GET /admin/sets/{id}
func (h *AdminHandler) GetSet(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	set, err := h.Players.AdminGetSet(uid)
	if err != nil {
		h.setError(w, "get set", uid, err)
		return
	}
	type characterRow struct {
		Name  string `json:"name"`
		Image string `json:"image"`
	}
	chars := make([]characterRow, 0, len(set.Characters))
	for _, c := range set.Characters {
		chars = append(chars, characterRow{Name: c.Name, Image: c.Image})
	}
	h.writeJSON(w, http.StatusOK, map[string]any{
		"id":           set.ID.String(),
		"name":         set.Name,
		"public":       set.Public,
		"report_count": set.ReportCount,
		"cover_image":  set.CoverImage,
		"characters":   chars,
	})
}

// POST /admin/sets/{id}/make-private
func (h *AdminHandler) MakeSetPrivate(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.Players.AdminMakePrivate(uid); err != nil {
		h.setError(w, "make private", uid, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /admin/users/{id}/sets
func (h *AdminHandler) GetUserSets(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	type characterRow struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Image string `json:"image"`
	}
	type setRow struct {
		ID          string         `json:"id"`
		Name        string         `json:"name"`
		Description string         `json:"description"`
		CoverImage  string         `json:"cover_image"`
		Public      bool           `json:"public"`
		PlayCount   int            `json:"play_count"`
		ReportCount int            `json:"report_count"`
		CreatedAt   time.Time      `json:"created_at"`
		Characters  []characterRow `json:"characters"`
	}

	var sets []models.CharacterSet
	h.DB.Where("user_id = ?", uid).Preload("Characters").Order("created_at DESC").Find(&sets)

	result := make([]setRow, 0, len(sets))
	for _, s := range sets {
		chars := make([]characterRow, 0, len(s.Characters))
		for _, c := range s.Characters {
			chars = append(chars, characterRow{ID: c.ID.String(), Name: c.Name, Image: c.Image})
		}
		result = append(result, setRow{
			ID:          s.ID.String(),
			Name:        s.Name,
			Description: s.Description,
			CoverImage:  s.CoverImage,
			Public:      s.Public,
			PlayCount:   s.PlayCount,
			ReportCount: s.ReportCount,
			CreatedAt:   s.CreatedAt,
			Characters:  chars,
		})
	}

	h.writeJSON(w, http.StatusOK, map[string]any{"sets": result})
}

// POST /admin/sets/{id}/clear-reports
func (h *AdminHandler) ClearReports(w http.ResponseWriter, r *http.Request) {
	uid, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	h.DB.Where("set_id = ?", uid).Delete(&models.SetReport{})
	h.DB.Model(&models.CharacterSet{}).Where("id = ?", uid).Update("report_count", 0)
	if h.Cache != nil {
		h.Cache.InvalidateSet(uid)
	}
	h.writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// GET /admin/poll — vote counts and comments for the current homepage poll
func (h *AdminHandler) GetPollResults(w http.ResponseWriter, r *http.Request) {
	poll := services.CurrentPoll

	var counts []struct {
		OptionKey string
		Count     int64
	}
	if err := h.DB.Model(&models.PollVote{}).
		Select("option_key, COUNT(*) AS count").
		Where("poll_id = ?", poll.ID).
		Group("option_key").
		Scan(&counts).Error; err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load counts"})
		return
	}
	byKey := map[string]int64{}
	for _, c := range counts {
		byKey[c.OptionKey] = c.Count
	}

	type optionRow struct {
		Key   string `json:"key"`
		Label string `json:"label"`
		Count int64  `json:"count"`
	}
	options := make([]optionRow, 0, len(poll.Options))
	var total int64
	for _, o := range poll.Options {
		options = append(options, optionRow{Key: o.Key, Label: o.Label, Count: byKey[o.Key]})
		total += byKey[o.Key]
	}

	type commentRow struct {
		OptionKey string    `json:"optionKey"`
		Comment   string    `json:"comment"`
		Username  string    `json:"username"`
		UpdatedAt time.Time `json:"updatedAt"`
	}
	comments := []commentRow{}
	if err := h.DB.Table("poll_votes").
		Select("poll_votes.option_key, poll_votes.comment, users.username, poll_votes.updated_at").
		Joins("LEFT JOIN users ON users.id = poll_votes.user_id").
		Where("poll_votes.poll_id = ? AND poll_votes.comment <> ''", poll.ID).
		Order("poll_votes.updated_at DESC").
		Scan(&comments).Error; err != nil {
		h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load comments"})
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]any{
		"pollId":   poll.ID,
		"question": poll.Question,
		"total":    total,
		"options":  options,
		"comments": comments,
	})
}
