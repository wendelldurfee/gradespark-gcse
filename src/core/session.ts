import { createRng, sample, shuffle } from './random';
import { isAnswered } from './grading';
import type {
  ExamBank,
  ExamMode,
  Question,
  QuestionFilter,
  Response,
  SessionConfig,
  SessionItem,
  SessionState,
} from './types';

/**
 * The exam session engine.
 *
 * `sessionReducer` is a pure function: every mutation the UI performs goes
 * through it, which keeps the timing/answer/navigation rules in one testable
 * place and lets a session be persisted and resumed by storing the state alone.
 */

/** Per-question history used to resolve the `unseen` / `incorrect` filters. */
export interface QuestionHistory {
  questionId: string;
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  marked: boolean;
}

export const DEFAULT_CONFIG: Omit<SessionConfig, 'bankId'> = {
  mode: 'practice',
  questionCount: 20,
  timeLimitSec: null,
  shuffleQuestions: true,
  shuffleChoices: false,
  sectionIds: [],
  filter: 'all',
  passingScore: 70,
  instantFeedback: true,
  partialCredit: false,
  allowSkip: true,
  showTimer: true,
  seed: 1,
};

/** Sensible defaults per mode, applied before the user's own overrides. */
export function configForMode(bank: ExamBank, mode: ExamMode, seed: number): SessionConfig {
  const base: SessionConfig = {
    ...DEFAULT_CONFIG,
    bankId: bank.id,
    mode,
    seed,
    passingScore: bank.passingScore,
    questionCount: Math.min(bank.questionCount ?? 60, bank.questions.length),
  };

  switch (mode) {
    case 'exam':
      return {
        ...base,
        timeLimitSec: bank.timeLimitMinutes * 60,
        shuffleQuestions: true,
        shuffleChoices: true,
        instantFeedback: false,
        allowSkip: true,
        showTimer: true,
      };
    case 'practice':
      return {
        ...base,
        timeLimitSec: null,
        instantFeedback: true,
        shuffleQuestions: false,
        questionCount: bank.questions.length,
        showTimer: false,
      };
    case 'flashcard':
      return {
        ...base,
        timeLimitSec: null,
        instantFeedback: true,
        shuffleQuestions: true,
        questionCount: Math.min(30, bank.questions.length),
        showTimer: false,
      };
    case 'custom':
    default:
      return base;
  }
}

/** Applies the section and history filters, before any sampling. */
export function filterPool(
  questions: readonly Question[],
  sectionIds: readonly string[],
  filter: QuestionFilter,
  history: ReadonlyMap<string, QuestionHistory>,
): Question[] {
  let pool = questions.slice();

  if (sectionIds.length > 0) {
    const wanted = new Set(sectionIds);
    pool = pool.filter((q) => q.sectionId !== undefined && wanted.has(q.sectionId));
  }

  switch (filter) {
    case 'unseen':
      return pool.filter((q) => (history.get(q.id)?.timesSeen ?? 0) === 0);
    case 'incorrect':
      return pool.filter((q) => (history.get(q.id)?.timesIncorrect ?? 0) > 0);
    case 'marked':
      return pool.filter((q) => history.get(q.id)?.marked === true);
    case 'unanswered':
      return pool.filter((q) => {
        const h = history.get(q.id);
        return !h || h.timesCorrect + h.timesIncorrect === 0;
      });
    case 'all':
    default:
      return pool;
  }
}

export interface CreateSessionInput {
  id: string;
  bank: ExamBank;
  config: SessionConfig;
  history?: ReadonlyMap<string, QuestionHistory>;
  now?: number;
}

/**
 * Draws the questions for an attempt and returns the initial state.
 * Throws when the filters leave nothing to ask.
 */
export function createSession({
  id,
  bank,
  config,
  history = new Map(),
  now = Date.now(),
}: CreateSessionInput): SessionState {
  const rng = createRng(config.seed);
  const pool = filterPool(bank.questions, config.sectionIds, config.filter, history);

  if (pool.length === 0) {
    throw new Error('No questions match the selected sections and filter.');
  }

  const count = Math.max(1, Math.min(config.questionCount, pool.length));
  const drawn = config.shuffleQuestions
    ? sample(pool, count, rng)
    : pool.slice(0, count);

  const items: SessionItem[] = drawn.map((question) => ({
    questionId: question.id,
    choiceOrder: buildChoiceOrder(question, config.shuffleChoices, rng),
    response: [],
    marked: false,
    revealed: false,
    timeSpentMs: 0,
    firstSeenAt: null,
    answeredAt: null,
  }));

  items[0].firstSeenAt = now;

  return {
    id,
    bankId: bank.id,
    config: { ...config, questionCount: items.length },
    items,
    currentIndex: 0,
    status: 'active',
    startedAt: now,
    pausedAt: null,
    pausedTotalMs: 0,
    lastTickAt: now,
    submittedAt: null,
  };
}

/**
 * Ordering questions must start scrambled or the answer is already on screen,
 * so their tokens are always shuffled regardless of the `shuffleChoices` flag.
 */
function buildChoiceOrder(question: Question, shuffleChoices: boolean, rng: () => number): string[] {
  const ids = (question.choices ?? []).map((c) => c.id);
  if (ids.length === 0) return [];
  if (question.type === 'ordering') return shuffle(ids, rng);
  return shuffleChoices ? shuffle(ids, rng) : ids;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export type SessionAction =
  /**
   * `complete` says whether the response satisfies everything the question asks
   * for. The reducer has no access to the question bank, so the caller computes
   * it with `isComplete`; it decides whether instant feedback fires now.
   */
  | { type: 'ANSWER'; index: number; response: Response; complete?: boolean; now?: number }
  | { type: 'TOGGLE_MARK'; index: number; now?: number }
  | { type: 'REVEAL'; index: number; now?: number }
  | { type: 'GOTO'; index: number; now?: number }
  | { type: 'NEXT'; now?: number }
  | { type: 'PREV'; now?: number }
  | { type: 'TICK'; now?: number }
  | { type: 'PAUSE'; now?: number }
  | { type: 'RESUME'; now?: number }
  | { type: 'SUBMIT'; now?: number }
  | { type: 'ABANDON'; now?: number };

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  const now = action.now ?? Date.now();

  // A submitted or abandoned attempt is immutable.
  if (state.status === 'submitted' || state.status === 'abandoned') return state;

  switch (action.type) {
    case 'ANSWER': {
      if (state.status !== 'active' || state.items[action.index]?.revealed) return state;
      const billed = billTime(state, now);
      const items = billed.items.slice();
      const item = items[action.index];
      if (!item) return billed;

      items[action.index] = {
        ...item,
        response: action.response,
        answeredAt: action.response.length > 0 ? now : null,
        // Instant-feedback modes reveal as soon as the response is *complete*,
        // never part-way through a multi-select.
        revealed: item.revealed || (billed.config.instantFeedback && action.complete === true),
      };
      return { ...billed, items, lastTickAt: now };
    }

    case 'TOGGLE_MARK': {
      const items = state.items.slice();
      const item = items[action.index];
      if (!item) return state;
      items[action.index] = { ...item, marked: !item.marked };
      return { ...state, items };
    }

    case 'REVEAL': {
      if (state.status !== 'active' || !state.config.instantFeedback) return state;
      const items = state.items.slice();
      const item = items[action.index];
      if (!item) return state;
      items[action.index] = { ...item, revealed: true };
      return { ...state, items };
    }

    case 'GOTO':
      return moveTo(state, action.index, now);

    case 'NEXT':
      return moveTo(state, state.currentIndex + 1, now);

    case 'PREV':
      return moveTo(state, state.currentIndex - 1, now);

    case 'TICK': {
      const billed = billTime(state, now);
      // Auto-submit the moment the clock runs out, exactly like a real VCE run.
      if (isExpired(billed, now)) {
        return { ...billed, status: 'submitted', submittedAt: now, lastTickAt: now };
      }
      return billed;
    }

    case 'PAUSE': {
      if (state.status !== 'active') return state;
      const billed = billTime(state, now);
      return { ...billed, status: 'paused', pausedAt: now, lastTickAt: now };
    }

    case 'RESUME': {
      if (state.status !== 'paused' || state.pausedAt === null) return state;
      return {
        ...state,
        status: 'active',
        pausedTotalMs: state.pausedTotalMs + (now - state.pausedAt),
        pausedAt: null,
        lastTickAt: now,
      };
    }

    case 'SUBMIT': {
      const billed = billTime(state, now);
      return { ...billed, status: 'submitted', submittedAt: now, lastTickAt: now };
    }

    case 'ABANDON':
      return { ...billTime(state, now), status: 'abandoned', lastTickAt: now };

    default:
      return state;
  }
}

function moveTo(state: SessionState, index: number, now: number): SessionState {
  const clamped = Math.max(0, Math.min(index, state.items.length - 1));
  if (clamped === state.currentIndex) return billTime(state, now);

  const billed = billTime(state, now);
  const items = billed.items.slice();
  const target = items[clamped];
  if (target.firstSeenAt === null) {
    items[clamped] = { ...target, firstSeenAt: now };
  }
  return { ...billed, items, currentIndex: clamped, lastTickAt: now };
}

/** Charges the time since the last tick to the question currently on screen. */
function billTime(state: SessionState, now: number): SessionState {
  if (state.status !== 'active') return { ...state, lastTickAt: now };

  const delta = Math.max(0, now - state.lastTickAt);
  if (delta === 0) return state;

  const items = state.items.slice();
  const current = items[state.currentIndex];
  if (current) {
    items[state.currentIndex] = { ...current, timeSpentMs: current.timeSpentMs + delta };
  }
  return { ...state, items, lastTickAt: now };
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

/** Milliseconds of active exam time, excluding anything spent paused. */
export function elapsedMs(state: SessionState, now = Date.now()): number {
  const end = state.submittedAt ?? (state.status === 'paused' ? state.pausedAt ?? now : now);
  return Math.max(0, end - state.startedAt - state.pausedTotalMs);
}

/** Seconds left on the clock, or null when the attempt is untimed. */
export function remainingSec(state: SessionState, now = Date.now()): number | null {
  if (state.config.timeLimitSec === null) return null;
  const used = Math.floor(elapsedMs(state, now) / 1000);
  return Math.max(0, state.config.timeLimitSec - used);
}

export function isExpired(state: SessionState, now = Date.now()): boolean {
  const left = remainingSec(state, now);
  return left !== null && left <= 0;
}

export interface SessionProgress {
  total: number;
  answered: number;
  marked: number;
  unanswered: number;
  /** 0..1. */
  fraction: number;
}

export function progress(
  state: SessionState,
  questions: ReadonlyMap<string, Question>,
): SessionProgress {
  let answered = 0;
  let marked = 0;

  for (const item of state.items) {
    const question = questions.get(item.questionId);
    if (question && isAnswered(question, item.response)) answered++;
    if (item.marked) marked++;
  }

  const total = state.items.length;
  return {
    total,
    answered,
    marked,
    unanswered: total - answered,
    fraction: total === 0 ? 0 : answered / total,
  };
}

/** Index of the next question with no response, starting after `from`. Wraps. */
export function nextUnansweredIndex(
  state: SessionState,
  questions: ReadonlyMap<string, Question>,
  from = state.currentIndex,
): number | null {
  const total = state.items.length;
  for (let step = 1; step <= total; step++) {
    const idx = (from + step) % total;
    const item = state.items[idx];
    const question = questions.get(item.questionId);
    if (question && !isAnswered(question, item.response)) return idx;
  }
  return null;
}
