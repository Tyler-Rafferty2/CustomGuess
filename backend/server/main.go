package main

import (
    "fmt"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"

    "github.com/tyler-rafferty2/GuessWho/internal/routes"
)

func main() {
    r := chi.NewRouter()

    // Middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // Mount routes
    routes.MountRoutes(r)

    fmt.Println("Server running on :8080")
    http.ListenAndServe(":8080", r)
}
