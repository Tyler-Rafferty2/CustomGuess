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
        if err.Error() == "set limit reached" {
            http.Error(w, "You have reached the maximum number of sets (100)", http.StatusForbidden)
            return
        }
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

// GET /set/{setId}
func (h *PlayerHandler) GetSetByIDHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    setID, err := uuid.Parse(chi.URLParam(r, "setId"))
    if err != nil {
        http.Error(w, "invalid setId", http.StatusBadRequest)
        return
    }
    set, err := h.Service.GetSetByID(user, setID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(set)
}

// GET /set/player
func (h *PlayerHandler) GetSetFromPlayerHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)

    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
    if pageSize == 0 {
        pageSize = 12
    }
    params := services.SetListParams{
        Page:     page,
        PageSize: pageSize,
        Search:   r.URL.Query().Get("search"),
    }

    result, err := h.Service.GetSets(user, params)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
}

// GET /set/public
func (h *PlayerHandler) GetSetFromPublicHandler(w http.ResponseWriter, r *http.Request) {
    var callerID *uuid.UUID
    if user := middleware.GetUserFromContext(r); user != nil {
        callerID = &user.ID
    }

    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
    if pageSize == 0 {
        pageSize = 12
    }
    sort := r.URL.Query().Get("sort")
    if sort == "" {
        sort = "most-popular"
    }
    params := services.SetListParams{
        Page:     page,
        PageSize: pageSize,
        Sort:     sort,
        Search:   r.URL.Query().Get("search"),
    }

    result, err := h.Service.GetPublicSets(callerID, params)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
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

// POST /set/{setId}/report
func (h *PlayerHandler) ReportSetHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    if user == nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    setID, err := uuid.Parse(chi.URLParam(r, "setId"))
    if err != nil {
        http.Error(w, "invalid setId", http.StatusBadRequest)
        return
    }

    var body struct {
        Reason models.ReportReason `json:"reason"`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        http.Error(w, "invalid request body", http.StatusBadRequest)
        return
    }

    if err := h.Service.ReportSet(user.ID, setID, body.Reason); err != nil {
        switch err.Error() {
        case "already reported":
            http.Error(w, "already reported", http.StatusConflict)
        case "invalid report reason":
            http.Error(w, "invalid report reason", http.StatusBadRequest)
        default:
            http.Error(w, "failed to submit report", http.StatusInternalServerError)
        }
        return
    }

    w.WriteHeader(http.StatusNoContent)
}