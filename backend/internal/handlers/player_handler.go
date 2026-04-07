package handlers

import (
    "encoding/json"
    "net/http"
    "fmt"
    "log"
    "mime/multipart"
    "os"
    "io"
    "strconv"
    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"
    "path/filepath"
    "strings"

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
    publicStr  := r.FormValue("public")
    public, err := strconv.ParseBool(publicStr)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Handle cover image
    var coverImageURL string
    coverFile, coverHeader, err := r.FormFile("coverImage")
    if err == nil {
        defer coverFile.Close()
        coverImageURL, err = saveFile(coverFile, coverHeader.Filename)
        if err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
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
            imageURL, err = saveFile(file, header.Filename)
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
    set, err := h.Service.CreateSet(user, name, description, public, characters, coverImageURL)
    if err != nil {
        http.Error(w, "Failed to create set", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(set)
}

//Helper func
func saveFile(file multipart.File, originalFilename string) (string, error) {
    // Preserve file extension
    ext := strings.ToLower(filepath.Ext(originalFilename))

    // Validate file extension
    allowedExts := map[string]bool{
        ".jpg": true, ".jpeg": true, ".png": true, 
        ".gif": true, ".webp": true,
    }
    
    if !allowedExts[ext] {
        return "", fmt.Errorf("invalid file type: %s", ext)
    }

    // Read first 512 bytes to detect MIME type
    buffer := make([]byte, 512)
    _, err := file.Read(buffer)
    if err != nil {
        return "", fmt.Errorf("failed to read file: %w", err)
    }
    
    // Reset file pointer to beginning
    _, err = file.Seek(0, 0)
    if err != nil {
        return "", fmt.Errorf("failed to reset file pointer: %w", err)
    }
    
    // Verify it's actually an image
    mimeType := http.DetectContentType(buffer)
    if !strings.HasPrefix(mimeType, "image/") {
        return "", fmt.Errorf("file is not an image: %s", mimeType)
    }

    // Generate unique ID
    uniqueID := uuid.New().String()
    
    // Create unique filename
    filename := uniqueID + ext
    
    // Ensure uploads directory exists
    if err := os.MkdirAll("uploads", 0755); err != nil {
        return "", fmt.Errorf("failed to create uploads directory: %w", err)
    }
    
    out, err := os.Create("uploads/" + filename)
    if err != nil {
        return "", fmt.Errorf("failed to create file: %w", err)
    }
    defer out.Close()

    _, err = io.Copy(out, file)
    if err != nil {
        return "", fmt.Errorf("failed to copy file: %w", err)
    }

    log.Println("✅ File saved to uploads/" + filename)
    return "/uploads/" + filename, nil
}


// PUT /set/{setId}
func (h *PlayerHandler) UpdateSetHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    setID, err := uuid.Parse(chi.URLParam(r, "setId"))
    if err != nil {
        http.Error(w, "invalid setId", http.StatusBadRequest)
        return
    }

    if err := r.ParseMultipartForm(10 << 20); err != nil {
        http.Error(w, "Failed to parse form", http.StatusBadRequest)
        return
    }

    name := r.FormValue("name")
    description := r.FormValue("description")
    publicStr := r.FormValue("public")
    public, _ := strconv.ParseBool(publicStr)

    var coverImageURL string
    coverFile, coverHeader, err := r.FormFile("coverImage")
    if err == nil {
        defer coverFile.Close()
        coverImageURL, err = saveFile(coverFile, coverHeader.Filename)
        if err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
    }

    // Parse keep IDs
    var keepIDs []uuid.UUID
    for _, idStr := range r.Form["keepCharacterIds[]"] {
        if id, err := uuid.Parse(idStr); err == nil {
            keepIDs = append(keepIDs, id)
        }
    }

    // Parse new characters
    var newCharacters []models.Character
    for i := 0; ; i++ {
        charName := r.FormValue(fmt.Sprintf("newCharacters[%d][name]", i))
        if charName == "" {
            break
        }
        charImageKey := fmt.Sprintf("newCharacters[%d][image]", i)
        file, header, err := r.FormFile(charImageKey)
        var imageURL string
        if err == nil {
            defer file.Close()
            imageURL, _ = saveFile(file, header.Filename)
        } else {
            imageURL = r.FormValue(charImageKey)
        }
        newCharacters = append(newCharacters, models.Character{Name: charName, Image: imageURL})
    }

    set, err := h.Service.UpdateSet(user, setID, name, description, public, coverImageURL, keepIDs, newCharacters)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(set)
}

// DELETE /set/{setId}
func (h *PlayerHandler) DeleteSetHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    setID, err := uuid.Parse(chi.URLParam(r, "setId"))
    if err != nil {
        http.Error(w, "invalid setId", http.StatusBadRequest)
        return
    }

    if err := h.Service.DeleteSet(user, setID); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    w.WriteHeader(http.StatusNoContent)
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

// GET /set/public
func (h *PlayerHandler) GetSetFromPublicHandler(w http.ResponseWriter, r *http.Request) {
    sets, err := h.Service.GetPublicSets()
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    json.NewEncoder(w).Encode(sets)
}