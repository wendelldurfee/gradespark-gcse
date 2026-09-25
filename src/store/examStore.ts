import { create } from 'zustand';
import { isComplete } from '../core/grading';
import { randomSeed } from '../core/random';
import { gradeSession } from '../core/scoring';
import { createSession, sessionReducer, type SessionAction } from '../core/session';
import type { AttemptResult, ExamBank, Question, Response, SessionConfig, SessionState } from '../core/types';
import {
  deleteSession,
  getBank,
  getQuestionHistory,
  getSession,
  saveAttempt,
  saveSession,
  setQuestionMarked,
} from '../db/repositories';

/**
 * The live exam attempt.
 *
 * All state transitions go through the pure `sessionReducer`; this store only
 * adds persistence. Pending changes are written to SQLite at bounded intervals
 * so a killed app resumes mid-exam with the clock intact.
 */

const AUTOSAVE_MS = 1500;

interface ExamState {
  bank: ExamBank | null;
  /** Question lookup for the questions actually drawn into this attempt. */
  questions: Map<string, Question>;
  session: SessionState | null;
  result: AttemptResult | null;
  loading: boolean;
  error: string | null;
  saveError: string | null;
  persist: () => Promise<void>;

  start: (bankId: string, config: Omit<SessionConfig, 'seed'> & { seed?: number }) => Promise<string>;
  resume: (sessionId: string) => Promise<boolean>;
  dispatch: (action: SessionAction) => void;
  answer: (index: number, response: Response) => void;
  toggleMark: (index: number) => void;
  submit: () => Promise<AttemptResult | null>;
  discard: () => Promise<void>;
  clear: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: SessionState | null = null;
let submission: Promise<AttemptResult | null> | null = null;

function cancelScheduledSave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = null;
  pendingSave = null;
}

function scheduleSave(state: SessionState) {
  // A submitted session and its result must only be saved together.
  if (state.status === 'submitted') return;
  pendingSave = state;
  if (autosaveTimer) return;
  autosaveTimer = setTimeout(() => {
    const latest = pendingSave;
    autosaveTimer = null;
    pendingSave = null;
    if (latest) {
      void saveSession(latest).then(
        () => useExamStore.setState({ saveError: null }),
        () => useExamStore.setState({ saveError: 'Progress could not be saved. Please retry before leaving.' }),
      );
    }
  }, AUTOSAVE_MS);
}

function flushSave(state: SessionState): Promise<void> {
  cancelScheduledSave();
  return saveSession(state);
}

export const useExamStore = create<ExamState>((set, get) => ({
  bank: null,
  questions: new Map(),
  session: null,
  result: null,
  loading: false,
  error: null,
  saveError: null,

  persist: async () => {
    const state = get().session;
    if (!state) return;
    try {
      if (state.status === 'submitted') await get().submit();
      else await flushSave(state);
      set({ saveError: null });
    } catch (err) {
      set({ saveError: 'Progress could not be saved. Please retry before leaving.' });
      throw err;
    }
  },

  start: async (bankId, config) => {
    set({ loading: true, error: null });
    try {
      await get().persist();
      const bank = await getBank(bankId);
      if (!bank) throw new Error('That exam bank is no longer installed.');

      const history = await getQuestionHistory(bankId);
      const session = createSession({
        id: `s-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
        bank,
        config: { ...config, seed: config.seed ?? randomSeed() },
        history,
      });

      await saveSession(session);

      set({
        bank,
        session,
        questions: buildQuestionMap(bank, session),
        result: null,
        saveError: null,
        loading: false,
      });
      return session.id;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  resume: async (sessionId) => {
    // Already in memory — nothing to reload.
    if (get().session?.id === sessionId && get().bank) {
      get().dispatch({ type: 'TICK' });
      return true;
    }

    set({ loading: true, error: null });
    try {
      await get().persist();
      const session = await getSession(sessionId);
      if (!session) {
        set({ loading: false, error: 'That attempt could not be found.' });
        return false;
      }

      const bank = await getBank(session.bankId);
      if (!bank) {
        set({ loading: false, error: 'The exam bank for that attempt was removed.' });
        return false;
      }

      // The clock keeps running while the app is closed, so a resumed attempt
      // may already be over. Reconcile before showing anything.
      const reconciled = sessionReducer(session, { type: 'TICK' });

      set({
        bank,
        session: reconciled,
        result: null,
        saveError: null,
        questions: buildQuestionMap(bank, reconciled),
        loading: false,
      });
      return true;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return false;
    }
  },

  dispatch: (action) => {
    const current = get().session;
    if (!current) return;

    const next = sessionReducer(current, action);
    if (next === current) return;

    set({ session: next });
    if (next.status === 'submitted') cancelScheduledSave();
    else if (action.type === 'PAUSE') void get().persist().catch(() => {});
    else scheduleSave(next);
  },

  answer: (index, response) => {
    const { session, questions } = get();
    const item = session?.items[index];
    const question = item ? questions.get(item.questionId) : undefined;

    get().dispatch({
      type: 'ANSWER',
      index,
      response,
      complete: question ? !['fill', 'ordering'].includes(question.type) && isComplete(question, response) : false,
    });
  },

  toggleMark: (index) => {
    const session = get().session;
    if (!session || session.status === 'submitted' || session.status === 'abandoned') return;

    const item = session.items[index];
    get().dispatch({ type: 'TOGGLE_MARK', index });

    // Mirror the flag into the bank's history so "marked" survives the attempt.
    if (item) {
      void setQuestionMarked(session.bankId, item.questionId, !item.marked).catch(() => {});
    }
  },

  submit: () => {
    if (submission) return submission;
    const { session, bank, result } = get();
    if (!session || !bank) return Promise.resolve(null);
    if (result?.sessionId === session.id) return Promise.resolve(result);

    const submitted = session.status === 'submitted'
      ? session
      : sessionReducer(session, { type: 'SUBMIT' });
    const report = gradeSession(submitted, bank, 'a-' + submitted.id);
    cancelScheduledSave();
    set({ session: submitted });

    submission = saveAttempt(report, submitted).then(() => {
      set({ result: report, saveError: null });
      return report;
    }).catch((err) => {
      set({ saveError: 'Your result has not been saved. Retry submission.' });
      throw err;
    }).finally(() => { submission = null; });
    return submission;
  },

  discard: async () => {
    const session = get().session;
    if (!session) return;
    cancelScheduledSave();
    await deleteSession(session.id);
    set({ session: null, bank: null, questions: new Map(), result: null });
  },

  clear: () => {
    cancelScheduledSave();
    set({ session: null, bank: null, questions: new Map(), result: null, error: null, saveError: null });
  },
}));

function buildQuestionMap(bank: ExamBank, session: SessionState): Map<string, Question> {
  const drawn = new Set(session.items.map((i) => i.questionId));
  return new Map(bank.questions.filter((q) => drawn.has(q.id)).map((q) => [q.id, q]));
}
