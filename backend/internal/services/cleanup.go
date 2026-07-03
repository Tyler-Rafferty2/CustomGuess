package services

import (
    "log"
    "time"
    "gorm.io/gorm"
	"github.com/tyler-rafferty2/GuessWho/internal/models")

const staleLobbyThreshold = 30 * time.Minute
const staleGameOverThreshold = 5 * time.Minute
const staleMessageThreshold = 7 * 24 * time.Hour

func StartLobbyCleanup(db *gorm.DB) {
    ticker := time.NewTicker(3 * time.Minute)
    go func() {
        for range ticker.C {
            cleanupStaleLobbies(db)
            cleanupStaleMessages(db)
        }
    }()
}

func cleanupStaleLobbies(db *gorm.DB) {
    cutoffInactive := time.Now().Add(-staleLobbyThreshold)
    cutoffGameOver := time.Now().Add(-staleGameOverThreshold)

    result := db.
        Where("(game_over = ? AND game_over_at < ?) OR last_active < ?", true, cutoffGameOver, cutoffInactive).
        Delete(&models.Lobby{})

    if result.Error != nil {
        log.Printf("lobby cleanup error: %v", result.Error)
        return
    }

    if result.RowsAffected > 0 {
        log.Printf("cleaned up %d stale/completed lobbies", result.RowsAffected)
    }
}

func cleanupStaleMessages(db *gorm.DB) {
    cutoff := time.Now().Add(-staleMessageThreshold)
    result := db.Where("created_at < ?", cutoff).Delete(&models.StoredMessage{})
    if result.Error != nil {
        log.Printf("message cleanup error: %v", result.Error)
        return
    }
    if result.RowsAffected > 0 {
        log.Printf("cleaned up %d stale messages", result.RowsAffected)
    }
}