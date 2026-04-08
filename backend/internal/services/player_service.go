package services

import (
	"gorm.io/gorm"
    "fmt"
    "time"

    "github.com/tyler-rafferty2/GuessWho/internal/models"
    "github.com/google/uuid"
)

type PlayerService struct {
    DB *gorm.DB
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
func (s *PlayerService) CreateSet(user *models.User, name, description string, public bool, characters []models.Character, coverImage string) (*models.CharacterSet, error) {
    if len(characters) < 6 {
        return nil, fmt.Errorf("a set must have at least 6 characters")
    }
    set := &models.CharacterSet{
        ID:          uuid.New(),
        UserID:      user.ID,
        Name:        name,
        Public:      public,
        Description: description,
        CoverImage:  coverImage,
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

func (s *PlayerService) GetSets(user *models.User) ([]models.CharacterSet, error) {
    var sets []models.CharacterSet
    
    err := s.DB.Where("user_id = ?", user.ID).
        Preload("Characters"). 
        Find(&sets).Error
    
    if err != nil {
        return nil, fmt.Errorf("failed to get character sets: %w", err)
    }
    
    return sets, nil
}

func (s *PlayerService) UpdateSet(user *models.User, setID uuid.UUID, name, description string, public bool, coverImage string, keepCharacterIDs []uuid.UUID, newCharacters []models.Character) (*models.CharacterSet, error) {
    if len(keepCharacterIDs)+len(newCharacters) < 6 {
        return nil, fmt.Errorf("a set must have at least 6 characters")
    }
    var set models.CharacterSet
    if err := s.DB.Where("id = ? AND user_id = ?", setID, user.ID).First(&set).Error; err != nil {
        return nil, fmt.Errorf("set not found or not owned by user: %w", err)
    }

    set.Name = name
    set.Description = description
    set.Public = public
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

func (s *PlayerService) GetPublicSets() ([]models.CharacterSet, error) {
    var sets []models.CharacterSet

    err := s.DB.Where("public = ?", true).
        Preload("Characters").
        Find(&sets).Error

    if err != nil {
        return nil, fmt.Errorf("failed to get character sets: %w", err)
    }

    return sets, nil
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







