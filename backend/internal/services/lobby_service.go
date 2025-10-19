package services

import (
    "encoding/json"
    "errors"
    "math/rand"
    "time"
    "fmt"

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
    var charSet models.CharacterSet
    if err := s.DB.First(&charSet).Error; err != nil {
        return nil, fmt.Errorf("no character sets available: %w", err)
    }

    var characters []models.Character
    if err := s.DB.Where("set_id = ?", charSet.ID).Find(&characters).Error; err != nil {
        return nil, fmt.Errorf("failed to load characters: %w", err)
    }
    if len(characters) == 0 {
        return nil, fmt.Errorf("no characters found for this set")
    }

    lobby := &models.Lobby{
        UserID: user.ID,
        Code: generateLobbyCode(),
        CharacterSetID: charSet.ID,
    }

    if err := s.DB.Create(lobby).Error; err != nil {
        return nil, err
    }

    rand.Seed(time.Now().UnixNano())
    secretChar := characters[rand.Intn(len(characters))]

    player := &models.Player{
        LobbyID: lobby.ID,
        UserID:  user.ID,
        GameState: models.GameState{
            LobbyID:         lobby.ID,      
            SecretCharacter: secretChar,
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
    if err := s.DB.
        Preload("Players").
        Preload("CharacterSet.Characters").
        First(&lobby, "code = ?", code).Error; err != nil {
        return nil, err
    }

    if len(lobby.Players) >= 2 {
        return nil, errors.New("lobby is full")
    }

    // Pick a random character from the lobby's set
    characters := lobby.CharacterSet.Characters
    if len(characters) == 0 {
        return nil, errors.New("character set has no characters")
    }
    rand.Seed(time.Now().UnixNano())
    secretChar := characters[rand.Intn(len(characters))]

    player := &models.Player{
        LobbyID: lobby.ID,
        UserID:  user.ID,
        GameState: models.GameState{
            LobbyID:         lobby.ID,      
            SecretCharacter: secretChar,
        },
    }

    if err := s.DB.Create(player).Error; err != nil {
        return nil, err
    }

    return &lobby, nil
}

//find a lobby for the user to join 
func (s *LobbyService) FindLobby(user *models.User) ([]models.Lobby, error) {

    var lobbies []models.Lobby
    if err := s.DB.Where("user_id != ?", user.ID).Find(&lobbies).Error; err != nil {
        return nil, err
    }

	return lobbies, nil
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

func (s *LobbyService) GetLobbyForPlayer(lobbyID, userID uuid.UUID) (*models.Lobby, *models.Character, error) {
    var lobby models.Lobby

    // Load lobby with character set and all characters, plus players (without secret characters)
    if err := s.DB.
        Preload("CharacterSet.Characters").
        Preload("Players").
        First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return nil, nil, err
    }

    // Load the GameState for this user only
    var gs models.GameState
    if err := s.DB.Preload("SecretCharacter").
        Joins("JOIN players ON players.id = game_states.player_id").
        Where("players.user_id = ? AND players.lobby_id = ?", userID, lobbyID).
        First(&gs).Error; err != nil {
        return &lobby, nil, nil // return lobby even if the secret character isn't found yet
    }

    return &lobby, &gs.SecretCharacter, nil
}

