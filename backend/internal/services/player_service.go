package services

import (
	"gorm.io/gorm"
    "fmt"

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







