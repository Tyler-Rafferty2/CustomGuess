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

func (s *PlayerService) UpdateSet(user *models.User, setID uuid.UUID, name, description string, public bool, coverImage string, keepCharacterIDs []uuid.UUID, newCharacters []models.Character) (*models.CharacterSet, error) {
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







