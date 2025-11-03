package services

import (
	"gorm.io/gorm"

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
func (s *PlayerService) CreateSet(user *models.User, name, description string, characters []models.Character, coverImage string) (*models.CharacterSet, error) {
    set := &models.CharacterSet{
        ID:          uuid.New(),
        UserID:      user.ID,
        Name:        name,
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

// func (s *PlayerService) GetSet(user *models.User) (*models.CharacterSet, error) {

//     // Assign SetID to each character
//     for i := range characters {
//         characters[i].SetID = set.ID
//     }

//     set.Characters = characters

//     if err := s.DB.Create(set).Error; err != nil {
//         return nil, err
//     }

//     return set, nil
// }






