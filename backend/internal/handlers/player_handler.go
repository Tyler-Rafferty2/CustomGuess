package handlers

import (
    "bytes"
    "context"
    "encoding/json"
    "net/http"
    "fmt"
    "log"
    "mime/multipart"
    "io"
    "strconv"
    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"
    "path/filepath"
    "strings"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/tyler-rafferty2/GuessWho/internal/config"
    "github.com/tyler-rafferty2/GuessWho/internal/services"
    "github.com/tyler-rafferty2/GuessWho/internal/middleware"
    "github.com/tyler-rafferty2/GuessWho/internal/models"
)

type PlayerHandler struct {
    Service *services.PlayerService
}

// GET /stats
func (h *PlayerHandler) GetStatsHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    w.Header().Set("Content-Type", "application/json")

    if user == nil || user.IsGuest {
        json.NewEncoder(w).Encode(services.StatsResponse{
            GamesPlayed: 0, Wins: 0, Losses: 0, WinRate: 0,
            RecentGames: []services.RecentGame{},
        })
        return
    }

    stats, err := h.Service.GetStats(user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(stats)
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
    name := truncate(r.FormValue("name"), 50)
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
            Name: truncate(charName, 28),
            Image: imageURL,
        })
    }

    minCharacters, _ := strconv.Atoi(r.FormValue("minCharacters"))

    // Call the service
    set, err := h.Service.CreateSet(user, name, description, public, characters, coverImageURL, minCharacters)
    if err != nil {
        http.Error(w, "Failed to create set", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(set)
}

func truncate(s string, max int) string {
    runes := []rune(s)
    if len(runes) > max {
        return string(runes[:max])
    }
    return s
}

// Helper func — uploads to Cloudflare R2 and returns the public URL
func saveFile(file multipart.File, originalFilename string) (string, error) {
    ext := strings.ToLower(filepath.Ext(originalFilename))

    allowedExts := map[string]bool{
        ".jpg": true, ".jpeg": true, ".png": true,
        ".gif": true, ".webp": true,
    }
    if !allowedExts[ext] {
        return "", fmt.Errorf("invalid file type: %s", ext)
    }

    // Read full file into memory (needed for Content-Length and MIME detection)
    data, err := io.ReadAll(file)
    if err != nil {
        return "", fmt.Errorf("failed to read file: %w", err)
    }

    // Verify it's actually an image
    mimeType := http.DetectContentType(data[:min(512, len(data))])
    if !strings.HasPrefix(mimeType, "image/") {
        return "", fmt.Errorf("file is not an image: %s", mimeType)
    }

    filename := uuid.New().String() + ext

    _, err = config.R2Client.PutObject(context.Background(), &s3.PutObjectInput{
        Bucket:        aws.String(config.R2Bucket),
        Key:           aws.String(filename),
        Body:          bytes.NewReader(data),
        ContentLength: aws.Int64(int64(len(data))),
        ContentType:   aws.String(mimeType),
    })
    if err != nil {
        return "", fmt.Errorf("failed to upload to R2: %w", err)
    }

    publicURL := config.R2PublicURL + "/" + filename
    log.Println("✅ File uploaded to R2:", publicURL)
    return publicURL, nil
}

func min(a, b int) int {
    if a < b {
        return a
    }
    return b
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

    name := truncate(r.FormValue("name"), 50)
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

    // Parse keep characters (id + updated name)
    type keepChar struct {
        ID   uuid.UUID
        Name string
    }
    var keepChars []keepChar
    for i := 0; ; i++ {
        idStr := r.FormValue(fmt.Sprintf("keepCharacters[%d][id]", i))
        if idStr == "" {
            break
        }
        id, err := uuid.Parse(idStr)
        if err != nil {
            continue
        }
        keepChars = append(keepChars, keepChar{ID: id, Name: truncate(r.FormValue(fmt.Sprintf("keepCharacters[%d][name]", i)), 28)})
    }
    var keepIDs []uuid.UUID
    for _, kc := range keepChars {
        keepIDs = append(keepIDs, kc.ID)
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
        newCharacters = append(newCharacters, models.Character{Name: truncate(charName, 28), Image: imageURL})
    }

    nameUpdates := make(map[uuid.UUID]string)
    for _, kc := range keepChars {
        nameUpdates[kc.ID] = kc.Name
    }
    minCharacters, _ := strconv.Atoi(r.FormValue("minCharacters"))
    set, err := h.Service.UpdateSet(user, setID, name, description, public, coverImageURL, keepIDs, newCharacters, nameUpdates, minCharacters)
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
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(sets)
}

// GET /set/public
func (h *PlayerHandler) GetSetFromPublicHandler(w http.ResponseWriter, r *http.Request) {
    var callerID *uuid.UUID
    if idStr := r.Header.Get("X-User-ID"); idStr != "" {
        if id, err := uuid.Parse(idStr); err == nil {
            callerID = &id
        }
    }
    sets, err := h.Service.GetPublicSets(callerID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(sets)
}

// POST /set/{setId}/like
func (h *PlayerHandler) ToggleLikeHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    setID, err := uuid.Parse(chi.URLParam(r, "setId"))
    if err != nil {
        http.Error(w, "invalid setId", http.StatusBadRequest)
        return
    }

    count, likedByMe, err := h.Service.ToggleLike(user.ID, setID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{
        "likeCount": count,
        "likedByMe": likedByMe,
    })
}