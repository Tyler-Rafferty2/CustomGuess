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
    err = db.AutoMigrate(&models.Lobby{}, &models.Player{}, &models.GameState{}, &models.CharacterSet{},  &models.Character{}, &models.User{})
    if err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    // // Create a character set first
    // charSet := models.CharacterSet{
    //     Name: "Test Set",
    // }

    // if err := db.Create(&charSet).Error; err != nil {
    //     log.Fatal(err)
    // }

    // // Now create characters and assign SetID
    // characters := []models.Character{
    //     {Name: "Bonney", Image: "/images/bonney.webp", SetID: charSet.ID},
    //     {Name: "Buggy", Image: "/images/buggy.webp", SetID: charSet.ID},
    //     {Name: "Chopper", Image: "/images/chopper.webp", SetID: charSet.ID},
    //     {Name: "Dragon", Image: "/images/dragon.webp", SetID: charSet.ID},
    //     {Name: "Enel", Image: "/images/enel.webp", SetID: charSet.ID},
    //     {Name: "Franky", Image: "/images/franky.webp", SetID: charSet.ID},
    //     {Name: "Ivankov", Image: "/images/ivankov.webp", SetID: charSet.ID},
    //     {Name: "Luffy", Image: "/images/luffy.webp", SetID: charSet.ID},
    //     {Name: "Morgans", Image: "/images/morgans.webp", SetID: charSet.ID},
    //     {Name: "Oden", Image: "/images/oden.webp", SetID: charSet.ID},
    //     {Name: "Saint Saturn", Image: "/images/saint_saturn.webp", SetID: charSet.ID},
    //     {Name: "Sanji", Image: "/images/sanji.webp", SetID: charSet.ID},
    //     {Name: "Shanks", Image: "/images/shanks.webp", SetID: charSet.ID},
    //     {Name: "Tama", Image: "/images/tama.webp", SetID: charSet.ID},
    //     {Name: "Yamato", Image: "/images/yamato.webp", SetID: charSet.ID},
    //     {Name: "Zoro", Image: "/images/zoro.webp", SetID: charSet.ID},
    // }

    // // Insert characters into DB
    // for i := range characters {
    //     if err := db.Create(&characters[i]).Error; err != nil {
    //         log.Fatal(err)
    //     }
    // }


    fmt.Println("Database connected and migrated successfully")
}
