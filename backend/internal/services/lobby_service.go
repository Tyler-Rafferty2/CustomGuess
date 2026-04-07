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


func (s *LobbyService) GetMessageHistory(lobbyID string) ([]models.StoredMessage, error) {
    var msgs []models.StoredMessage
    err := s.DB.Where("lobby_id = ? AND channel IN ?", lobbyID, []string{"game", "response"}).
        Order("created_at asc").
        Find(&msgs).Error
    return msgs, err
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

// GetPlayerByUser returns the player record for a given user (registered or guest)
func (s *LobbyService) GetPlayerByUser(user *models.User) (*models.Player, error) {
    var player models.Player

    query := s.DB.Joins("JOIN lobbies ON lobbies.id = players.lobby_id").
        Where("lobbies.game_over = ?", false)

    if user.IsGuest {
        query = query.Where("players.guest_id = ?", user.ID)
    } else {
        query = query.Where("players.user_id = ?", user.ID)
    }

    if err := query.First(&player).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to look up player: %w", err)
    }

    return &player, nil
}

type LobbyError struct {
    Code    string
    LobbyID uuid.UUID
}

func (e *LobbyError) Error() string {
    return e.Code
}

// create a new lobby with the first player
func (s *LobbyService) CreateLobby(user *models.User, setID uuid.UUID, private bool, randomizeChar bool, chatFeature bool) (*models.Lobby, error) {

    existing, err := s.GetPlayerByUser(user)
    if err != nil {
        return nil, err
    }
    if existing != nil {
        return nil, &LobbyError{Code: "ALREADY_IN_GAME", LobbyID: existing.LobbyID}
    }

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
    existing, err := s.GetPlayerByUser(user)
    if err != nil {
        return nil, err
    }
    if existing != nil {
        return nil, &LobbyError{Code: "ALREADY_IN_GAME", LobbyID: existing.LobbyID}
    }

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
        Preload("User").
        Preload("CharacterSet.Characters").
        Where("user_id != ?", user.ID).
        Where("id IN (?)", lobbiesWithOnePlayer).
        Where("id NOT IN (?)", userLobbies).
        Where("private = ?", false).
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

func (s *LobbyService) GetLobbyForPlayer(lobbyID, userID uuid.UUID) (*models.Lobby, *models.Character, *models.Character, error) {
    var lobby models.Lobby

    // Load lobby with character set and all characters, plus players (without secret characters)
    if err := s.DB.
        Preload("CharacterSet.Characters").
        Preload("Players").
        First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return nil, nil, nil, err
    }

    // Load the GameState for this user only
    var gs models.GameState
    if err := s.DB.Preload("SecretCharacter").
        Joins("JOIN players ON players.id = game_states.player_id").
        Where("players.lobby_id = ? AND (players.user_id = ? OR players.guest_id = ?)", lobbyID, userID, userID).
        First(&gs).Error; err != nil {
        return &lobby, nil, nil, nil // return lobby even if the secret character isn't found yet
    }

    // When the game is over, also reveal the opponent's secret character
    var opponentChar *models.Character
    if lobby.GameOver {
        var opponentGS models.GameState
        if err := s.DB.Preload("SecretCharacter").
            Joins("JOIN players ON players.id = game_states.player_id").
            Where("players.lobby_id = ? AND players.user_id != ? AND players.guest_id != ?", lobbyID, userID, userID).
            First(&opponentGS).Error; err == nil && opponentGS.SecretCharacter != nil {
            opponentChar = opponentGS.SecretCharacter
        }
    }

    return &lobby, gs.SecretCharacter, opponentChar, nil
}

func (s *LobbyService) SetPlayerReady(user *models.User, lobbyID uuid.UUID) (bool, error) {
    var player models.Player
    if err := s.DB.Where("lobby_id = ? AND (user_id = ? OR guest_id = ?)", lobbyID, user.ID, user.ID).First(&player).Error; err != nil {
        return false, err
    }

    player.Ready = true
    if err := s.DB.Save(&player).Error; err != nil {
        return false, err
    }

    // Check if all players in the lobby are ready
    var notReadyCount int64
    s.DB.Model(&models.Player{}).Where("lobby_id = ? AND ready = ?", lobbyID, false).Count(&notReadyCount)

    s.broadcastLobbyUpdate(lobbyID.String())

    return notReadyCount == 0, nil
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

    now := time.Now()

    if gameState.SecretCharacter.ID.String() == characterID {
        lobby.GameOver = true
        lobby.GameOverAt = &now
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
        lobby.GameOverAt = &now
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

func (s *LobbyService) RequestRematch(user *models.User, lobbyID uuid.UUID, characterSetID uuid.UUID) error {
    var lobby models.Lobby
    if err := s.DB.Preload("Players").First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return err
    }
    if !lobby.GameOver {
        return errors.New("game is not over")
    }

    var player models.Player
    found := false
    for _, p := range lobby.Players {
        if p.UserID == user.ID || p.GuestID == user.ID {
            player = p
            found = true
            break
        }
    }
    if !found {
        return errors.New("player not found in lobby")
    }

    var charSet models.CharacterSet
    if err := s.DB.Where("id = ?", characterSetID).First(&charSet).Error; err != nil {
        return fmt.Errorf("character set not found: %w", err)
    }

    lobby.RematchRequestedBy = &player.ID
    lobby.RematchCharacterSetID = &characterSetID
    if err := s.DB.Save(&lobby).Error; err != nil {
        return err
    }

    s.Hub.BroadcastMessage(models.Message{
        Type:     "rematch_request",
        LobbyID:  lobbyID.String(),
        Channel:  "rematch_request",
        Content:  charSet.Name,
        SenderId: player.ID.String(),
    })
    return nil
}

func (s *LobbyService) AcceptRematch(user *models.User, lobbyID uuid.UUID) (*models.Lobby, error) {
    var oldLobby models.Lobby
    if err := s.DB.Preload("Players").First(&oldLobby, "id = ?", lobbyID).Error; err != nil {
        return nil, err
    }
    if !oldLobby.GameOver {
        return nil, errors.New("game is not over")
    }
    if oldLobby.RematchRequestedBy == nil || oldLobby.RematchCharacterSetID == nil {
        return nil, errors.New("no rematch requested")
    }

    var requestingPlayer, acceptingPlayer *models.Player
    for i := range oldLobby.Players {
        p := &oldLobby.Players[i]
        if p.ID == *oldLobby.RematchRequestedBy {
            requestingPlayer = p
        }
        if p.UserID == user.ID || p.GuestID == user.ID {
            acceptingPlayer = p
        }
    }
    if acceptingPlayer == nil {
        return nil, errors.New("player not found in lobby")
    }
    if requestingPlayer == nil {
        return nil, errors.New("requesting player not found")
    }
    if requestingPlayer.ID == acceptingPlayer.ID {
        return nil, errors.New("cannot accept your own rematch request")
    }

    var charSet models.CharacterSet
    if err := s.DB.Where("id = ?", *oldLobby.RematchCharacterSetID).First(&charSet).Error; err != nil {
        return nil, fmt.Errorf("character set not found: %w", err)
    }
    var characters []models.Character
    if err := s.DB.Where("set_id = ?", charSet.ID).Find(&characters).Error; err != nil || len(characters) == 0 {
        return nil, fmt.Errorf("no characters found for this set")
    }

    newLobby := &models.Lobby{
        Code:           generateLobbyCode(),
        CharacterSetID: charSet.ID,
        Private:        oldLobby.Private,
        RandomSecret:   oldLobby.RandomSecret,
        ChatFeature:    oldLobby.ChatFeature,
        UserID:         requestingPlayer.UserID,
        GuestID:        requestingPlayer.GuestID,
    }
    if err := s.DB.Create(newLobby).Error; err != nil {
        return nil, err
    }

    rand.Seed(time.Now().UnixNano())

    makePlayer := func(old *models.Player) *models.Player {
        p := &models.Player{
            LobbyID: newLobby.ID,
            UserID:  old.UserID,
            GuestID: old.GuestID,
            GameState: models.GameState{LobbyID: newLobby.ID},
        }
        if newLobby.RandomSecret && len(characters) > 0 {
            c := characters[rand.Intn(len(characters))]
            p.GameState.SecretCharacter = &c
            p.GameState.SecretCharacterID = &c.ID
        }
        return p
    }

    p1 := makePlayer(requestingPlayer)
    if err := s.DB.Create(p1).Error; err != nil {
        return nil, err
    }
    newLobby.TurnID = &p1.ID
    s.DB.Save(newLobby)

    p2 := makePlayer(acceptingPlayer)
    if err := s.DB.Create(p2).Error; err != nil {
        return nil, err
    }

    s.Hub.BroadcastMessage(models.Message{
        Type:    "rematch_ready",
        LobbyID: oldLobby.ID.String(),
        Channel: "rematch_ready",
        Content: newLobby.ID.String(),
    })
    return newLobby, nil
}

func (s *LobbyService) DeclineRematch(user *models.User, lobbyID uuid.UUID) error {
    var lobby models.Lobby
    if err := s.DB.Preload("Players").First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return err
    }
    if !lobby.GameOver || lobby.RematchRequestedBy == nil {
        return errors.New("no rematch to decline")
    }

    var decliningPlayerID string
    for _, p := range lobby.Players {
        if p.UserID == user.ID || p.GuestID == user.ID {
            decliningPlayerID = p.ID.String()
            break
        }
    }

    lobby.RematchRequestedBy = nil
    lobby.RematchCharacterSetID = nil
    if err := s.DB.Save(&lobby).Error; err != nil {
        return err
    }

    s.Hub.BroadcastMessage(models.Message{
        Type:     "rematch_declined",
        LobbyID:  lobbyID.String(),
        Channel:  "rematch_declined",
        SenderId: decliningPlayerID,
    })
    return nil
}

func (s *LobbyService) ForfeitLobby(user *models.User, lobbyID uuid.UUID) (*models.Lobby, error) {
    var player models.Player
    if err := s.DB.Where("lobby_id = ? AND (user_id = ? OR guest_id = ?)", lobbyID, user.ID, user.ID).First(&player).Error; err != nil {
        return nil, err
    }

    var otherPlayer models.Player
    otherErr := s.DB.Where("lobby_id = ? AND id != ?", lobbyID, player.ID).First(&otherPlayer).Error
    if otherErr != nil && !errors.Is(otherErr, gorm.ErrRecordNotFound) {
        return nil, otherErr
    }

    var lobby models.Lobby
    if err := s.DB.First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return nil, err
    }

    now := time.Now()
    lobby.GameOver = true
    lobby.GameOverAt = &now

    if otherErr == nil {
        lobby.Winner = &otherPlayer.ID
    }

    if err := s.DB.Save(&lobby).Error; err != nil {
        return nil, err
    }

    s.broadcastLobbyUpdate(lobbyID.String())
    return &lobby, nil
}