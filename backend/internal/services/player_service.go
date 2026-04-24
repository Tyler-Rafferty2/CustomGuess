package services

import (
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
    "gorm.io/gorm"
)

type PlayerService struct {
    DB *gorm.DB
}

type CharacterSetResponse struct {
    models.CharacterSet
    LikeCount   int    `json:"likeCount"`
    LikedByMe   bool   `json:"likedByMe"`
    CreatorName string `json:"creator"`
}

type SetListParams struct {
    Page     int    // 1-indexed
    PageSize int
    Sort     string // "most-popular" | "most-liked" | "newest" | "liked"
    Search   string
}

type SetListResult struct {
    Sets  []CharacterSetResponse `json:"sets"`
    Total int64                  `json:"total"`
}

func (s *PlayerService) attachLikes(sets []models.CharacterSet, callerID *uuid.UUID) []CharacterSetResponse {
    if len(sets) == 0 {
        return []CharacterSetResponse{}
    }

    setIDs := make([]uuid.UUID, len(sets))
    userIDs := make([]uuid.UUID, 0, len(sets))
    userIDSet := make(map[uuid.UUID]bool)
    for i, set := range sets {
        setIDs[i] = set.ID
        if !userIDSet[set.UserID] {
            userIDs = append(userIDs, set.UserID)
            userIDSet[set.UserID] = true
        }
    }

    // Batch fetch like counts
    type likeCount struct {
        SetID uuid.UUID
        Cnt   int
    }
    var counts []likeCount
    s.DB.Model(&models.SetLike{}).
        Select("set_id, COUNT(*) as cnt").
        Where("set_id IN ?", setIDs).
        Group("set_id").
        Scan(&counts)

    countMap := make(map[uuid.UUID]int, len(counts))
    for _, lc := range counts {
        countMap[lc.SetID] = lc.Cnt
    }

    // Batch fetch caller's liked sets
    likedMap := make(map[uuid.UUID]bool)
    if callerID != nil {
        var likedIDs []uuid.UUID
        s.DB.Model(&models.SetLike{}).
            Where("user_id = ? AND set_id IN ?", *callerID, setIDs).
            Pluck("set_id", &likedIDs)
        for _, id := range likedIDs {
            likedMap[id] = true
        }
    }

    // Batch fetch creator usernames
    type userRow struct {
        ID       uuid.UUID
        Username string
    }
    var users []userRow
    s.DB.Model(&models.User{}).
        Select("id, username").
        Where("id IN ?", userIDs).
        Scan(&users)
    usernameMap := make(map[uuid.UUID]string, len(users))
    for _, u := range users {
        usernameMap[u.ID] = u.Username
    }

    result := make([]CharacterSetResponse, len(sets))
    for i, set := range sets {
        result[i] = CharacterSetResponse{
            CharacterSet: set,
            LikeCount:    countMap[set.ID],
            LikedByMe:    likedMap[set.ID],
            CreatorName:  usernameMap[set.UserID],
        }
    }
    return result
}

func NewPlayerService(db *gorm.DB) *PlayerService {
    return &PlayerService{DB: db}
}

// Get all players by user
func (s *PlayerService) GetPlayers(user *models.User) ([]models.Player, error) {

    var players []models.Player
    if err := s.DB.Where("user_id = ?", user.ID).Find(&players).Error; err != nil {
        return nil, err
    }

	return players, nil

}

//create a set
func (s *PlayerService) CreateSet(user *models.User, name, description string, public bool, characters []models.Character, coverImage string, minCharacters int) (*models.CharacterSet, error) {
    var count int64
    if err := s.DB.Model(&models.CharacterSet{}).Where("user_id = ?", user.ID).Count(&count).Error; err != nil {
        return nil, fmt.Errorf("failed to check set count")
    }
    if count >= 100 {
        return nil, fmt.Errorf("set limit reached")
    }
    if len(characters) < 6 {
        return nil, fmt.Errorf("a set must have at least 6 characters")
    }
    if len(characters) > 50 {
        return nil, fmt.Errorf("a set can have at most 50 characters")
    }
    if minCharacters < 6 {
        minCharacters = 6
    }
    if minCharacters > len(characters) {
        minCharacters = len(characters)
    }
    set := &models.CharacterSet{
        ID:            uuid.New(),
        UserID:        user.ID,
        Name:          name,
        Public:        public,
        Description:   description,
        CoverImage:    coverImage,
        MinCharacters: minCharacters,
    }

    // Assign SetID to each character
    for i := range characters {
        characters[i].SetID = set.ID
    }

    set.Characters = characters

    if err := s.DB.Create(set).Error; err != nil {
        return nil, err
    }

    return set, nil
}

func (s *PlayerService) GetSetByID(user *models.User, setID uuid.UUID) (*CharacterSetResponse, error) {
    var set models.CharacterSet
    err := s.DB.Where("id = ? AND user_id = ?", setID, user.ID).
        Preload("Characters").
        First(&set).Error
    if err != nil {
        return nil, fmt.Errorf("set not found: %w", err)
    }
    results := s.attachLikes([]models.CharacterSet{set}, &user.ID)
    return &results[0], nil
}

func (s *PlayerService) GetSets(user *models.User, params SetListParams) (SetListResult, error) {
    if params.Page < 1 {
        params.Page = 1
    }
    if params.PageSize < 1 {
        params.PageSize = 12
    }

    base := s.DB.Model(&models.CharacterSet{}).Where("user_id = ?", user.ID)
    if params.Search != "" {
        like := "%" + strings.ToLower(params.Search) + "%"
        base = base.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", like, like)
    }

    var total int64
    if err := base.Count(&total).Error; err != nil {
        return SetListResult{}, fmt.Errorf("failed to count sets: %w", err)
    }

    var sets []models.CharacterSet
    err := base.Order("created_at DESC").
        Limit(params.PageSize).
        Offset((params.Page-1)*params.PageSize).
        Preload("Characters").
        Find(&sets).Error
    if err != nil {
        return SetListResult{}, fmt.Errorf("failed to get character sets: %w", err)
    }

    return SetListResult{Sets: s.attachLikes(sets, &user.ID), Total: total}, nil
}

func (s *PlayerService) UpdateSet(user *models.User, setID uuid.UUID, name, description string, public bool, coverImage string, keepCharacterIDs []uuid.UUID, newCharacters []models.Character, nameUpdates map[uuid.UUID]string, minCharacters int) (*models.CharacterSet, error) {
    totalCount := len(keepCharacterIDs) + len(newCharacters)
    if totalCount < 6 {
        return nil, fmt.Errorf("a set must have at least 6 characters")
    }
    if totalCount > 50 {
        return nil, fmt.Errorf("a set can have at most 50 characters")
    }
    if minCharacters < 6 {
        minCharacters = 6
    }
    if minCharacters > totalCount {
        minCharacters = totalCount
    }
    var set models.CharacterSet
    if err := s.DB.Where("id = ? AND user_id = ?", setID, user.ID).First(&set).Error; err != nil {
        return nil, fmt.Errorf("set not found or not owned by user: %w", err)
    }

    set.Name = name
    set.Description = description
    set.Public = public
    set.MinCharacters = minCharacters
    if coverImage != "" {
        set.CoverImage = coverImage
    }
    if err := s.DB.Save(&set).Error; err != nil {
        return nil, err
    }

    // Delete characters not in the keep list
    if len(keepCharacterIDs) > 0 {
        if err := s.DB.Where("set_id = ? AND id NOT IN ?", setID, keepCharacterIDs).Delete(&models.Character{}).Error; err != nil {
            return nil, err
        }
    } else {
        if err := s.DB.Where("set_id = ?", setID).Delete(&models.Character{}).Error; err != nil {
            return nil, err
        }
    }

    // Update names of kept characters
    for id, newName := range nameUpdates {
        if err := s.DB.Model(&models.Character{}).Where("id = ? AND set_id = ?", id, setID).Update("name", newName).Error; err != nil {
            return nil, err
        }
    }

    // Add new characters
    for i := range newCharacters {
        newCharacters[i].SetID = setID
    }
    if len(newCharacters) > 0 {
        if err := s.DB.Create(&newCharacters).Error; err != nil {
            return nil, err
        }
    }

    if err := s.DB.Preload("Characters").First(&set, "id = ?", setID).Error; err != nil {
        return nil, err
    }
    return &set, nil
}

func (s *PlayerService) DeleteSet(user *models.User, setID uuid.UUID) error {
    result := s.DB.Where("id = ? AND user_id = ?", setID, user.ID).Delete(&models.CharacterSet{})
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return fmt.Errorf("set not found or not owned by user")
    }
    return nil
}

func (s *PlayerService) GetPublicSets(callerID *uuid.UUID, params SetListParams) (SetListResult, error) {
    if params.Page < 1 {
        params.Page = 1
    }
    if params.PageSize < 1 {
        params.PageSize = 12
    }

    base := s.DB.Model(&models.CharacterSet{}).
        Where("character_sets.public = ?", true).
        Where("character_sets.report_count < ?", reportThreshold)

    if params.Search != "" {
        like := "%" + strings.ToLower(params.Search) + "%"
        base = base.Where("LOWER(character_sets.name) LIKE ? OR LOWER(character_sets.description) LIKE ?", like, like)
    }

    if params.Sort == "liked" && callerID != nil {
        base = base.Where("character_sets.id IN (SELECT set_id FROM set_likes WHERE user_id = ?)", *callerID)
    }

    // For most-liked we need to join like counts
    if params.Sort == "most-liked" {
        base = base.Joins("LEFT JOIN (SELECT set_id, COUNT(*) AS cnt FROM set_likes GROUP BY set_id) lc ON lc.set_id = character_sets.id")
    }

    var total int64
    if err := base.Count(&total).Error; err != nil {
        return SetListResult{}, fmt.Errorf("failed to count sets: %w", err)
    }

    switch params.Sort {
    case "most-liked":
        base = base.Order("COALESCE(lc.cnt, 0) DESC, character_sets.id")
    case "newest":
        base = base.Order("character_sets.created_at DESC, character_sets.id")
    default: // "most-popular" and fallback
        base = base.Order("character_sets.play_count DESC, character_sets.id")
    }

    var sets []models.CharacterSet
    err := base.
        Limit(params.PageSize).
        Offset((params.Page-1)*params.PageSize).
        Preload("Characters").
        Find(&sets).Error
    if err != nil {
        return SetListResult{}, fmt.Errorf("failed to get character sets: %w", err)
    }

    return SetListResult{Sets: s.attachLikes(sets, callerID), Total: total}, nil
}

func (s *PlayerService) ToggleLike(userID, setID uuid.UUID) (likeCount int, likedByMe bool, err error) {
    err = s.DB.Transaction(func(tx *gorm.DB) error {
        result := tx.Where("user_id = ? AND set_id = ?", userID, setID).Delete(&models.SetLike{})
        if result.Error != nil {
            return result.Error
        }
        if result.RowsAffected == 0 {
            // Was not liked — insert
            if err := tx.Create(&models.SetLike{UserID: userID, SetID: setID}).Error; err != nil {
                return err
            }
            likedByMe = true
        }
        // Count total likes
        var count int64
        if err := tx.Model(&models.SetLike{}).Where("set_id = ?", setID).Count(&count).Error; err != nil {
            return err
        }
        likeCount = int(count)
        return nil
    })
    return
}

// Stats types

type SetStat struct {
    Name  string `json:"name"`
    Count int    `json:"count"`
}

type RecentGame struct {
    OpponentName     string                `json:"opponentName"`
    Result           models.GameResultType `json:"result"`
    CharacterSetName string                `json:"characterSetName"`
    DurationSeconds  *int                  `json:"durationSeconds"`
    FinishedAt       time.Time             `json:"finishedAt"`
}

type StatsResponse struct {
    GamesPlayed int         `json:"gamesPlayed"`
    Wins        int         `json:"wins"`
    Losses      int         `json:"losses"`
    WinRate     float64     `json:"winRate"`
    TopSet      *SetStat    `json:"topSet"`
    RecentGames []RecentGame `json:"recentGames"`
}

func (s *PlayerService) GetStats(user *models.User) (*StatsResponse, error) {
    var records []models.GameRecord
    if err := s.DB.
        Where("user_id = ?", user.ID).
        Order("finished_at DESC").
        Find(&records).Error; err != nil {
        return nil, err
    }

    resp := &StatsResponse{RecentGames: []RecentGame{}}

    wins := 0
    setCount := map[string]*SetStat{}

    for _, r := range records {
        resp.GamesPlayed++
        if r.Result == models.ResultWin || r.Result == models.ResultForfeitWin {
            wins++
        }
        if _, ok := setCount[r.CharacterSetName]; !ok {
            setCount[r.CharacterSetName] = &SetStat{Name: r.CharacterSetName}
        }
        setCount[r.CharacterSetName].Count++
    }

    resp.Wins = wins
    resp.Losses = resp.GamesPlayed - wins
    if resp.GamesPlayed > 0 {
        resp.WinRate = float64(wins) / float64(resp.GamesPlayed)
    }

    // Top set: most-played set across last 20 records
    limit := 20
    if len(records) < limit {
        limit = len(records)
    }
    recentSetCount := map[string]*SetStat{}
    for _, r := range records[:limit] {
        if _, ok := recentSetCount[r.CharacterSetName]; !ok {
            recentSetCount[r.CharacterSetName] = &SetStat{Name: r.CharacterSetName}
        }
        recentSetCount[r.CharacterSetName].Count++

        resp.RecentGames = append(resp.RecentGames, RecentGame{
            OpponentName:     r.OpponentName,
            Result:           r.Result,
            CharacterSetName: r.CharacterSetName,
            DurationSeconds:  r.DurationSeconds,
            FinishedAt:       r.FinishedAt,
        })
    }

    var topSet *SetStat
    for _, ss := range recentSetCount {
        if topSet == nil || ss.Count > topSet.Count {
            topSet = ss
        }
    }
    resp.TopSet = topSet

    return resp, nil
}

const reportThreshold = 5

func (s *PlayerService) ReportSet(reporterID uuid.UUID, setID uuid.UUID, reason models.ReportReason) error {
    switch reason {
    case models.ReportReasonOffensive,
        models.ReportReasonCopyright,
        models.ReportReasonImages,
        models.ReportReasonSpam:
    default:
        return fmt.Errorf("invalid report reason")
    }

    return s.DB.Transaction(func(tx *gorm.DB) error {
        var existing models.SetReport
        err := tx.Where("user_id = ? AND set_id = ?", reporterID, setID).First(&existing).Error
        if err == nil {
            return fmt.Errorf("already reported")
        }
        if !errors.Is(err, gorm.ErrRecordNotFound) {
            return err
        }

        if err := tx.Create(&models.SetReport{
            UserID: reporterID,
            SetID:  setID,
            Reason: reason,
        }).Error; err != nil {
            return err
        }

        return tx.Model(&models.CharacterSet{}).
            Where("id = ?", setID).
            UpdateColumn("report_count", gorm.Expr("report_count + 1")).Error
    })
}



