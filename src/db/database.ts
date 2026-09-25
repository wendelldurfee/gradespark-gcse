import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';

/**
 * Opens (once) and migrates the local database. Everything is stored on the
 * device — the app never needs a network connection to run an exam.
 */

const DB_NAME = 'gradespark.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Serialize mutations on the shared connection so unrelated async writes
// cannot accidentally join or nest inside another operation's transaction.
let writes: Promise<unknown> = Promise.resolve();
export function writeDatabase<T>(work: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const next = writes.then(async () => work(await getDatabase()));
  writes = next.catch(() => {});
  return next;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((err) => {
      // Never cache a failed open, or the app is stuck until it is restarted.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // WAL keeps reads fast while a long import writes in the background.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let version = current; version < SCHEMA_VERSION; version++) {
    const migration = MIGRATIONS[version];
    if (!migration) continue;
    await db.execAsync(migration);
  }

  if (current < SCHEMA_VERSION) {
    // PRAGMA does not accept bound parameters, and the value is a local constant.
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }

  return db;
}

/** Wipes every table but keeps the schema. Used by Settings → Reset all data. */
export async function resetDatabase(): Promise<void> {
  await writeDatabase(async (db) => db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM notes;
      DELETE FROM question_stats;
      DELETE FROM attempts;
      DELETE FROM sessions;
      DELETE FROM questions;
      DELETE FROM banks;
    `);
  }));
}

/** Closes the handle so a fresh one is opened on next use (tests, hot reload). */
export async function closeDatabase(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  dbPromise = null;
  await db.closeAsync();
}
