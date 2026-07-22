package main

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrMagicLinkInvalid covers an unknown, expired, or already-used token —
// deliberately not distinguished further so we don't leak which case it was.
var ErrMagicLinkInvalid = errors.New("invalid or expired login link")

// Deck is one generated presentation.
type Deck struct {
	ID        uuid.UUID  `json:"id"`
	Owner     string     `json:"owner"`
	UserID    *uuid.UUID `json:"userId,omitempty"`
	Title     string     `json:"title"`
	Prompt    string     `json:"prompt"`
	AppTSX    string     `json:"appTsx"`
	TokensCSS string     `json:"tokensCss"`
	IsPublic  bool       `json:"isPublic"`
	CreatedAt time.Time  `json:"createdAt"`
}

// User is an authenticated identity (magic-link only, no password). All
// decks stay public regardless of ownership — this is for the "my decks"
// dashboard, not access control.
type User struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

// DeckSummary is the shape returned in gallery listings. Includes appTsx/tokensCss
// so cards can render a real live thumbnail instead of a placeholder.
type DeckSummary struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Prompt    string    `json:"prompt"`
	AppTSX    string    `json:"appTsx"`
	TokensCSS string    `json:"tokensCss"`
	CreatedAt time.Time `json:"createdAt"`
}

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(ctx context.Context, url string) (*Store, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

func (s *Store) CreateDeck(ctx context.Context, d *Deck) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO decks (owner, user_id, title, prompt, app_tsx, tokens_css, is_public)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 RETURNING id, created_at`,
		d.Owner, d.UserID, d.Title, d.Prompt, d.AppTSX, d.TokensCSS, d.IsPublic,
	).Scan(&d.ID, &d.CreatedAt)
}

func (s *Store) UpdateDeck(ctx context.Context, d *Deck) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE decks SET title=$2, app_tsx=$3, tokens_css=$4 WHERE id=$1`,
		d.ID, d.Title, d.AppTSX, d.TokensCSS)
	return err
}

func (s *Store) GetDeck(ctx context.Context, id uuid.UUID) (*Deck, error) {
	d := &Deck{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, owner, title, prompt, app_tsx, tokens_css, is_public, created_at
		 FROM decks WHERE id=$1`, id,
	).Scan(&d.ID, &d.Owner, &d.Title, &d.Prompt, &d.AppTSX, &d.TokensCSS, &d.IsPublic, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return d, nil
}

func (s *Store) ListPublicDecks(ctx context.Context, limit int) ([]DeckSummary, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, title, prompt, app_tsx, tokens_css, created_at
		 FROM decks WHERE is_public = true
		 ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []DeckSummary{}
	for rows.Next() {
		var d DeckSummary
		if err := rows.Scan(&d.ID, &d.Title, &d.Prompt, &d.AppTSX, &d.TokensCSS, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// ListDecksByUser is the data source for the "my decks" dashboard — same
// shape as the public gallery, just scoped by owner instead of visibility.
func (s *Store) ListDecksByUser(ctx context.Context, userID uuid.UUID) ([]DeckSummary, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, title, prompt, app_tsx, tokens_css, created_at
		 FROM decks WHERE user_id = $1
		 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []DeckSummary{}
	for rows.Next() {
		var d DeckSummary
		if err := rows.Scan(&d.ID, &d.Title, &d.Prompt, &d.AppTSX, &d.TokensCSS, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// --- auth (magic link) ---

// GetOrCreateUser upserts by email — logging in with a never-seen email
// silently creates the account, matching the "no signup step" magic-link UX.
func (s *Store) GetOrCreateUser(ctx context.Context, email string) (*User, error) {
	u := &User{}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO users (email) VALUES ($1)
		 ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
		 RETURNING id, email, created_at`, email,
	).Scan(&u.ID, &u.Email, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) CreateMagicLink(ctx context.Context, tokenHash, email string, ttl time.Duration) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO magic_links (token_hash, email, expires_at) VALUES ($1, $2, now() + $3)`,
		tokenHash, email, ttl)
	return err
}

// ConsumeMagicLink validates + marks a token used in one statement (atomic —
// two concurrent requests with the same token can't both succeed) and
// returns the email it was issued to.
func (s *Store) ConsumeMagicLink(ctx context.Context, tokenHash string) (string, error) {
	var email string
	err := s.pool.QueryRow(ctx,
		`UPDATE magic_links SET consumed_at = now()
		 WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
		 RETURNING email`, tokenHash,
	).Scan(&email)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrMagicLinkInvalid
	}
	if err != nil {
		return "", err
	}
	return email, nil
}

func (s *Store) CreateSession(ctx context.Context, tokenHash string, userID uuid.UUID, ttl time.Duration) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + $3)`,
		tokenHash, userID, ttl)
	return err
}

// GetSessionUser resolves a session token to its user, or nil if the token
// is unknown/expired (never an error — an anonymous request just isn't logged in).
func (s *Store) GetSessionUser(ctx context.Context, tokenHash string) (*User, error) {
	u := &User{}
	err := s.pool.QueryRow(ctx,
		`SELECT u.id, u.email, u.created_at
		 FROM sessions s JOIN users u ON u.id = s.user_id
		 WHERE s.token_hash = $1 AND s.expires_at > now()`, tokenHash,
	).Scan(&u.ID, &u.Email, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}
