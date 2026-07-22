package main

import (
	"context"
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// load ../.env then ./.env (either location works)
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cfg := loadConfig()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	store, err := NewStore(ctx, cfg.DatabaseURL)
	cancel()
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer store.Close()

	var llm LLMClient
	switch {
	case cfg.OpenAIKey != "":
		llm = NewOpenAIClient(cfg.OpenAIKey, cfg.OpenAIModel, cfg.OpenAIReasoning)
		log.Printf("LLM: %s", llm.Name())
	case cfg.AnthropicKey != "":
		llm = NewAnthropicClient(cfg.AnthropicKey, cfg.AnthropicModel)
		log.Printf("LLM: %s", llm.Name())
	default:
		llm = &CannedClient{}
		log.Printf("LLM: canned (no OPENAI_API_KEY / ANTHROPIC_API_KEY set — decks are sample decks)")
	}

	var emailSender EmailSender
	if cfg.ResendAPIKey != "" {
		emailSender = NewResendEmailSender(cfg.ResendAPIKey, cfg.ResendFromEmail)
		log.Printf("email: resend (%s)", cfg.ResendFromEmail)
	} else {
		emailSender = ConsoleEmailSender{}
		log.Printf("email: console (no RESEND_API_KEY set — magic links are logged, not emailed)")
	}

	api := &API{store: store, llm: llm, email: emailSender, webBaseURL: cfg.AllowOrigin}

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.AllowOrigin},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/api/health", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true, "llm": llm.Name()}) })
	r.POST("/api/decks", api.generate)
	r.GET("/api/decks", api.list)
	r.GET("/api/decks/:id", api.get)
	r.POST("/api/decks/:id/edit", api.editDeck)

	r.POST("/api/auth/magic-link", api.requestMagicLink)
	r.GET("/api/auth/verify", api.verifyMagicLink)
	r.POST("/api/auth/logout", api.logout)
	r.GET("/api/me", api.me)
	r.GET("/api/me/decks", api.myDecks)

	log.Printf("Cue AI server on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
