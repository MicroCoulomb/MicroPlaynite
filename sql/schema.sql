CREATE TABLE IF NOT EXISTS playnite_games (
    playnite_game_id uuid PRIMARY KEY,
    game_title text NOT NULL,
    user_score integer NOT NULL DEFAULT 0,
    release_year integer NULL,
    completion_status text NOT NULL,
    cover_url text NULL,
    r2_object_key text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_synced_at timestamptz NULL,
    rating_source text NOT NULL DEFAULT 'playnite',
    rating_updated_at timestamptz NOT NULL DEFAULT now(),
    rating_synced_to_playnite_at timestamptz NULL,
    favorite boolean NOT NULL DEFAULT false,
    playtime_seconds bigint NOT NULL DEFAULT 0
);

ALTER TABLE playnite_games ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE playnite_games ADD COLUMN IF NOT EXISTS last_synced_at timestamptz NULL;
ALTER TABLE playnite_games ADD COLUMN IF NOT EXISTS rating_source text NOT NULL DEFAULT 'playnite';
ALTER TABLE playnite_games ADD COLUMN IF NOT EXISTS rating_updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE playnite_games ADD COLUMN IF NOT EXISTS rating_synced_to_playnite_at timestamptz NULL;
ALTER TABLE playnite_games ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;
ALTER TABLE playnite_games ADD COLUMN IF NOT EXISTS playtime_seconds bigint NOT NULL DEFAULT 0;

UPDATE playnite_games
SET updated_at = COALESCE(updated_at, created_at, now()),
    rating_updated_at = COALESCE(rating_updated_at, created_at, now()),
    rating_source = COALESCE(NULLIF(rating_source, ''), 'playnite')
WHERE updated_at IS NULL OR rating_updated_at IS NULL OR rating_source IS NULL OR rating_source = '';

CREATE INDEX IF NOT EXISTS idx_playnite_games_title ON playnite_games (game_title);
CREATE INDEX IF NOT EXISTS idx_playnite_games_rating ON playnite_games (user_score DESC);
CREATE INDEX IF NOT EXISTS idx_playnite_games_release_year ON playnite_games (release_year DESC);
CREATE INDEX IF NOT EXISTS idx_playnite_games_completion_status ON playnite_games (completion_status);
CREATE INDEX IF NOT EXISTS idx_playnite_games_pending_web_rating
    ON playnite_games (rating_updated_at)
    WHERE rating_source = 'web';
