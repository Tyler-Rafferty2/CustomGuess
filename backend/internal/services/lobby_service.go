package services

import (
    "encoding/json"
    "errors"
    "math/rand"
    "strings"
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
        Preload("CharacterSet").
        Preload("LobbyCharacters").
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
func (s *LobbyService) CreateLobby(user *models.User, setID uuid.UUID, private bool, randomizeChar bool, chatFeature bool, turnTimerSeconds int) (*models.Lobby, error) {

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

    var setCharacters []models.Character
    if err := s.DB.Where("set_id = ?", charSet.ID).Find(&setCharacters).Error; err != nil {
        return nil, fmt.Errorf("failed to load characters: %w", err)
    }
    if len(setCharacters) == 0 {
        return nil, fmt.Errorf("no characters found for this set")
    }

    log.Printf("Is it chatFeature: %t", chatFeature)

    lobby := &models.Lobby{
        Code:             generateLobbyCode(),
        CharacterSetID:   charSet.ID,
        Private:          private,
        RandomSecret:     randomizeChar,
        ChatFeature:      chatFeature,
        TurnTimerSeconds: turnTimerSeconds,
    }

    if user.IsGuest {
        lobby.GuestID = user.ID
    } else {
        lobby.UserID = user.ID
    }

    if err := s.DB.Create(lobby).Error; err != nil {
        return nil, err
    }

    // Snapshot the set's characters into the lobby so edits don't affect this game
    lobbyChars := make([]models.LobbyCharacter, len(setCharacters))
    for i, c := range setCharacters {
        lobbyChars[i] = models.LobbyCharacter{
            LobbyID: lobby.ID,
            Name:    c.Name,
            Image:   c.Image,
        }
    }
    if err := s.DB.Create(&lobbyChars).Error; err != nil {
        return nil, err
    }

    rand.Seed(time.Now().UnixNano())

    var secretChar *models.LobbyCharacter

    if randomizeChar {
        c := lobbyChars[rand.Intn(len(lobbyChars))]
        secretChar = &c
    }

    player := &models.Player{
        LobbyID: lobby.ID,
        UserID:  user.ID,
        GameState: models.GameState{
            LobbyID:          lobby.ID,
            SecretCharacter:  secretChar,
            SecretCharacterID: nil,
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
        Preload("CharacterSet").
        First(&lobby, "code = ?", code).Error; err != nil {
        return nil, err
    }

    if len(lobby.Players) >= 2 {
        return nil, errors.New("lobby is full")
    }

    // Load the lobby's character snapshot
    var lobbyChars []models.LobbyCharacter
    if err := s.DB.Where("lobby_id = ?", lobby.ID).Find(&lobbyChars).Error; err != nil {
        return nil, err
    }
    if len(lobbyChars) == 0 {
        return nil, errors.New("lobby has no character snapshot")
    }
    rand.Seed(time.Now().UnixNano())

    var secretChar *models.LobbyCharacter

    if lobby.RandomSecret {
        c := lobbyChars[rand.Intn(len(lobbyChars))]
        secretChar = &c
    }

    player := &models.Player{
        LobbyID: lobby.ID,
        Name:    "Guest",
        GameState: models.GameState{
            LobbyID:          lobby.ID,
            SecretCharacter:  secretChar,
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
        Preload("CharacterSet").
        Preload("LobbyCharacters").
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

// MakeMove toggles a character in/out of the player's eliminated list
func (s *LobbyService) MakeMove(user *models.User, lobbyID uuid.UUID, characterID string) error {
    var player models.Player
    if err := s.DB.Where("(user_id = ? OR guest_id = ?) AND lobby_id = ?", user.ID, user.ID, lobbyID).First(&player).Error; err != nil {
        return err
    }

    var gs models.GameState
    if err := s.DB.Where("player_id = ? AND lobby_id = ?", player.ID, lobbyID).First(&gs).Error; err != nil {
        return err
    }

    var eliminated []string
    if gs.EliminatedCharacters != nil {
        _ = json.Unmarshal(gs.EliminatedCharacters, &eliminated)
    }

    // Toggle: remove if present, add if not
    found := false
    updated := make([]string, 0, len(eliminated))
    for _, id := range eliminated {
        if id == characterID {
            found = true
        } else {
            updated = append(updated, id)
        }
    }
    if !found {
        updated = append(updated, characterID)
    }

    gs.EliminatedCharacters, _ = json.Marshal(updated)
    return s.DB.Save(&gs).Error
}

func (s *LobbyService) GetLobbyForPlayer(lobbyID, userID uuid.UUID) (*models.Lobby, *models.LobbyCharacter, *models.LobbyCharacter, []string, error) {
    var lobby models.Lobby

    if err := s.DB.
        Preload("CharacterSet").
        Preload("LobbyCharacters").
        Preload("Players").
        First(&lobby, "id = ?", lobbyID).Error; err != nil {
        return nil, nil, nil, nil, err
    }

    // Load the GameState for this user only
    var gs models.GameState
    if err := s.DB.Preload("SecretCharacter").
        Joins("JOIN players ON players.id = game_states.player_id").
        Where("players.lobby_id = ? AND (players.user_id = ? OR players.guest_id = ?)", lobbyID, userID, userID).
        First(&gs).Error; err != nil {
        return &lobby, nil, nil, nil, nil
    }

    var eliminated []string
    if gs.EliminatedCharacters != nil {
        _ = json.Unmarshal(gs.EliminatedCharacters, &eliminated)
    }
    if eliminated == nil {
        eliminated = []string{}
    }

    // When the game is over, also reveal the opponent's secret character
    var opponentChar *models.LobbyCharacter
    if lobby.GameOver {
        var opponentGS models.GameState
        if err := s.DB.Preload("SecretCharacter").
            Joins("JOIN players ON players.id = game_states.player_id").
            Where("players.lobby_id = ? AND players.user_id != ? AND players.guest_id != ?", lobbyID, userID, userID).
            First(&opponentGS).Error; err == nil && opponentGS.SecretCharacter != nil {
            opponentChar = opponentGS.SecretCharacter
        }
    }

    return &lobby, gs.SecretCharacter, opponentChar, eliminated, nil
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

    allReady := notReadyCount == 0
    if allReady {
        now := time.Now()
        if err := s.DB.Model(&models.Lobby{}).
            Where("id = ? AND game_started_at IS NULL", lobbyID).
            Updates(map[string]interface{}{"game_started_at": now, "turn_started_at": now}).Error; err != nil {
            log.Printf("warn: could not set GameStartedAt: %v", err)
        }
        // Start turn timer for first player if enabled
        if s.Hub != nil {
            var lobby models.Lobby
            if err := s.DB.Preload("Players").First(&lobby, "id = ?", lobbyID).Error; err == nil {
                if lobby.TurnTimerSeconds > 0 && lobby.TurnID != nil {
                    s.Hub.StartTurnTimer(lobbyID.String(), lobby.TurnID.String(), time.Duration(lobby.TurnTimerSeconds)*time.Second)
                }
            }
        }
    }

    s.broadcastLobbyUpdate(lobbyID.String())

    return allReady, nil
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

    var allPlayers []models.Player
    s.DB.Where("lobby_id = ?", lobbyID).Find(&allPlayers)

    if gameState.SecretCharacter.ID.String() == characterID {
        lobby.GameOver = true
        lobby.GameOverAt = &now
        winnerID := player.ID
        lobby.Winner = &winnerID
        if err := s.DB.Save(&lobby).Error; err != nil {
            return nil, err
        }
        s.writeGameRecords(&lobby, allPlayers, player.ID, false)
        s.broadcastLobbyUpdate(lobbyID.String())
        return &lobby, nil
    } else {
        var otherPlayer models.Player
        if err := s.DB.Where("lobby_id = ? AND id != ?", lobbyID, player.ID).First(&otherPlayer).Error; err != nil {
            return nil, err
        }

        lobby.GameOver = true
        lobby.GameOverAt = &now
        lobby.Winner = &otherPlayer.ID
        if err := s.DB.Save(&lobby).Error; err != nil {
            return nil, err
        }
        s.writeGameRecords(&lobby, allPlayers, otherPlayer.ID, false)
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
    var setCharacters []models.Character
    if err := s.DB.Where("set_id = ?", charSet.ID).Find(&setCharacters).Error; err != nil || len(setCharacters) == 0 {
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

    // Snapshot characters for the new lobby
    lobbyChars := make([]models.LobbyCharacter, len(setCharacters))
    for i, c := range setCharacters {
        lobbyChars[i] = models.LobbyCharacter{
            LobbyID: newLobby.ID,
            Name:    c.Name,
            Image:   c.Image,
        }
    }
    if err := s.DB.Create(&lobbyChars).Error; err != nil {
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
        if newLobby.RandomSecret && len(lobbyChars) > 0 {
            c := lobbyChars[rand.Intn(len(lobbyChars))]
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

// ForfeitByPlayerID forfeits the game on behalf of a disconnected player.
// It is a no-op if the game is already over or hasn't started yet.
func (s *LobbyService) ForfeitByPlayerID(playerID, lobbyID string) {
    lobbyUUID, err := uuid.Parse(lobbyID)
    if err != nil {
        log.Printf("ForfeitByPlayerID: invalid lobbyID %s: %v", lobbyID, err)
        return
    }
    playerUUID, err := uuid.Parse(playerID)
    if err != nil {
        log.Printf("ForfeitByPlayerID: invalid playerID %s: %v", playerID, err)
        return
    }

    var lobby models.Lobby
    if err := s.DB.Preload("Players").First(&lobby, "id = ?", lobbyUUID).Error; err != nil {
        log.Printf("ForfeitByPlayerID: lobby not found: %v", err)
        return
    }

    if lobby.GameOver || lobby.GameStartedAt == nil {
        return
    }

    var forfeitingPlayer *models.Player
    var otherPlayer *models.Player
    for i := range lobby.Players {
        p := &lobby.Players[i]
        if p.ID == playerUUID {
            forfeitingPlayer = p
        } else {
            otherPlayer = p
        }
    }

    if forfeitingPlayer == nil {
        log.Printf("ForfeitByPlayerID: player %s not found in lobby %s", playerID, lobbyID)
        return
    }

    now := time.Now()
    lobby.GameOver = true
    lobby.GameOverAt = &now
    if otherPlayer != nil {
        lobby.Winner = &otherPlayer.ID
    }

    if err := s.DB.Save(&lobby).Error; err != nil {
        log.Printf("ForfeitByPlayerID: failed to save lobby: %v", err)
        return
    }

    if otherPlayer != nil {
        s.writeGameRecords(&lobby, lobby.Players, otherPlayer.ID, true)
    }

    s.broadcastLobbyUpdate(lobbyID)
}

// RequestPause lets a player request a timer pause. Broadcasts the updated lobby.
func (s *LobbyService) RequestPause(playerID, lobbyID string) error {
    lobbyUUID, err := uuid.Parse(lobbyID)
    if err != nil {
        return err
    }
    playerUUID, err := uuid.Parse(playerID)
    if err != nil {
        return err
    }
    var lobby models.Lobby
    if err := s.DB.First(&lobby, "id = ?", lobbyUUID).Error; err != nil {
        return err
    }
    if lobby.GameOver || lobby.TurnTimerSeconds == 0 || lobby.TurnTimerPaused || lobby.PauseRequestedBy != nil {
        return nil // silently ignore if pausing doesn't make sense
    }
    lobby.PauseRequestedBy = &playerUUID
    if err := s.DB.Save(&lobby).Error; err != nil {
        return err
    }
    s.broadcastLobbyUpdate(lobbyID)
    return nil
}

// AcceptPause pauses the timer: saves remaining time and cancels the hub timer.
func (s *LobbyService) AcceptPause(playerID, lobbyID string) error {
    lobbyUUID, err := uuid.Parse(lobbyID)
    if err != nil {
        return err
    }
    playerUUID, err := uuid.Parse(playerID)
    if err != nil {
        return err
    }
    var lobby models.Lobby
    if err := s.DB.First(&lobby, "id = ?", lobbyUUID).Error; err != nil {
        return err
    }
    if lobby.GameOver || lobby.TurnTimerSeconds == 0 || lobby.TurnTimerPaused || lobby.PauseRequestedBy == nil {
        return nil
    }
    // Must be accepted by the other player
    if *lobby.PauseRequestedBy == playerUUID {
        return nil // can't accept your own request
    }
    // Calculate remaining ms
    var remainingMs int64
    if lobby.TurnStartedAt != nil {
        elapsed := time.Since(*lobby.TurnStartedAt).Milliseconds()
        total := int64(lobby.TurnTimerSeconds) * 1000
        remainingMs = total - elapsed
        if remainingMs < 0 {
            remainingMs = 0
        }
    }
    if err := s.DB.Model(&lobby).Updates(map[string]interface{}{
        "turn_timer_paused":   true,
        "turn_remaining_ms":   remainingMs,
        "pause_requested_by":  nil,
    }).Error; err != nil {
        return err
    }
    if s.Hub != nil {
        s.Hub.CancelTurnTimer(lobbyID)
    }
    s.broadcastLobbyUpdate(lobbyID)
    return nil
}

// RequestResume lets a player request to resume a paused timer.
func (s *LobbyService) RequestResume(playerID, lobbyID string) error {
    lobbyUUID, err := uuid.Parse(lobbyID)
    if err != nil {
        return err
    }
    playerUUID, err := uuid.Parse(playerID)
    if err != nil {
        return err
    }
    var lobby models.Lobby
    if err := s.DB.First(&lobby, "id = ?", lobbyUUID).Error; err != nil {
        return err
    }
    if lobby.GameOver || !lobby.TurnTimerPaused || lobby.ResumeRequestedBy != nil {
        return nil
    }
    lobby.ResumeRequestedBy = &playerUUID
    if err := s.DB.Save(&lobby).Error; err != nil {
        return err
    }
    s.broadcastLobbyUpdate(lobbyID)
    return nil
}

// AcceptResume lets the other player accept a resume request, restarting the timer.
func (s *LobbyService) AcceptResume(playerID, lobbyID string) error {
    lobbyUUID, err := uuid.Parse(lobbyID)
    if err != nil {
        return err
    }
    playerUUID, err := uuid.Parse(playerID)
    if err != nil {
        return err
    }
    var lobby models.Lobby
    if err := s.DB.First(&lobby, "id = ?", lobbyUUID).Error; err != nil {
        return err
    }
    if lobby.GameOver || !lobby.TurnTimerPaused || lobby.ResumeRequestedBy == nil || lobby.TurnID == nil {
        return nil
    }
    if *lobby.ResumeRequestedBy == playerUUID {
        return nil // can't accept your own request
    }
    remainingMs := lobby.TurnRemainingMs
    if remainingMs <= 0 {
        remainingMs = int64(lobby.TurnTimerSeconds) * 1000
    }
    elapsed := time.Duration(int64(lobby.TurnTimerSeconds)*1000-remainingMs) * time.Millisecond
    newStart := time.Now().Add(-elapsed)
    if err := s.DB.Model(&lobby).Updates(map[string]interface{}{
        "turn_timer_paused":    false,
        "turn_remaining_ms":    0,
        "turn_started_at":      newStart,
        "resume_requested_by":  nil,
    }).Error; err != nil {
        return err
    }
    if s.Hub != nil {
        s.Hub.StartTurnTimer(lobbyID, lobby.TurnID.String(), time.Duration(remainingMs)*time.Millisecond)
    }
    s.broadcastLobbyUpdate(lobbyID)
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

    if otherErr == nil {
        s.writeGameRecords(&lobby, []models.Player{player, otherPlayer}, otherPlayer.ID, true)
    }

    s.broadcastLobbyUpdate(lobbyID.String())
    return &lobby, nil
}

// writeGameRecords writes one GameRecord per registered (non-guest) player at game-over.
// Errors are non-fatal — a stats write failure must never break the game-over response.
func (s *LobbyService) writeGameRecords(lobby *models.Lobby, players []models.Player, winnerPlayerID uuid.UUID, isForfeit bool) {
    if len(players) != 2 || lobby.GameOverAt == nil {
        return
    }

    now := *lobby.GameOverAt

    var durationSeconds *int
    if lobby.GameStartedAt != nil {
        d := int(now.Sub(*lobby.GameStartedAt).Seconds())
        durationSeconds = &d
    }

    var charSet models.CharacterSet
    if err := s.DB.First(&charSet, "id = ?", lobby.CharacterSetID).Error; err != nil {
        log.Printf("warn: writeGameRecords could not load CharacterSet %s: %v", lobby.CharacterSetID, err)
        return
    }

    displayName := func(p models.Player) string {
        if p.UserID == uuid.Nil {
            return "Guest"
        }
        var u models.User
        if err := s.DB.First(&u, "id = ?", p.UserID).Error; err != nil {
            return "Player"
        }
        if u.Username != "" {
            return u.Username
        }
        parts := strings.SplitN(u.Email, "@", 2)
        return parts[0]
    }

    for i, p := range players {
        if p.UserID == uuid.Nil {
            continue
        }

        opponent := players[1-i]
        isWinner := p.ID == winnerPlayerID

        var result models.GameResultType
        switch {
        case isForfeit && isWinner:
            result = models.ResultForfeitWin
        case isForfeit && !isWinner:
            result = models.ResultForfeitLoss
        case isWinner:
            result = models.ResultWin
        default:
            result = models.ResultLoss
        }

        record := models.GameRecord{
            UserID:           p.UserID,
            LobbyID:          lobby.ID,
            OpponentName:     displayName(opponent),
            Result:           result,
            CharacterSetID:   charSet.ID,
            CharacterSetName: charSet.Name,
            DurationSeconds:  durationSeconds,
            FinishedAt:       now,
        }
        if err := s.DB.Create(&record).Error; err != nil {
            log.Printf("warn: failed to write GameRecord for user %s: %v", p.UserID, err)
        }
    }
}