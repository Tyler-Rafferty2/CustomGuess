package handlers

import (
    "encoding/json"
    "net/http"
    "fmt"
    "log"
    "mime/multipart"
    "os"
    "io"

    "github.com/tyler-rafferty2/GuessWho/internal/services"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

type PlayerHandler struct {
    Service *services.PlayerService
}

// GET /
func (h *PlayerHandler) GetPlayersHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
    players, err := h.Service.GetPlayers(user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(players)
}

// POST /set/create
func (h *PlayerHandler) CreateSetHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    // Parse multipart form (10 MB max)
    if err := r.ParseMultipartForm(10 << 20); err != nil {
        http.Error(w, "Failed to parse form", http.StatusBadRequest)
        return
    }

    // Get basic fields
    name := r.FormValue("name")
    description := r.FormValue("description")

    // Handle cover image
    var coverImageURL string
    coverFile, coverHeader, err := r.FormFile("coverImage")
    if err == nil {
        defer coverFile.Close()
        coverImageURL = saveFile(coverFile, coverHeader.Filename)
    }

    // Handle characters
    characters := []models.Character{}
    for i := 0; ; i++ {
        log.Println("Processing character", i)

        charNameKey := fmt.Sprintf("characters[%d][name]", i)
        charImageKey := fmt.Sprintf("characters[%d][image]", i)

        charName := r.FormValue(charNameKey)
        if charName == "" {
            break // no more characters
        }

        file, header, err := r.FormFile(charImageKey)
        var imageURL string
        if err == nil {
            defer file.Close()
            imageURL = saveFile(file, header.Filename)
        } else {
            // fallback: maybe Base64 string
            log.Println("No file uploaded for", err, "checking for Base64 string")
            imageURL = r.FormValue(charImageKey)
        }

        characters = append(characters, models.Character{
            Name: charName,
            Image: imageURL,
        })
    }

    // Call the service
    set, err := h.Service.CreateSet(user, name, description, characters, coverImageURL)
    if err != nil {
        http.Error(w, "Failed to create set", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(set)
}

//Helper func
func saveFile(file multipart.File, filename string) string {
    log.Println("Attempting to save file:", filename)
    out, err := os.Create("uploads/" + filename)
    if err != nil {
        log.Println("Failed to save file:", err)
        return ""
    }
    defer out.Close()

    _, err = io.Copy(out, file)
    if err != nil {
        log.Println("Failed to copy file:", err)
        return ""
    }

    log.Println("✅ File saved to uploads/" + filename)
    return "/uploads/" + filename
}


// GET /set/player
func (h *PlayerHandler) GetSetFromPlayerHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
    sets, err := h.Service.GetSets(user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(sets)
}