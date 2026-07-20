package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type API struct {
	store *Store
	llm   LLMClient
}

type generateReq struct {
	Prompt string `json:"prompt"`
}

// sse writes one Server-Sent Event and flushes.
func sse(c *gin.Context, event string, payload any) bool {
	b, _ := json.Marshal(payload)
	if _, err := c.Writer.WriteString("event: " + event + "\ndata: " + string(b) + "\n\n"); err != nil {
		return false
	}
	c.Writer.Flush()
	return true
}

// POST /api/decks — stream generation, persist, return the deck.
func (a *API) generate(c *gin.Context) {
	var req generateReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Prompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prompt is required"})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Flush()

	ctx := c.Request.Context()

	raw, err := a.llm.Generate(ctx, req.Prompt, func(delta string) {
		sse(c, "delta", gin.H{"text": delta})
	})
	if err != nil {
		log.Printf("generate error: %v", err)
		sse(c, "error", gin.H{"error": err.Error()})
		return
	}

	message, title, tokensCSS, appTSX := parseGeneration(raw)
	if appTSX == "" {
		sse(c, "error", gin.H{"error": "the model did not return a valid deck (no App.tsx). Try again."})
		return
	}
	if title == "" {
		title = "Untitled deck"
	}

	deck := &Deck{
		Owner: "anon", Title: title, Prompt: req.Prompt,
		AppTSX: appTSX, TokensCSS: tokensCSS, IsPublic: true,
	}
	if err := a.store.CreateDeck(ctx, deck); err != nil {
		log.Printf("store error: %v", err)
		sse(c, "error", gin.H{"error": "failed to save deck"})
		return
	}

	sse(c, "done", gin.H{
		"id":        deck.ID,
		"title":     deck.Title,
		"message":   message,
		"appTsx":    deck.AppTSX,
		"tokensCss": deck.TokensCSS,
	})
}

// GET /api/decks — public gallery.
func (a *API) list(c *gin.Context) {
	decks, err := a.store.ListPublicDecks(c.Request.Context(), 60)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"decks": decks})
}

// GET /api/decks/:id — full deck.
func (a *API) get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	deck, err := a.store.GetDeck(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, deck)
}
