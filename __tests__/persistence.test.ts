import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configForMode, createSession, sessionReducer } from '@/core/session';
import { gradeSession } from '@/core/scoring';
import type { ExamBank, Question } from '@/core/types';

vi.mock('expo-sqlite', async () => {
  const { openTestDatabase } = await import('./helpers/sqlite');
  return { openDatabaseAsync: async () => openTestDatabase() };
});

import { closeDatabase, getDatabase } from '@/db/database';
import { getAttempt, getBank, getNote, getQuestionHistory, getResumableSession,
  getSession, saveAttempt, saveBank, saveNote, saveSession, setQuestionMarked } from '@/db/repositories';
import { useExamStore } from '@/store/examStore';
import { useLibraryStore } from '@/store/libraryStore';

const T0 = 1_700_000_000_000;
const bank: ExamBank = {
  id: 'bank', code: 'TEST', title: 'Original questions', passingScore: 70, timeLimitMinutes: 30,
  questions: [{ id: 'q1', bankId: 'bank', type: 'single', stem: 'Choose alpha.',
    choices: [{ id: 'A', text: 'Alpha' }, { id: 'B', text: 'Beta' }], correct: ['A'] }],
};
const exam = () => useExamStore.getState();

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  await saveBank(bank);
});
afterEach(async () => {
  await exam().persist().catch(() => {});
  exam().clear();
  await closeDatabase();
  vi.useRealTimers();
});

async function start(mode: 'exam' | 'practice' = 'exam') {
  return exam().start(bank.id, configForMode(bank, mode, 1));
}

async function completed() {
  const initial = createSession({ id: 's1', bank, config: configForMode(bank, 'exam', 1), now: T0 });
  await saveSession(initial);
  const answered = sessionReducer(initial, { type: 'ANSWER', index: 0, response: ['A'], now: T0 });
  const submitted = sessionReducer(answered, { type: 'SUBMIT', now: T0 + 10_000 });
  return { submitted, result: gradeSession(submitted, bank, 'a-s1') };
}

describe('database persistence', () => {
  it('preserves sessions, results, flags, notes and history when a bank is re-imported', async () => {
    const { submitted, result } = await completed();
    await saveAttempt(result, submitted);
    await saveNote(bank.id, 'q1', 'Remember alpha.');
    await setQuestionMarked(bank.id, 'q1', true);
    await saveBank({ ...bank, title: 'Updated bank' });
    expect((await getBank(bank.id))?.title).toBe('Updated bank');
    expect(await getAttempt(result.id)).toEqual(result);
    expect(await getSession(submitted.id)).toEqual(submitted);
    expect(await getNote('q1')).toBe('Remember alpha.');
    expect((await getQuestionHistory(bank.id)).get('q1')).toMatchObject({ timesSeen: 1, marked: true });
  });

  it('rolls back session completion if storing the result fails, then permits a retry', async () => {
    const { submitted, result } = await completed();
    const db = await getDatabase();
    await db.execAsync("CREATE TRIGGER fail_result BEFORE INSERT ON attempts BEGIN SELECT RAISE(ABORT, 'disk failure'); END;");
    await expect(saveAttempt(result, submitted)).rejects.toThrow('disk failure');
    expect((await getSession(submitted.id))?.status).toBe('active');
    expect(await getAttempt(result.id)).toBeNull();
    expect((await getQuestionHistory(bank.id)).size).toBe(0);
    await db.execAsync('DROP TRIGGER fail_result');
    await saveAttempt(result, submitted);
    expect((await getSession(submitted.id))?.status).toBe('submitted');
    expect(await getAttempt(result.id)).toEqual(result);
  });

  it('rolls back the report and session if updating statistics fails', async () => {
    const { submitted, result } = await completed();
    const db = await getDatabase();
    await db.execAsync("CREATE TRIGGER fail_stats BEFORE INSERT ON question_stats BEGIN SELECT RAISE(ABORT, 'stats failure'); END;");
    await expect(saveAttempt(result, submitted)).rejects.toThrow('stats failure');
    expect(await getAttempt(result.id)).toBeNull();
    expect((await getSession(submitted.id))?.status).toBe('active');
    await db.execAsync('DROP TRIGGER fail_stats');
  });

  it('counts a repeated or concurrent submission only once', async () => {
    const { submitted, result } = await completed();
    await Promise.all([saveAttempt(result, submitted), saveAttempt(result, submitted)]);
    await saveAttempt(result, submitted);
    expect((await getQuestionHistory(bank.id)).get('q1')?.timesSeen).toBe(1);
    expect(await getResumableSession()).toBeNull();
  });

  it('recovers a submitted session without a result left by an older app version', async () => {
    const { submitted, result } = await completed();
    await saveSession(submitted);
    expect((await getResumableSession())?.id).toBe(submitted.id);
    expect((await getResumableSession(bank.id))?.id).toBe(submitted.id);
    await saveAttempt(result, submitted);
    expect(await getResumableSession()).toBeNull();
  });
});

describe('live exam persistence', () => {
  it('flushes an old session before starting another one', async () => {
    const id = await start();
    exam().answer(0, ['A']);
    await start();
    expect((await getSession(id))?.items[0].response).toEqual(['A']);
    expect(exam().result).toBeNull();
  });

  it('cancels pending autosaves when the active bank is deleted', async () => {
    const id = await start();
    exam().answer(0, ['A']);
    await useLibraryStore.getState().remove(bank.id);
    await vi.advanceTimersByTimeAsync(2000);
    await exam().persist();
    expect(exam().session).toBeNull();
    expect(await getSession(id)).toBeNull();
    expect(await getBank(bank.id)).toBeNull();
  });

  it('saves recent answers while ticks continue every second', async () => {
    const id = await start();
    exam().answer(0, ['B']);
    const timer = setInterval(() => exam().dispatch({ type: 'TICK' }), 1000);
    await vi.advanceTimersByTimeAsync(1600);
    expect((await getSession(id))?.items[0].response).toEqual(['B']);
    exam().answer(0, ['A']);
    await vi.advanceTimersByTimeAsync(1600);
    expect((await getSession(id))?.items[0].response).toEqual(['A']);
    clearInterval(timer);
  });

  it('flushes immediately before leaving/backgrounding, without waiting for autosave', async () => {
    const id = await start();
    exam().answer(0, ['A']);
    await exam().persist();
    expect((await getSession(id))?.items[0].response).toEqual(['A']);
    exam().clear();
    await exam().resume(id);
    expect(exam().session?.items[0].response).toEqual(['A']);
  });

  it('persists pause and excludes paused time after a cold resume', async () => {
    const id = await start();
    await vi.advanceTimersByTimeAsync(1000);
    exam().dispatch({ type: 'PAUSE' });
    await exam().persist();
    exam().clear();
    await vi.advanceTimersByTimeAsync(5000);
    await exam().resume(id);
    expect(exam().session?.status).toBe('paused');
    exam().dispatch({ type: 'RESUME' });
    expect(exam().session?.pausedTotalMs).toBe(5000);
  });

  it('shows failed saves and allows retrying', async () => {
    const id = await start();
    const db = await getDatabase();
    await db.execAsync("CREATE TRIGGER fail_save BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'disk failure'); END;");
    exam().answer(0, ['A']);
    await vi.advanceTimersByTimeAsync(1600);
    expect(exam().saveError).toBeTruthy();
    await db.execAsync('DROP TRIGGER fail_save');
    await exam().persist();
    expect(exam().saveError).toBeNull();
    expect((await getSession(id))?.items[0].response).toEqual(['A']);
  });

  it('shares in-flight submissions and cannot overwrite completion with a pending autosave', async () => {
    const id = await start();
    exam().answer(0, ['A']);
    const a = exam().submit();
    const b = exam().submit();
    expect(a).toBe(b);
    await a;
    await vi.advanceTimersByTimeAsync(3000);
    expect((await getSession(id))?.status).toBe('submitted');
    expect((await getQuestionHistory(bank.id)).get('q1')?.timesSeen).toBe(1);
    expect(await exam().submit()).toEqual(await a);
  });

  it('does not lose the last resumable session after a submission error', async () => {
    const id = await start();
    exam().answer(0, ['A']);
    await exam().persist();
    const db = await getDatabase();
    await db.execAsync("CREATE TRIGGER fail_result BEFORE INSERT ON attempts BEGIN SELECT RAISE(ABORT, 'disk failure'); END;");
    await expect(exam().submit()).rejects.toThrow('disk failure');
    expect(exam().result).toBeNull();
    expect(exam().saveError).toBeTruthy();
    exam().clear();
    expect((await getResumableSession())?.id).toBe(id);
    await db.execAsync('DROP TRIGGER fail_result');
    await exam().resume(id);
    await exam().submit();
    expect(exam().result?.correct).toBe(1);
  });

  it('does not persist an expired status separately from its report', async () => {
    const config = { ...configForMode(bank, 'exam', 1), timeLimitSec: 1 };
    const id = await exam().start(bank.id, config);
    exam().answer(0, ['A']);
    await vi.advanceTimersByTimeAsync(1000);
    exam().dispatch({ type: 'TICK' });
    await vi.advanceTimersByTimeAsync(2000);
    expect((await getSession(id))?.status).toBe('active');
    await exam().persist();
    expect((await getSession(id))?.status).toBe('submitted');
    expect(exam().result?.correct).toBe(1);
  });
});

describe('practice editing', () => {
  async function practice(question: Partial<Question>) {
    await saveBank({ ...bank, questions: [{ ...bank.questions[0], ...question }] });
    await start('practice');
  }

  it('allows typing a full fill-in answer before checking it', async () => {
    await practice({ type: 'fill', correct: ['alpha'], choices: undefined });
    for (const text of ['a', 'al', 'alpha']) {
      exam().answer(0, [text]);
      expect(exam().session?.items[0].revealed).toBe(false);
    }
    exam().dispatch({ type: 'REVEAL', index: 0 });
    expect(exam().session?.items[0].revealed).toBe(true);
    expect((await exam().submit())?.correct).toBe(1);
  });

  it('allows multiple ordering changes before checking', async () => {
    await practice({ type: 'ordering', correct: ['B', 'A'] });
    exam().answer(0, ['A', 'B']);
    exam().answer(0, ['B', 'A']);
    expect(exam().session?.items[0].revealed).toBe(false);
    exam().dispatch({ type: 'REVEAL', index: 0 });
    expect((await exam().submit())?.correct).toBe(1);
  });

  it('still reveals single-choice answers immediately and prevents changing a revealed answer', async () => {
    await practice({});
    exam().answer(0, ['A']);
    expect(exam().session?.items[0].revealed).toBe(true);
    exam().answer(0, ['B']);
    expect(exam().session?.items[0].response).toEqual(['A']);
  });
});
