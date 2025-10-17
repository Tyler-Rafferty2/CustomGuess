package routes

import (
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/tyler-rafferty2/GuessWho/internal/handlers"
)

func MountRoutes(r chi.Router) {
    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello from API"))
    })

    r.Route("/users", func(r chi.Router) {
        r.Get("/{id}", handlers.GetUser)
        r.Post("/", handlers.CreateUser)
    })
}
