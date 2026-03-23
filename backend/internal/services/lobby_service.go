package services

import (
    "encoding/json"
    "errors"
    "math/rand"
    "time"
    "fmt"
    "log"

    "github.com/google/uuid"
    "gorm.io/gorm"

    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

type LobbyService struct {
    DB  *gorm.DB
    Hub *Hub 
}

func NewLobbyService(db *gorm.DB, hub *Hub) *LobbyService {
    return &LobbyService{
        DB:  db,
        Hub: hub,
    }
}


type LobbyGetter interface {
    GetLobbyByID(lobbyID string) (*models.Lobby, error)
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

func (s *LobbyService) broadcastLobbyUpdate(lobbyID string) {
    if s.Hub == nil {
        return
    }
    
    lobby, err := s.getLobbyFromDB(lobbyID)
    if err != nil {
        log.Printf("Error fetching lobby for broadcast: %v", err)
        return
    }
    
    message := models.Message{
        Type:    "lobby_update",
        LobbyID: lobbyID,
        Channel: "lobby_update",
        Lobby:   lobby,
    }
    
    s.Hub.BroadcastMessage(message)
}

func (s *LobbyService) getLobbyFromDB(lobbyID string) (*models.Lobby, error) {
    var lobby models.Lobby
    lobbyUUID, err := uuid.Parse(lobbyID)
    if err != nil {
        return nil, err
    }
    
    if err := s.DB.Preload("Players").
        Preload("CharacterSet.Characters").
        First(&lobby, "id = ?", lobbyUUID).Error; err != nil {
        return nil, err
    }
    
    return &lobby, nil
}

// create a new lobby with the first player
func (s *LobbyService) CreateLobby(user *models.User, setID uuid.UUID, private bool, randomizeChar bool, chatFeature bool) (*models.Lobby, error) {
    var charSet models.CharacterSet
    if err := s.DB.Where("id = ?", setID).First(&charSet).Error; err != nil {
        return nil, fmt.Errorf("no character sets available: %w", err)
    }

    var characters []models.Character
    if err := s.DB.Where("set_id = ?", charSet.ID).Find(&characters).Error; err != nil {
        return nil, fmt.Errorf("failed to load characters: %w", err)
    }
    if len(characters) == 0 {
        return nil, fmt.Errorf("no characters found for this set")
    }

    log.Printf("Is it chatFeature: %t", chatFeature)


    
    lobby := &models.Lobby{
        Code: generateLobbyCode(),
        CharacterSetID: charSet.ID,
        Private: private,
        RandomSecret: randomizeChar,
        ChatFeature: chatFeature,
    }

    if user.IsGuest {
        lobby.GuestID = user.ID
    } else {
        lobby.UserID = user.ID
    }


    if err := s.DB.Create(lobby).Error; err != nil {
        return nil, err
    }

    rand.Seed(time.Now().UnixNano())
    
    var secretChar *models.Character

    if randomizeChar {
        c := characters[rand.Intn(len(characters))]
        secretChar = &c
    }

    player := &models.Player{
        LobbyID: lobby.ID,
        UserID:  user.ID,
        GameState: models.GameState{
            LobbyID:         lobby.ID,
            SecretCharacter: secretChar,       // ✅ pointer now
            SecretCharacterID: nil,            // optional if no random
        },
    }


    if secretChar != nil {
        player.GameState.SecretCharacter = secretChar
        player.GameState.SecretCharacterID = &secretChar.ID
    }


    if err := s.DB.Create(player).Error; err != nil {
        return nil, err
    }

    // Set the turn to the first player
    lobby.TurnID = &player.ID
    s.DB.Save(lobby)
    log.Printf("right be fore return: %t", lobby.ChatFeature)

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

    var secretChar *models.Character

    if lobby.RandomSecret {
        c := characters[rand.Intn(len(characters))]
        secretChar = &c
    }

    player := &models.Player{
        LobbyID: lobby.ID,
        Name:    "Guest", // Set default name
        GameState: models.GameState{
            LobbyID:           lobby.ID,
            SecretCharacter:   secretChar,
            SecretCharacterID: nil,
        },
    }

    if user.IsGuest {
        player.GuestID = user.ID
    } else {
        player.UserID = user.ID
    }

    if secretChar != nil {
        player.GameState.SecretCharacter = secretChar
        player.GameState.SecretCharacterID = &secretChar.ID
    }

    if err := s.DB.Create(player).Error; err != nil {
        return nil, err
    }

    s.broadcastLobbyUpdate(lobby.ID.String())
    return &lobby, nil
}


func (s *LobbyService) FindLobby(user *models.User) ([]models.Lobby, error) {
    var lobbies []models.Lobby
    
    // Subquery for lobbies with exactly 1 player
    lobbiesWithOnePlayer := s.DB.Table("players").
        Select("lobby_id").
        Group("lobby_id").
        Having("COUNT(*) = ?", 1)
    
    // Subquery for lobbies where user is already a player
    userLobbies := s.DB.Table("players").
        Select("lobby_id").
        Where("user_id = ?", user.ID)
    
    err := s.DB.
        Where("user_id != ?", user.ID).
        Where("id IN (?)", lobbiesWithOnePlayer).
        Where("id NOT IN (?)", userLobbies).
        Find(&lobbies).Error
    
    if err != nil {
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
        Where("players.lobby_id = ? AND (players.user_id = ? OR players.guest_id = ?)", lobbyID, userID, userID).
        First(&gs).Error; err != nil {
        return &lobby, nil, nil // return lobby even if the secret character isn't found yet
    }

    return &lobby, gs.SecretCharacter, nil
}

func (s *LobbyService) MakeGuessLobby(user *models.User, lobbyID uuid.UUID, characterID string) (*models.Lobby, error) {
    var player models.Player
    if err := s.DB.Where("players.lobby_id = ? AND (players.user_id = ? OR players.guest_id = ?)", lobbyID, user.ID, user.ID).First(&player).Error; err != nil {
        return nil, err
    }
    
    var gameState models.GameState
    if err := s.DB.Preload("SecretCharacter").Where("player_id != ? and lobby_id = ?", player.ID, lobbyID).First(&gameState).Error; err != nil {
        return nil, err
    }

    var lobby models.Lobby
    if err := s.DB.First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return nil, err
    }

    if gameState.SecretCharacter.ID.String() == characterID {
        lobby.GameOver = true
        winnerID := player.ID
        lobby.Winner = &winnerID
        if err := s.DB.Save(&lobby).Error; err != nil {
            return nil, err
        }
        s.broadcastLobbyUpdate(lobbyID.String())
        return &lobby, nil
    } else {
        var otherPlayer models.Player
        if err := s.DB.Where("lobby_id = ? AND user_id != ?", lobbyID, user.ID).First(&otherPlayer).Error; err != nil {
            return nil, err
        }
        
        lobby.GameOver = true
        lobby.Winner = &otherPlayer.ID
        if err := s.DB.Save(&lobby).Error; err != nil {
            return nil, err
        }
        s.broadcastLobbyUpdate(lobbyID.String())
        return &lobby, nil
    }
}

type LobbyStatus struct {
    Exists      bool `json:"exists"`
    PlayerCount int  `json:"playerCount"`
    IsFull      bool `json:"isFull"`
    GameStarted bool `json:"gameStarted"`
}

func (s *LobbyService) GetLobbyStatus(lobbyId string) (*LobbyStatus, error) {
    var lobby models.Lobby

    // Load lobby with players to get count
    if err := s.DB.
        Preload("Players").
        First(&lobby, "id = ?", lobbyId).Error; err != nil {
        return nil, err
    }

    return &LobbyStatus{
        Exists:      true,
        PlayerCount: len(lobby.Players),
        IsFull:      len(lobby.Players) >= 2,
    }, nil
}

func (s *LobbyService) SetSecretChar(user *models.User, lobbyID uuid.UUID, characterID uuid.UUID) (*models.GameState, error) {
    // Find the player
    var player models.Player
    if err := s.DB.Where("(user_id = ? OR guest_id = ?) AND lobby_id = ?", user.ID, user.ID, lobbyID).First(&player).Error; err != nil {
        return nil, err
    }
    
    // Find the existing game state
    var gameState models.GameState
    if err := s.DB.Where("player_id = ? AND lobby_id = ?", player.ID, lobbyID).First(&gameState).Error; err != nil {
        return nil, err
    }
    
    // Update the secret character
    gameState.SecretCharacterID = &characterID
    if err := s.DB.Save(&gameState).Error; err != nil {
        return nil, err
    }
    
    // Preload the secret character for the response
    if err := s.DB.Preload("SecretCharacter").First(&gameState, gameState.ID).Error; err != nil {
        return nil, err
    }
    
    // Broadcast lobby update
    s.broadcastLobbyUpdate(lobbyID.String())
    
    return &gameState, nil
}

func (s *LobbyService) ForfeitLobby(user *models.User, lobbyID uuid.UUID) (*models.Lobby, error) {
    var player models.Player
    if err := s.DB.Where("lobby_id = ? AND (user_id = ? OR guest_id = ?)", lobbyID, user.ID, user.ID).First(&player).Error; err != nil {
        return nil, err
    }

    var otherPlayer models.Player
    if err := s.DB.Where("lobby_id = ? AND id != ?", lobbyID, player.ID).First(&otherPlayer).Error; err != nil {
        return nil, err
    }

    var lobby models.Lobby
    if err := s.DB.First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return nil, err
    }

    lobby.GameOver = true
    lobby.Winner = &otherPlayer.ID
    if err := s.DB.Save(&lobby).Error; err != nil {
        return nil, err
    }

    s.broadcastLobbyUpdate(lobbyID.String())
    return &lobby, nil
}