package main

import (
    "fmt"
    "net/http"
    "os"
    "log"
    "strings"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"

    "github.com/tyler-rafferty2/GuessWho/internal/routes"
    "github.com/tyler-rafferty2/GuessWho/internal/config"
)

func main() {

    config.ConnectDB()

    r := chi.NewRouter()

    // Middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // Mount routes
    routes.MountRoutes(r)

    dirEntries, _ := os.ReadDir("/backend/uploads")
    log.Println("Uploads directory contains:")
    for _, entry := range dirEntries {
        log.Println(" -", entry.Name())
    }

    // Serve /uploads
    FileServer(r, "/uploads/", http.Dir("/backend/uploads"))

    fmt.Println("Server running on :8080")
    http.ListenAndServe(":8080", r)
}


func FileServer(r chi.Router, path string, root http.FileSystem) {
    if strings.ContainsAny(path, "{}*") {
        panic("FileServer does not permit URL parameters.")
    }

    fs := http.StripPrefix(path, http.FileServer(root))
    r.Get(path+"*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fs.ServeHTTP(w, r)
    }))
}