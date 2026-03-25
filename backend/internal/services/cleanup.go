package services

import (
    "log"
    "time"
    "gorm.io/gorm"
	"github.com/tyler-rafferty2/GuessWho/internal/models")

const staleLobbyThreshold = 30 * time.Minute
const staleGameOverThreshold = 5 * time.Minute

func StartLobbyCleanup(db *gorm.DB) {
    ticker := time.NewTicker(1 * time.Minute)
    go func() {
        for range ticker.C {
            cleanupStaleLobbies(db)
        }
    }()
}

func cleanupStaleLobbies(db *gorm.DB) {
    cutoffInactive := time.Now().Add(-staleLobbyThreshold)
    cutoffGameOver := time.Now().Add(-staleLobbyThreshold)

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