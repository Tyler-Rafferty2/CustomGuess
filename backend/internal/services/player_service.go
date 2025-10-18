package services

import (
	"gorm.io/gorm"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
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

