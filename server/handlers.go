package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type API struct {
	store      *Store
	llm        LLMClient
	email      EmailSender
	webBaseURL string
}

type magicLinkReq struct {
	Email string `json:"email"`
}

// currentUser resolves the bearer session token (if any) to a user. Returns
// nil, never an error, when there's no/an invalid token — every endpoint that
// calls this treats "not logged in" as a normal, expected state.
func (a *API) currentUser(c *gin.Context) *User {
	auth := c.GetHeader("Authorization")
	const prefix = "Bearer "
	if len(auth) <= len(prefix) || auth[:len(prefix)] != prefix {
		return nil
	}
	raw := auth[len(prefix):]
	u, err := a.store.GetSessionUser(c.Request.Context(), hashToken(raw))
	if err != nil {
		log.Printf("session lookup error: %v", err)
		return nil
	}
	return u
}

// requireUser is currentUser but writes 401 and returns nil when logged out —
// for endpoints that only make sense with an identity (the dashboard).
func (a *API) requireUser(c *gin.Context) *User {
	u := a.currentUser(c)
	if u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "log in required"})
	}
	return u
}

// POST /api/auth/magic-link — {email} -> emails (or logs, if no email
// provider configured) a one-time login link. Always returns ok:true,
// regardless of whether the email is new or known, so the response never
// reveals whether an account exists.
func (a *API) requestMagicLink(c *gin.Context) {
	var req magicLinkReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email is required"})
		return
	}

	ctx := c.Request.Context()
	raw, hash, err := newToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start login"})
		return
	}
	if err := a.store.CreateMagicLink(ctx, hash, req.Email, magicLinkTTL); err != nil {
		log.Printf("magic link store error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start login"})
		return
	}

	link := a.webBaseURL + "/auth/verify?token=" + raw
	if err := a.email.Send(ctx, req.Email, "Log in to Cue", magicLinkEmailBody(link)); err != nil {
		log.Printf("magic link email error: %v", err)
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GET /api/auth/verify?token=... — consumes the one-time token, gets/creates
// the user, and issues a session token for the client to store + send back
// as `Authorization: Bearer`.
func (a *API) verifyMagicLink(c *gin.Context) {
	raw := c.Query("token")
	if raw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing token"})
		return
	}

	ctx := c.Request.Context()
	email, err := a.store.ConsumeMagicLink(ctx, hashToken(raw))
	if errors.Is(err, ErrMagicLinkInvalid) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "that login link is invalid or has expired"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}

	user, err := a.store.GetOrCreateUser(ctx, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}

	sessionRaw, sessionHash, err := newToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}
	if err := a.store.CreateSession(ctx, sessionHash, user.ID, sessionTTL); err != nil {
		log.Printf("session store error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sessionToken": sessionRaw, "email": user.Email})
}

// GET /api/me — the logged-in user, or 401 if not logged in.
func (a *API) me(c *gin.Context) {
	u := a.requireUser(c)
	if u == nil {
		return
	}
	c.JSON(http.StatusOK, gin.H{"email": u.Email})
}

// POST /api/auth/logout — best-effort session deletion; the client clears
// its stored token regardless of whether this succeeds.
func (a *API) logout(c *gin.Context) {
	auth := c.GetHeader("Authorization")
	const prefix = "Bearer "
	if len(auth) > len(prefix) && auth[:len(prefix)] == prefix {
		_ = a.store.DeleteSession(c.Request.Context(), hashToken(auth[len(prefix):]))
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GET /api/me/decks — the logged-in user's own decks, for the dashboard.
func (a *API) myDecks(c *gin.Context) {
	u := a.requireUser(c)
	if u == nil {
		return
	}
	decks, err := a.store.ListDecksByUser(c.Request.Context(), u.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"decks": decks})
}

type generateReq struct {
	Prompt string `json:"prompt"`
}

type editReq struct {
	Instruction string `json:"instruction"`
	AppTSX      string `json:"appTsx"`
	TokensCSS   string `json:"tokensCss"`
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

// sseHeaders sets the streaming response headers and flushes the status line.
func sseHeaders(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Flush()
}

// stepper emits agent activity steps as SSE `step` events. begin() streams a
// step in the "start" state and returns its id; finish() re-streams the same
// step with a terminal status. The client merges by id.
type stepper struct {
	c *gin.Context
	n int
	m map[string]Step
}

func newStepper(c *gin.Context) *stepper {
	return &stepper{c: c, m: map[string]Step{}}
}

func (s *stepper) begin(kind, label, target string) string {
	s.n++
	id := fmt.Sprintf("s%d", s.n)
	st := Step{ID: id, Kind: kind, Label: label, Target: target, Status: "start"}
	s.m[id] = st
	sse(s.c, "step", st)
	return id
}

func (s *stepper) finish(id, status string) {
	st := s.m[id]
	st.Status = status
	sse(s.c, "step", st)
}

// generateChecked runs the model with a compile-check + silent-retry loop, and
// streams a real activity feed of the work: the agent generation (which may
// itself fetch the web and emit search steps), the tokens.css/App.tsx writes,
// the type-check, and any fix-on-retry. Attempt 1 streams prose deltas; retries
// are silent (their progress is the step feed). Returns the parsed deck once
// CheckDeck passes, or the last error if none did.
func (a *API) generateChecked(ctx context.Context, c *gin.Context, prompt string, sp *stepper) (message, title, tokensCSS, appTSX string, err error) {
	var lastErr error
	for i := 0; i < 3; i++ {
		p := prompt
		if i > 0 {
			fx := sp.begin("fix", "Retake", "")
			sp.finish(fx, "ok")
			p = prompt + "\n\nThe previous attempt did not compile:\n" + lastErr.Error() +
				"\nReturn the COMPLETE corrected deck in the same format."
		}

		opts := GenOptions{
			OnStep: func(st Step) { sse(c, "step", st) },
			Tools:  true,
		}
		if i == 0 {
			opts.OnDelta = func(delta string) { sse(c, "delta", gin.H{"text": delta}) }
		}

		label := "Setting the scene"
		if i > 0 {
			label = "Calling for a retake"
		}
		think := sp.begin("think", label, "")

		raw, gerr := a.llm.Generate(ctx, p, opts)
		if gerr != nil {
			sp.finish(think, "error")
			return "", "", "", "", gerr
		}

		message, title, tokensCSS, appTSX = parseGeneration(raw)
		if appTSX == "" {
			sp.finish(think, "error")
			lastErr = errors.New("the model did not return a valid deck (no App.tsx)")
			continue
		}
		sp.finish(think, "ok")

		if tokensCSS != "" {
			w := sp.begin("write", "Lighting the set", "src/styles/tokens.css")
			sp.finish(w, "ok")
		}
		wa := sp.begin("write", "Blocking the shot", "src/App.tsx")
		sp.finish(wa, "ok")

		chk := sp.begin("check", "Rolling tape", "")
		if cerr := CheckDeck(appTSX); cerr != nil {
			sp.finish(chk, "error")
			lastErr = cerr
			continue
		}
		sp.finish(chk, "ok")
		return message, title, tokensCSS, appTSX, nil
	}
	return "", "", "", "", lastErr
}

// POST /api/decks — stream generation, compile-check + retry, persist, return the deck.
func (a *API) generate(c *gin.Context) {
	var req generateReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Prompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prompt is required"})
		return
	}

	sseHeaders(c)
	ctx := c.Request.Context()

	message, title, tokensCSS, appTSX, err := a.generateChecked(ctx, c, req.Prompt, newStepper(c))
	if err != nil {
		log.Printf("generate error: %v", err)
		sse(c, "error", gin.H{"error": "we couldn't build a working deck — please try again."})
		return
	}
	if title == "" {
		title = "Untitled deck"
	}

	deck := &Deck{
		Owner: "anon", Title: title, Prompt: req.Prompt,
		AppTSX: appTSX, TokensCSS: tokensCSS, IsPublic: true,
	}
	// attribution is optional — an anonymous visitor can still generate a
	// deck, it just won't show up on anyone's dashboard
	if u := a.currentUser(c); u != nil {
		deck.Owner = u.Email
		deck.UserID = &u.ID
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

// POST /api/decks/:id/edit — apply an instruction to an existing deck, streaming
// the reworked design, compile-checking + retrying, then overwriting the deck.
func (a *API) editDeck(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var req editReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Instruction == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "instruction is required"})
		return
	}

	ctx := c.Request.Context()
	deck, err := a.store.GetDeck(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	sseHeaders(c)

	prompt := editPrompt(req.Instruction, req.AppTSX, req.TokensCSS)
	message, title, tokensCSS, appTSX, err := a.generateChecked(ctx, c, prompt, newStepper(c))
	if err != nil {
		log.Printf("edit error: %v", err)
		sse(c, "error", gin.H{"error": "we couldn't apply that change — please try again."})
		return
	}
	if title != "" {
		deck.Title = title
	}
	deck.AppTSX = appTSX
	deck.TokensCSS = tokensCSS

	if err := a.store.UpdateDeck(ctx, deck); err != nil {
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
