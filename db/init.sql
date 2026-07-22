-- Cue AI schema (slice 1)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS decks (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner       text        NOT NULL DEFAULT 'anon',
    title       text        NOT NULL DEFAULT 'Untitled deck',
    prompt      text        NOT NULL,
    app_tsx     text        NOT NULL,
    tokens_css  text        NOT NULL DEFAULT '',
    is_public   boolean     NOT NULL DEFAULT true,
    embedding   vector(1536),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decks_public_created_idx
    ON decks (is_public, created_at DESC);

-- ivfflat index for semantic gallery search (used in a later slice)
CREATE INDEX IF NOT EXISTS decks_embedding_idx
    ON decks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Auth (magic link — no passwords). All decks stay public; this is purely
-- identity for a personal "my decks" dashboard, not access control.
CREATE TABLE IF NOT EXISTS users (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       text        NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- one-time login tokens emailed to the user; token_hash so a DB read alone
-- can't be used to log in as someone
CREATE TABLE IF NOT EXISTS magic_links (
    token_hash  text        PRIMARY KEY,
    email       text        NOT NULL,
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- long-lived session, issued once a magic link is verified
CREATE TABLE IF NOT EXISTS sessions (
    token_hash  text        PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE decks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);
CREATE INDEX IF NOT EXISTS decks_user_idx ON decks (user_id, created_at DESC);
