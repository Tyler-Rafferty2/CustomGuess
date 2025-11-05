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
    gameStateService := services.NewGameStateService(config.DB)

    // Create handler structs
    userHandler := &handlers.UserHandler{Service: userService}
    lobbyHandler := &handlers.LobbyHandler{Service: lobbyService}
    playerHandler := &handlers.PlayerHandler{Service: playerService}
    gameStateHandler := &handlers.GameStateHandler{Service: gameStateService}

    // Create chat hub and start it
    chatHub := services.NewHub()
    go chatHub.Run()

    wsHandler := handlers.NewWebSocketHandler(chatHub)

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
        r.Get("/find", lobbyHandler.FindLobbyHandler)
        r.Post("/join", lobbyHandler.JoinLobbyHandler)
        r.Post("/move", lobbyHandler.MakeMoveHandler)
        r.Get("/{lobbyID}", lobbyHandler.GetLobbyHandler)
        


    })

    r.Route("/gameState", func(r chi.Router) {
        r.Use(middleware.UserMiddleware)

        r.Get("/{lobbyID}", gameStateHandler.GetGameStateHandler)
    })

    r.Route("/player", func(r chi.Router) {
        r.Use(middleware.UserMiddleware)

        r.Get("/", playerHandler.GetPlayersHandler)
        r.Post("/set/create", playerHandler.CreateSetHandler)
        r.Get("/set/player", playerHandler.GetSetFromPlayerHandler)
    })

    r.Get("/ws", wsHandler.HandleWebSocket)

}
