package services

import (
	"gorm.io/gorm"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

type GameStateService struct {
    DB *gorm.DB
}

func NewGameStateService(db *gorm.DB) *GameStateService {
    return &GameStateService{DB: db}
}

// Get all game state from lobby and player
func (s *GameStateService) GetGameState(user *models.User, lobbyID string) (*models.GameState, error) {
    var player models.Player

    if err := s.DB.Where("lobby_id = ? AND user_id = ?", lobbyID, user.ID).First(&player).Error; err != nil {
        return nil, err
    }

    var gameState models.GameState
    if err := s.DB.Where("player_id = ?", player.ID).First(&gameState).Error; err != nil {
        return nil, err
    }

    return &gameState, nil
}
