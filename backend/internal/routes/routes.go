package routes

import (
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/tyler-rafferty2/GuessWho/internal/config"
	"github.com/tyler-rafferty2/GuessWho/internal/handlers"
	"github.com/tyler-rafferty2/GuessWho/internal/middleware"
	"github.com/tyler-rafferty2/GuessWho/internal/services"
)

func MountRoutes(r chi.Router) {

	// Create chat hub and start it
	chatHub := services.NewHub()
	go chatHub.Run()

	// Create services
	emailService := services.NewEmailService(os.Getenv("RESEND_API_KEY"))
	appBaseURL := os.Getenv("APP_BASE_URL")
	if appBaseURL == "" {
		appBaseURL = "http://localhost:3080"
	}
	sessionService := services.NewSessionService(config.DB)
	userService := services.NewUserService(config.DB, emailService, appBaseURL)
	lobbyService := services.NewLobbyService(config.DB, chatHub)
	chatHub.DisconnectHandler = lobbyService.ForfeitByPlayerID
	chatHub.PreGameDisconnectHandler = lobbyService.PreGameForfeitByPlayerID
	chatHub.IsGameStarted = lobbyService.IsGameStarted
	chatHub.TurnExpiredHandler = lobbyService.ForfeitByPlayerID

	wsHandler := handlers.NewWebSocketHandler(chatHub, lobbyService)
	playerService := services.NewPlayerService(config.DB)
	gameStateService := services.NewGameStateService(config.DB)

	// Create handler structs
	userHandler := &handlers.UserHandler{Service: userService, SessionService: sessionService}
	authHandler := handlers.NewAuthHandler(sessionService)
	lobbyHandler := &handlers.LobbyHandler{Service: lobbyService}
	playerHandler := &handlers.PlayerHandler{Service: playerService}
	gameStateHandler := &handlers.GameStateHandler{Service: gameStateService}

	userMiddleware := middleware.NewUserMiddleware(sessionService)

	r.Use(middleware.CORSMiddleware)
	r.Use(middleware.RateLimitMiddleware)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello from API"))
	})

	// Auth routes
	r.Route("/auth", func(r chi.Router) {
		r.Post("/session", authHandler.GetOrCreateSession)
		r.Post("/logout", authHandler.Logout)

		r.Group(func(r chi.Router) {
			r.Use(userMiddleware)
			r.Get("/me", authHandler.GetMe)
		})
	})

	r.Route("/users", func(r chi.Router) {
		r.Post("/signup", userHandler.SignUpHandler)
		r.Post("/signin", userHandler.SignInHandler)
		r.Get("/{id}", userHandler.GetUserHandler)
		r.Post("/forgot-password", userHandler.ForgotPasswordHandler)
		r.Post("/reset-password", userHandler.ResetPasswordHandler)

		r.Group(func(r chi.Router) {
			r.Use(userMiddleware)
			r.Put("/username", userHandler.UpdateUsernameHandler)
		})
	})

	r.Route("/lobby", func(r chi.Router) {
		r.Get("/{lobbyId}/status", lobbyHandler.GetLobbyStatus)
		r.Get("/{lobbyID}/messages", lobbyHandler.GetMessageHistoryHandler)

		r.Group(func(r chi.Router) {
			r.Use(userMiddleware)

			r.Post("/create", lobbyHandler.CreateLobbyHandler)
			r.Get("/active", lobbyHandler.GetActiveLobbyHandler)
			r.Get("/find", lobbyHandler.FindLobbyHandler)
			r.Post("/join", lobbyHandler.JoinLobbyHandler)
			r.Get("/{lobbyID}", lobbyHandler.GetLobbyHandler)
			r.Post("/{lobbyID}/rematch", lobbyHandler.RequestRematchHandler)
			r.Post("/{lobbyID}/rematch/accept", lobbyHandler.AcceptRematchHandler)
			r.Post("/{lobbyID}/rematch/decline", lobbyHandler.DeclineRematchHandler)

			r.With(middleware.StrictRateLimitMiddleware).Post("/move", lobbyHandler.MakeMoveHandler)
			r.With(middleware.StrictRateLimitMiddleware).Post("/guess", lobbyHandler.GuessLobbyHandler)
			r.With(middleware.StrictRateLimitMiddleware).Post("/setSecretChar", lobbyHandler.SetSecretCharHandler)
			r.With(middleware.StrictRateLimitMiddleware).Post("/forfeit", lobbyHandler.ForfeitHandler)
			r.With(middleware.StrictRateLimitMiddleware).Post("/ready", lobbyHandler.ReadyHandler)
			r.With(middleware.StrictRateLimitMiddleware).Post("/unready", lobbyHandler.UnreadyHandler)
		})
	})

	r.Route("/gameState", func(r chi.Router) {
		r.Use(userMiddleware)
		r.Get("/{lobbyID}", gameStateHandler.GetGameStateHandler)
	})

	optionalUserMiddleware := middleware.NewOptionalUserMiddleware(sessionService)

	r.Route("/player", func(r chi.Router) {
		r.With(optionalUserMiddleware).Get("/set/public", playerHandler.GetSetFromPublicHandler)
		r.With(optionalUserMiddleware).Post("/set/{setId}/report", playerHandler.ReportSetHandler)

		r.Group(func(r chi.Router) {
			r.Use(userMiddleware)

			r.Get("/", playerHandler.GetPlayersHandler)
			r.Get("/stats", playerHandler.GetStatsHandler)
			r.Post("/set/create", playerHandler.CreateSetHandler)
			r.Get("/set/player", playerHandler.GetSetFromPlayerHandler)
			r.Get("/set/{setId}", playerHandler.GetSetByIDHandler)
			r.Put("/set/{setId}", playerHandler.UpdateSetHandler)
			r.Delete("/set/{setId}", playerHandler.DeleteSetHandler)
			r.Post("/set/{setId}/like", playerHandler.ToggleLikeHandler)
		})
	})

	r.Get("/ws", wsHandler.HandleWebSocket)
}
