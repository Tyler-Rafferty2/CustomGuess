package routes

import (
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/tyler-rafferty2/GuessWho/internal/handlers"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
	"github.com/tyler-rafferty2/GuessWho/internal/config"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
)

func MountRoutes(r chi.Router) {

	// Create services
    userService := services.NewUserService(config.DB)
    lobbyService := services.NewLobbyService(config.DB)
    playerService := services.NewPlayerService(config.DB)

    // Create handler structs
    userHandler := &handlers.UserHandler{Service: userService}
    lobbyHandler := &handlers.LobbyHandler{Service: lobbyService}
    playerHandler := &handlers.PlayerHandler{Service: playerService}

    r.Use(middleware.CORSMiddleware)

    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello from API"))
    })

    r.Route("/users", func(r chi.Router) {
        r.Post("/signup", userHandler.SignUpHandler)
        r.Post("/signin", userHandler.SignInHandler)
        r.Get("/{id}", userHandler.GetUserHandler)
	})


	r.Route("/lobby", func(r chi.Router) {
        r.Use(middleware.UserMiddleware)

        r.Post("/create", lobbyHandler.CreateLobbyHandler)
        r.Post("/join", lobbyHandler.JoinLobbyHandler)
        r.Post("/move", lobbyHandler.MakeMoveHandler)
    })

    r.Route("/player", func(r chi.Router) {
        r.Use(middleware.UserMiddleware)

        r.Get("/", playerHandler.GetPlayersHandler)
    })

}
