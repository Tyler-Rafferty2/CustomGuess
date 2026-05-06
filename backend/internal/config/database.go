package config

import (
    "fmt"
    "log"
    "os"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

var DB *gorm.DB

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}

func ConnectDB() {
    host     := getEnv("DB_HOST", "db")
    user     := getEnv("DB_USER", "postgres")
    password := getEnv("DB_PASSWORD", "example")
    dbname   := getEnv("DB_NAME", "mydb")
    port     := getEnv("DB_PORT", "5432")
    sslmode  := getEnv("DB_SSLMODE", "disable")

    dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s", host, user, password, dbname, port, sslmode)
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{DisableForeignKeyConstraintWhenMigrating: true})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Store global reference
    DB = db

    // Auto migrate your models
    err = db.AutoMigrate(&models.Lobby{}, &models.Player{}, &models.GameState{}, &models.CharacterSet{}, &models.Character{}, &models.LobbyCharacter{}, &models.User{}, &models.StoredMessage{}, &models.GameRecord{}, &models.SetLike{}, &models.Session{}, &models.SetReport{})
    if err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    err = db.Exec("ALTER TABLE players DROP CONSTRAINT IF EXISTS fk_users_players").Error
    if err != nil {
        log.Println("Warning: Failed to drop fk_users_players constraint:", err)
    }


    fmt.Println("Database connected and migrated successfully")
}
