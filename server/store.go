package main

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Deck is one generated presentation.
type Deck struct {
	ID        uuid.UUID `json:"id"`
	Owner     string    `json:"owner"`
	Title     string    `json:"title"`
	Prompt    string    `json:"prompt"`
	AppTSX    string    `json:"appTsx"`
	TokensCSS string    `json:"tokensCss"`
	IsPublic  bool      `json:"isPublic"`
	CreatedAt time.Time `json:"createdAt"`
}

// DeckSummary is the lightweight shape returned in gallery listings.
type DeckSummary struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Prompt    string    `json:"prompt"`
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
		`INSERT INTO decks (owner, title, prompt, app_tsx, tokens_css, is_public)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 RETURNING id, created_at`,
		d.Owner, d.Title, d.Prompt, d.AppTSX, d.TokensCSS, d.IsPublic,
	).Scan(&d.ID, &d.CreatedAt)
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
		`SELECT id, title, prompt, created_at
		 FROM decks WHERE is_public = true
		 ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []DeckSummary{}
	for rows.Next() {
		var d DeckSummary
		if err := rows.Scan(&d.ID, &d.Title, &d.Prompt, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}
