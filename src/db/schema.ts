/**
 * SQLite schema and migrations.
 *
 * Design note: every row keeps its rich object (a question, a live session, a
 * score report) in a JSON payload column, alongside the handful of scalar
 * columns that are actually queried or indexed. Question banks are read far more
 * often than they are searched, and this keeps the domain types in `src/core` as
 * the single source of truth rather than duplicating them across a wide table.
 */

export const SCHEMA_VERSION = 1;

export const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS banks (
    id                  TEXT PRIMARY KEY NOT NULL,
    code                TEXT NOT NULL,
    title               TEXT NOT NULL,
    vendor              TEXT,
    description         TEXT,
    passing_score       REAL NOT NULL DEFAULT 70,
    time_limit_minutes  INTEGER NOT NULL DEFAULT 90,
    question_count      INTEGER,
    version             TEXT,
    source              TEXT,
    imported_at         INTEGER NOT NULL,
    sections_json       TEXT NOT NULL DEFAULT '[]',
    case_studies_json   TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS questions (
    id            TEXT PRIMARY KEY NOT NULL,
    bank_id       TEXT NOT NULL,
    section_id    TEXT,
    type          TEXT NOT NULL,
    number        INTEGER,
    stem          TEXT NOT NULL,
    payload_json  TEXT NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions (bank_id);
  CREATE INDEX IF NOT EXISTS idx_questions_section ON questions (bank_id, section_id);

  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY NOT NULL,
    bank_id     TEXT NOT NULL,
    mode        TEXT NOT NULL,
    status      TEXT NOT NULL,
    started_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    state_json  TEXT NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status, updated_at DESC);

  CREATE TABLE IF NOT EXISTS attempts (
    id            TEXT PRIMARY KEY NOT NULL,
    session_id    TEXT NOT NULL,
    bank_id       TEXT NOT NULL,
    mode          TEXT NOT NULL,
    percent       REAL NOT NULL,
    passed        INTEGER NOT NULL,
    started_at    INTEGER NOT NULL,
    finished_at   INTEGER NOT NULL,
    duration_sec  INTEGER NOT NULL,
    result_json   TEXT NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_bank ON attempts (bank_id, finished_at DESC);

  -- Rolled up on submit so the question filters stay a single indexed read
  -- instead of a scan over every stored attempt.
  CREATE TABLE IF NOT EXISTS question_stats (
    question_id      TEXT PRIMARY KEY NOT NULL,
    bank_id          TEXT NOT NULL,
    times_seen       INTEGER NOT NULL DEFAULT 0,
    times_correct    INTEGER NOT NULL DEFAULT 0,
    times_incorrect  INTEGER NOT NULL DEFAULT 0,
    marked           INTEGER NOT NULL DEFAULT 0,
    last_seen_at     INTEGER,
    FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_stats_bank ON question_stats (bank_id);

  CREATE TABLE IF NOT EXISTS notes (
    question_id  TEXT PRIMARY KEY NOT NULL,
    bank_id      TEXT NOT NULL,
    body         TEXT NOT NULL,
    updated_at   INTEGER NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key    TEXT PRIMARY KEY NOT NULL,
    value  TEXT NOT NULL
  );
  `,
];
