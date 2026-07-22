package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// EmailSender delivers the magic-link email. ConsoleEmailSender (the default)
// just logs it, so the app is fully usable with zero email provider
// configured — set RESEND_API_KEY for real delivery via Resend.
type EmailSender interface {
	Send(ctx context.Context, to, subject, body string) error
}

type ConsoleEmailSender struct{}

func (ConsoleEmailSender) Send(_ context.Context, to, subject, body string) error {
	log.Printf("=== magic link (no RESEND_API_KEY set — logging instead of emailing) ===\nto: %s\nsubject: %s\n%s\n=== end ===", to, subject, body)
	return nil
}

type ResendEmailSender struct {
	apiKey string
	from   string
	http   *http.Client
}

func NewResendEmailSender(apiKey, from string) *ResendEmailSender {
	return &ResendEmailSender{apiKey: apiKey, from: from, http: &http.Client{Timeout: 10 * time.Second}}
}

func (r *ResendEmailSender) Send(ctx context.Context, to, subject, body string) error {
	payload, _ := json.Marshal(map[string]any{
		"from":    r.from,
		"to":      []string{to},
		"subject": subject,
		"html":    body,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// newToken returns a random URL-safe token plus its SHA-256 hash (hex). Only
// the hash is ever stored — a leaked DB row can't be replayed as a login,
// only the raw token (emailed to the user / held by their browser) can.
func newToken() (raw, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	return raw, hashToken(raw), nil
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

const (
	magicLinkTTL = 15 * time.Minute
	sessionTTL   = 30 * 24 * time.Hour
)

func magicLinkEmailBody(link string) string {
	return fmt.Sprintf(
		`<p>Click to log in to Cue:</p><p><a href="%s">%s</a></p><p>This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
		link, link,
	)
}
