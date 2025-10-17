package config

import (
    "fmt"
    "log"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

var DB *gorm.DB

func ConnectDB() {
    dsn := "host=db user=postgres password=example dbname=mydb port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Store global reference
    DB = db

    // Auto migrate your models
    err = db.AutoMigrate(&models.Lobby{}, &models.Player{}, &models.GameState{}, &models.Character{})
    if err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    fmt.Println("Database connected and migrated successfully")
}
