package services

import (
    "encoding/json"
    "errors"
    "math/rand"
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"

    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

type LobbyService struct {
    DB *gorm.DB
}

func NewLobbyService(db *gorm.DB) *LobbyService {
    return &LobbyService{DB: db}
}

// generate a simple 4-letter lobby code
func generateLobbyCode() string {
    letters := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    b := make([]rune, 4)
    for i := range b {
        b[i] = letters[rand.Intn(len(letters))]
    }
    return string(b)
}

// create a new lobby with the first player
func (s *LobbyService) CreateLobby(user *models.User) (*models.Lobby, error) {
    rand.Seed(time.Now().UnixNano())

    lobby := &models.Lobby{
        Code: generateLobbyCode(),
    }

    if err := s.DB.Create(lobby).Error; err != nil {
        return nil, err
    }

    player := &models.Player{
        LobbyID: lobby.ID,
        UserID:  user.ID,
        Name:    user.Name,
        GameState: models.GameState{
            SecretCharacter: s.chooseRandomCharacter(),
        },
    }

    if err := s.DB.Create(player).Error; err != nil {
        return nil, err
    }

    // Set the turn to the first player
    lobby.TurnID = &player.ID
    s.DB.Save(lobby)

    return lobby, nil
}

// join an existing lobby
func (s *LobbyService) JoinLobby(user *models.User, code string) (*models.Lobby, error) {
    var lobby models.Lobby
    if err := s.DB.Preload("Players").First(&lobby, "code = ?", code).Error; err != nil {
        return nil, err
    }

    if len(lobby.Players) >= 2 {
        return nil, errors.New("lobby is full")
    }

    player := &models.Player{
        LobbyID: lobby.ID,
        UserID:  user.ID,
        Name:    user.Name,
        GameState: models.GameState{
            SecretCharacter: s.chooseRandomCharacter(),
        },
    }

    if err := s.DB.Create(player).Error; err != nil {
        return nil, err
    }

    return &lobby, nil
}

// make a move for a player (update eliminated characters)
func (s *LobbyService) MakeMove(playerID uuid.UUID, guessed string) error {
    var player models.Player
    if err := s.DB.Preload("GameState").First(&player, "id = ?", playerID).Error; err != nil {
        return err
    }

    gs := &player.GameState

    var eliminated []string
    if gs.EliminatedCharacters != nil {
        _ = json.Unmarshal(gs.EliminatedCharacters, &eliminated)
    }

    eliminated = append(eliminated, guessed)
    gs.EliminatedCharacters, _ = json.Marshal(eliminated)

    return s.DB.Save(gs).Error
}

// pick a random character name
func (s *LobbyService) chooseRandomCharacter() string {
    characters := []string{"Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"}
    return characters[rand.Intn(len(characters))]
}
