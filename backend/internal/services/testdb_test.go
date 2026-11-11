package services

import (
	"crypto/rand"
	"encoding/hex"
	"net/url"
	"os"
	"testing"

	"github.com/tyler-rafferty2/GuessWho/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// openTestDB returns a GORM connection scoped to a fresh throwaway schema.
// Skipped unless TEST_DATABASE_URL is set (postgres:// URL form).
func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		t.Fatalf("random schema name: %v", err)
	}
	schema := "test_" + hex.EncodeToString(buf)

	cfg := &gorm.Config{DisableForeignKeyConstraintWhenMigrating: true, Logger: logger.Default.LogMode(logger.Silent)}

	admin, err := gorm.Open(postgres.Open(base), cfg)
	if err != nil {
		t.Fatalf("open admin connection: %v", err)
	}
	if err := admin.Exec(`CREATE SCHEMA "` + schema + `"`).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}

	u, err := url.Parse(base)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()

	db, err := gorm.Open(postgres.Open(u.String()), cfg)
	if err != nil {
		t.Fatalf("open test connection: %v", err)
	}

	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
		admin.Exec(`DROP SCHEMA IF EXISTS "` + schema + `" CASCADE`)
		if sqlDB, err := admin.DB(); err == nil {
			sqlDB.Close()
		}
	})

	err = db.AutoMigrate(&models.Lobby{}, &models.Player{}, &models.GameState{}, &models.CharacterSet{}, &models.Character{}, &models.LobbyCharacter{}, &models.User{}, &models.StoredMessage{}, &models.GameRecord{}, &models.SetLike{}, &models.Session{}, &models.SetReport{}, &models.SetCategory{}, &models.GameFeedback{}, &models.PollVote{}, &models.Follow{}, &models.Friendship{})
	if err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}
