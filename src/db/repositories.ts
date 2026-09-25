import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, writeDatabase } from './database';
import type { QuestionHistory } from '../core/session';
import type {
  AttemptResult,
  CaseStudy,
  ExamBank,
  Question,
  Section,
  SessionState,
} from '../core/types';

/**
 * Data access for every screen. All functions open the shared database handle
 * themselves, so callers never juggle a connection.
 */

// ---------------------------------------------------------------------------
// Banks
// ---------------------------------------------------------------------------

interface BankRow {
  id: string;
  code: string;
  title: string;
  vendor: string | null;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number;
  question_count: number | null;
  version: string | null;
  source: string | null;
  imported_at: number;
  sections_json: string;
  case_studies_json: string;
}

/** A bank plus its counts, without loading every question. */
export interface BankSummary {
  id: string;
  code: string;
  title: string;
  vendor?: string;
  description?: string;
  passingScore: number;
  timeLimitMinutes: number;
  version?: string;
  source?: string;
  importedAt: number;
  totalQuestions: number;
  sections: Section[];
}

export async function listBanks(): Promise<BankSummary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<BankRow & { total: number }>(
    `SELECT b.*, (SELECT COUNT(*) FROM questions q WHERE q.bank_id = b.id) AS total
     FROM banks b
     ORDER BY b.imported_at DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    vendor: row.vendor ?? undefined,
    description: row.description ?? undefined,
    passingScore: row.passing_score,
    timeLimitMinutes: row.time_limit_minutes,
    version: row.version ?? undefined,
    source: row.source ?? undefined,
    importedAt: row.imported_at,
    totalQuestions: row.total,
    sections: parseJson<Section[]>(row.sections_json, []),
  }));
}

/** Loads a bank with all of its questions. */
export async function getBank(bankId: string): Promise<ExamBank | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<BankRow>('SELECT * FROM banks WHERE id = ?', [bankId]);
  if (!row) return null;

  const questionRows = await db.getAllAsync<{ payload_json: string }>(
    'SELECT payload_json FROM questions WHERE bank_id = ? ORDER BY number ASC, rowid ASC',
    [bankId],
  );

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    vendor: row.vendor ?? undefined,
    description: row.description ?? undefined,
    passingScore: row.passing_score,
    timeLimitMinutes: row.time_limit_minutes,
    questionCount: row.question_count ?? undefined,
    version: row.version ?? undefined,
    source: row.source ?? undefined,
    importedAt: row.imported_at,
    sections: parseJson<Section[]>(row.sections_json, []),
    caseStudies: parseJson<CaseStudy[]>(row.case_studies_json, []),
    questions: questionRows.map((q) => JSON.parse(q.payload_json) as Question),
  };
}

/**
 * Inserts or replaces a bank and its questions in one transaction.
 *
 * Re-importing an updated dump replaces the questions but leaves
 * `question_stats` untouched, so history survives for questions whose id (a hash
 * of the stem) has not changed.
 */
export async function saveBank(bank: ExamBank): Promise<void> {
  await writeDatabase(async (db) => {

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO banks
          (id, code, title, vendor, description, passing_score, time_limit_minutes,
           question_count, version, source, imported_at, sections_json, case_studies_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           code = excluded.code, title = excluded.title, vendor = excluded.vendor,
           description = excluded.description, passing_score = excluded.passing_score,
           time_limit_minutes = excluded.time_limit_minutes, question_count = excluded.question_count,
           version = excluded.version, source = excluded.source, imported_at = excluded.imported_at,
           sections_json = excluded.sections_json, case_studies_json = excluded.case_studies_json`,
        [
          bank.id,
          bank.code,
          bank.title,
          bank.vendor ?? null,
          bank.description ?? null,
          bank.passingScore,
          bank.timeLimitMinutes,
          bank.questionCount ?? bank.questions.length,
          bank.version ?? null,
          bank.source ?? null,
          bank.importedAt ?? Date.now(),
          JSON.stringify(bank.sections ?? []),
          JSON.stringify(bank.caseStudies ?? []),
        ],
      );

      await db.runAsync('DELETE FROM questions WHERE bank_id = ?', [bank.id]);

      for (const question of bank.questions) {
        await db.runAsync(
          `INSERT OR REPLACE INTO questions
            (id, bank_id, section_id, type, number, stem, payload_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            question.id,
            bank.id,
            question.sectionId ?? null,
            question.type,
            question.number ?? null,
            question.stem,
            JSON.stringify(question),
          ],
        );
      }
    });
  });
}

/** Cascades to questions, sessions, attempts, stats and notes. */
export async function deleteBank(bankId: string): Promise<void> {
  await writeDatabase(async (db) => {
    await db.runAsync('DELETE FROM banks WHERE id = ?', [bankId]);
  });
}

export async function countQuestions(bankId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM questions WHERE bank_id = ?',
    [bankId],
  );
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function saveSession(state: SessionState): Promise<void> {
  await writeDatabase((db) => writeSession(db, state));
}

async function writeSession(db: SQLiteDatabase, state: SessionState): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO sessions (id, bank_id, mode, status, started_at, updated_at, state_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      state.id,
      state.bankId,
      state.config.mode,
      state.status,
      state.startedAt,
      Date.now(),
      JSON.stringify(state),
    ],
  );
}

export async function getSession(sessionId: string): Promise<SessionState | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ state_json: string }>(
    'SELECT state_json FROM sessions WHERE id = ?',
    [sessionId],
  );
  return row ? (JSON.parse(row.state_json) as SessionState) : null;
}

/** The most recent unfinished attempt, surfaced as "Resume" on the home screen. */
export async function getResumableSession(bankId?: string): Promise<SessionState | null> {
  const db = await getDatabase();
  const row = bankId
    ? await db.getFirstAsync<{ state_json: string }>(
        `SELECT state_json FROM sessions
         WHERE (status IN ('active', 'paused') OR (status = 'submitted' AND NOT EXISTS (SELECT 1 FROM attempts WHERE session_id = sessions.id))) AND bank_id = ?
         ORDER BY updated_at DESC LIMIT 1`,
        [bankId],
      )
    : await db.getFirstAsync<{ state_json: string }>(
        `SELECT state_json FROM sessions
         WHERE (status IN ('active', 'paused') OR (status = 'submitted' AND NOT EXISTS (SELECT 1 FROM attempts WHERE session_id = sessions.id)))
         ORDER BY updated_at DESC LIMIT 1`,
      );
  return row ? (JSON.parse(row.state_json) as SessionState) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await writeDatabase(async (db) => {
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
  });
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

/** Stores the score report and folds it into the per-question stats. */
export async function saveAttempt(result: AttemptResult, session?: SessionState): Promise<void> {
  await writeDatabase(async (db) => {

    await db.withTransactionAsync(async () => {
      if (session) {
        if (session.id !== result.sessionId || session.bankId !== result.bankId || session.status !== 'submitted') {
          throw new Error('The score report does not match the submitted session.');
        }
        await writeSession(db, session);
      }
      const inserted = await db.runAsync(
        `INSERT INTO attempts
          (id, session_id, bank_id, mode, percent, passed, started_at, finished_at, duration_sec, result_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
        [
          result.id,
          result.sessionId,
          result.bankId,
          result.mode,
          result.percent,
          result.passed ? 1 : 0,
          result.startedAt,
          result.finishedAt,
          result.durationSec,
          JSON.stringify(result),
        ],
      );

      if (inserted.changes === 0) return;
      for (const item of result.items) {
        if (!item.answered) continue;
        await applyQuestionOutcome(db, result.bankId, item.questionId, item.correct, result.finishedAt);
      }
    });
  });
}

async function applyQuestionOutcome(
  db: SQLiteDatabase,
  bankId: string,
  questionId: string,
  correct: boolean,
  at: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO question_stats
       (question_id, bank_id, times_seen, times_correct, times_incorrect, marked, last_seen_at)
     VALUES (?, ?, 1, ?, ?, 0, ?)
     ON CONFLICT (question_id) DO UPDATE SET
       times_seen      = times_seen + 1,
       times_correct   = times_correct + excluded.times_correct,
       times_incorrect = times_incorrect + excluded.times_incorrect,
       last_seen_at    = excluded.last_seen_at`,
    [questionId, bankId, correct ? 1 : 0, correct ? 0 : 1, at],
  );
}

export async function listAttempts(bankId?: string, limit = 100): Promise<AttemptResult[]> {
  const db = await getDatabase();
  const rows = bankId
    ? await db.getAllAsync<{ result_json: string }>(
        'SELECT result_json FROM attempts WHERE bank_id = ? ORDER BY finished_at DESC LIMIT ?',
        [bankId, limit],
      )
    : await db.getAllAsync<{ result_json: string }>(
        'SELECT result_json FROM attempts ORDER BY finished_at DESC LIMIT ?',
        [limit],
      );
  return rows.map((r) => JSON.parse(r.result_json) as AttemptResult);
}

export async function getAttempt(attemptId: string): Promise<AttemptResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ result_json: string }>(
    'SELECT result_json FROM attempts WHERE id = ?',
    [attemptId],
  );
  return row ? (JSON.parse(row.result_json) as AttemptResult) : null;
}

export async function deleteAttempt(attemptId: string): Promise<void> {
  await writeDatabase(async (db) => {
    await db.runAsync('DELETE FROM attempts WHERE id = ?', [attemptId]);
  });
}

// ---------------------------------------------------------------------------
// Question history (drives the unseen / incorrect / marked filters)
// ---------------------------------------------------------------------------

export async function getQuestionHistory(bankId: string): Promise<Map<string, QuestionHistory>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    question_id: string;
    times_seen: number;
    times_correct: number;
    times_incorrect: number;
    marked: number;
  }>(
    `SELECT question_id, times_seen, times_correct, times_incorrect, marked
     FROM question_stats WHERE bank_id = ?`,
    [bankId],
  );

  return new Map(
    rows.map((r) => [
      r.question_id,
      {
        questionId: r.question_id,
        timesSeen: r.times_seen,
        timesCorrect: r.times_correct,
        timesIncorrect: r.times_incorrect,
        marked: r.marked === 1,
      },
    ]),
  );
}

/** Persists the flag so it survives past the session it was set in. */
export async function setQuestionMarked(
  bankId: string,
  questionId: string,
  marked: boolean,
): Promise<void> {
  await writeDatabase(async (db) => {
    await db.runAsync(
      `INSERT INTO question_stats (question_id, bank_id, marked)
       VALUES (?, ?, ?)
       ON CONFLICT (question_id) DO UPDATE SET marked = excluded.marked`,
      [questionId, bankId, marked ? 1 : 0],
    );
  });
}

export async function countByFilter(bankId: string): Promise<{
  total: number;
  unseen: number;
  incorrect: number;
  marked: number;
}> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    total: number;
    seen: number;
    incorrect: number;
    marked: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM questions WHERE bank_id = ?) AS total,
       (SELECT COUNT(*) FROM question_stats WHERE bank_id = ? AND times_seen > 0) AS seen,
       (SELECT COUNT(*) FROM question_stats WHERE bank_id = ? AND times_incorrect > 0) AS incorrect,
       (SELECT COUNT(*) FROM question_stats WHERE bank_id = ? AND marked = 1) AS marked`,
    [bankId, bankId, bankId, bankId],
  );

  const total = row?.total ?? 0;
  return {
    total,
    unseen: Math.max(0, total - (row?.seen ?? 0)),
    incorrect: row?.incorrect ?? 0,
    marked: row?.marked ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function getNote(questionId: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ body: string }>(
    'SELECT body FROM notes WHERE question_id = ?',
    [questionId],
  );
  return row?.body ?? null;
}

export async function saveNote(bankId: string, questionId: string, body: string): Promise<void> {
  await writeDatabase(async (db) => {
    if (body.trim().length === 0) {
      await db.runAsync('DELETE FROM notes WHERE question_id = ?', [questionId]);
      return;
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO notes (question_id, bank_id, body, updated_at) VALUES (?, ?, ?, ?)`,
      [questionId, bankId, body, Date.now()],
    );
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await writeDatabase(async (db) => {
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  });
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
