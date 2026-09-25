import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

/** Executes the production SQL against real SQLite without React Native. */
export function openTestDatabase() {
  const db = new DatabaseSync(':memory:');
  return {
    execAsync: async (sql: string) => { db.exec(sql); },
    runAsync: async (sql: string, params: SQLInputValue[] = []) => {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, params: SQLInputValue[] = []) => db.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql: string, params: SQLInputValue[] = []) => db.prepare(sql).all(...params),
    withTransactionAsync: async (work: () => Promise<void>) => {
      db.exec('BEGIN');
      try { await work(); db.exec('COMMIT'); }
      catch (err) { db.exec('ROLLBACK'); throw err; }
    },
    closeAsync: async () => { db.close(); },
  };
}
