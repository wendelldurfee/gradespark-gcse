import { describe, expect, it } from 'vitest';
import {
  configForMode,
  createSession,
  elapsedMs,
  filterPool,
  isExpired,
  nextUnansweredIndex,
  progress,
  remainingSec,
  sessionReducer,
  type QuestionHistory,
} from '@/core/session';
import type { ExamBank, Question, SessionConfig } from '@/core/types';

const T0 = 1_700_000_000_000;

function makeBank(count = 10): ExamBank {
  const questions: Question[] = Array.from({ length: count }, (_, i) => ({
    id: `q${i + 1}`,
    bankId: 'bank',
    sectionId: i % 2 === 0 ? 'sec-a' : 'sec-b',
    type: 'single',
    number: i + 1,
    stem: `Question ${i + 1}?`,
    choices: [
      { id: 'A', text: 'Alpha' },
      { id: 'B', text: 'Bravo' },
      { id: 'C', text: 'Charlie' },
    ],
    correct: ['A'],
  }));

  return {
    id: 'bank',
    code: 'TEST-101',
    title: 'Test Exam',
    passingScore: 70,
    timeLimitMinutes: 30,
    questionCount: count,
    sections: [
      { id: 'sec-a', title: 'Section A' },
      { id: 'sec-b', title: 'Section B' },
    ],
    questions,
  };
}

function makeConfig(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    bankId: 'bank',
    mode: 'custom',
    questionCount: 5,
    timeLimitSec: null,
    shuffleQuestions: false,
    shuffleChoices: false,
    sectionIds: [],
    filter: 'all',
    passingScore: 70,
    instantFeedback: false,
    partialCredit: false,
    allowSkip: true,
    showTimer: true,
    seed: 42,
    ...overrides,
  };
}

function start(overrides: Partial<SessionConfig> = {}, bank = makeBank()) {
  return createSession({ id: 's1', bank, config: makeConfig(overrides), now: T0 });
}

describe('createSession', () => {
  it('draws the requested number of questions', () => {
    const state = start({ questionCount: 5 });
    expect(state.items).toHaveLength(5);
    expect(state.config.questionCount).toBe(5);
  });

  it('clamps the count to the size of the pool', () => {
    const state = start({ questionCount: 999 });
    expect(state.items).toHaveLength(10);
  });

  it('marks the first question as seen immediately', () => {
    const state = start();
    expect(state.items[0].firstSeenAt).toBe(T0);
    expect(state.items[1].firstSeenAt).toBeNull();
  });

  it('is reproducible for a given seed', () => {
    const a = start({ shuffleQuestions: true, seed: 7 });
    const b = start({ shuffleQuestions: true, seed: 7 });
    const c = start({ shuffleQuestions: true, seed: 8 });
    expect(a.items.map((i) => i.questionId)).toEqual(b.items.map((i) => i.questionId));
    expect(a.items.map((i) => i.questionId)).not.toEqual(c.items.map((i) => i.questionId));
  });

  it('keeps choice order stable unless shuffling is on', () => {
    expect(start().items[0].choiceOrder).toEqual(['A', 'B', 'C']);
    const shuffled = start({ shuffleChoices: true, seed: 3 });
    expect(shuffled.items[0].choiceOrder.slice().sort()).toEqual(['A', 'B', 'C']);
  });

  it('restricts the draw to the selected sections', () => {
    const state = start({ sectionIds: ['sec-a'], questionCount: 99 });
    expect(state.items).toHaveLength(5);
  });

  it('throws when the filters leave nothing to ask', () => {
    expect(() => start({ sectionIds: ['nope'] })).toThrow(/No questions match/);
  });
});

describe('filterPool', () => {
  const bank = makeBank();
  const history = new Map<string, QuestionHistory>([
    ['q1', { questionId: 'q1', timesSeen: 3, timesCorrect: 3, timesIncorrect: 0, marked: false }],
    ['q2', { questionId: 'q2', timesSeen: 2, timesCorrect: 0, timesIncorrect: 2, marked: true }],
  ]);

  it('finds questions never shown', () => {
    const pool = filterPool(bank.questions, [], 'unseen', history);
    expect(pool.map((q) => q.id)).not.toContain('q1');
    expect(pool).toHaveLength(8);
  });

  it('finds questions previously answered wrongly', () => {
    const pool = filterPool(bank.questions, [], 'incorrect', history);
    expect(pool.map((q) => q.id)).toEqual(['q2']);
  });

  it('finds flagged questions', () => {
    expect(filterPool(bank.questions, [], 'marked', history).map((q) => q.id)).toEqual(['q2']);
  });

  it('combines a section filter with a history filter', () => {
    const pool = filterPool(bank.questions, ['sec-b'], 'incorrect', history);
    expect(pool.map((q) => q.id)).toEqual(['q2']);
  });
});

describe('answering and navigation', () => {
  it('records a response', () => {
    const state = sessionReducer(start(), { type: 'ANSWER', index: 0, response: ['B'], now: T0 });
    expect(state.items[0].response).toEqual(['B']);
    expect(state.items[0].answeredAt).toBe(T0);
  });

  it('reveals the answer immediately when instant feedback is on', () => {
    const instant = start({ instantFeedback: true });
    const after = sessionReducer(instant, {
      type: 'ANSWER',
      index: 0,
      response: ['A'],
      complete: true,
      now: T0,
    });
    expect(after.items[0].revealed).toBe(true);
  });

  it('does not reveal part-way through a multi-select, even with instant feedback', () => {
    // Ticking the first of two required boxes must not lock the question:
    // revealing here would make the second answer unselectable.
    const instant = start({ instantFeedback: true });
    let state = sessionReducer(instant, {
      type: 'ANSWER',
      index: 0,
      response: ['A'],
      complete: false,
      now: T0,
    });
    expect(state.items[0].revealed).toBe(false);

    state = sessionReducer(state, {
      type: 'ANSWER',
      index: 0,
      response: ['A', 'B'],
      complete: true,
      now: T0,
    });
    expect(state.items[0].revealed).toBe(true);
  });

  it('keeps the answer hidden in exam mode', () => {
    const after = sessionReducer(start(), { type: 'ANSWER', index: 0, response: ['A'], now: T0 });
    expect(after.items[0].revealed).toBe(false);
  });

  it('toggles the review flag', () => {
    let state = sessionReducer(start(), { type: 'TOGGLE_MARK', index: 2 });
    expect(state.items[2].marked).toBe(true);
    state = sessionReducer(state, { type: 'TOGGLE_MARK', index: 2 });
    expect(state.items[2].marked).toBe(false);
  });

  it('clamps navigation at both ends', () => {
    const state = start();
    expect(sessionReducer(state, { type: 'PREV', now: T0 }).currentIndex).toBe(0);
    const last = sessionReducer(state, { type: 'GOTO', index: 99, now: T0 });
    expect(last.currentIndex).toBe(4);
    expect(sessionReducer(last, { type: 'NEXT', now: T0 }).currentIndex).toBe(4);
  });

  it('stamps firstSeenAt when a question is first reached', () => {
    const state = sessionReducer(start(), { type: 'NEXT', now: T0 + 5_000 });
    expect(state.items[1].firstSeenAt).toBe(T0 + 5_000);
  });
});

describe('time accounting', () => {
  it('bills elapsed time to the question on screen', () => {
    let state = start();
    state = sessionReducer(state, { type: 'TICK', now: T0 + 8_000 });
    expect(state.items[0].timeSpentMs).toBe(8_000);
    expect(state.items[1].timeSpentMs).toBe(0);
  });

  it('bills the outgoing question when navigating away', () => {
    let state = start();
    state = sessionReducer(state, { type: 'NEXT', now: T0 + 10_000 });
    state = sessionReducer(state, { type: 'TICK', now: T0 + 14_000 });
    expect(state.items[0].timeSpentMs).toBe(10_000);
    expect(state.items[1].timeSpentMs).toBe(4_000);
  });

  it('excludes paused time from the clock', () => {
    let state = start({ timeLimitSec: 600 });
    state = sessionReducer(state, { type: 'PAUSE', now: T0 + 10_000 });
    expect(state.status).toBe('paused');

    // 60s pass while paused; they must not count against the candidate.
    state = sessionReducer(state, { type: 'RESUME', now: T0 + 70_000 });
    expect(state.pausedTotalMs).toBe(60_000);
    expect(elapsedMs(state, T0 + 70_000)).toBe(10_000);
    expect(remainingSec(state, T0 + 70_000)).toBe(590);
  });

  it('does not accrue question time while paused', () => {
    let state = start({ timeLimitSec: 600 });
    state = sessionReducer(state, { type: 'PAUSE', now: T0 + 5_000 });
    state = sessionReducer(state, { type: 'TICK', now: T0 + 60_000 });
    expect(state.items[0].timeSpentMs).toBe(5_000);
  });

  it('reports no deadline for an untimed attempt', () => {
    expect(remainingSec(start(), T0 + 999_999)).toBeNull();
    expect(isExpired(start(), T0 + 999_999)).toBe(false);
  });

  it('auto-submits when the clock runs out', () => {
    let state = start({ timeLimitSec: 60 });
    state = sessionReducer(state, { type: 'TICK', now: T0 + 61_000 });
    expect(state.status).toBe('submitted');
    expect(state.submittedAt).toBe(T0 + 61_000);
    expect(remainingSec(state, T0 + 61_000)).toBe(0);
  });

  it('freezes a submitted attempt against further edits', () => {
    let state = sessionReducer(start(), { type: 'SUBMIT', now: T0 + 1_000 });
    const frozen = sessionReducer(state, { type: 'ANSWER', index: 0, response: ['C'], now: T0 + 2_000 });
    expect(frozen.items[0].response).toEqual([]);
    expect(frozen).toBe(state);
    state = sessionReducer(state, { type: 'TICK', now: T0 + 99_000 });
    expect(elapsedMs(state, T0 + 99_000)).toBe(1_000);
  });
});

describe('progress helpers', () => {
  const bank = makeBank();
  const byId = new Map(bank.questions.map((q) => [q.id, q]));

  it('counts answered, unanswered and marked', () => {
    let state = start({ questionCount: 5 }, bank);
    state = sessionReducer(state, { type: 'ANSWER', index: 0, response: ['A'], now: T0 });
    state = sessionReducer(state, { type: 'ANSWER', index: 2, response: ['B'], now: T0 });
    state = sessionReducer(state, { type: 'TOGGLE_MARK', index: 4 });

    const p = progress(state, byId);
    expect(p).toMatchObject({ total: 5, answered: 2, unanswered: 3, marked: 1 });
    expect(p.fraction).toBeCloseTo(0.4);
  });

  it('finds the next unanswered question, wrapping around', () => {
    let state = start({ questionCount: 3 }, bank);
    state = sessionReducer(state, { type: 'ANSWER', index: 1, response: ['A'], now: T0 });
    expect(nextUnansweredIndex(state, byId, 0)).toBe(2);
    expect(nextUnansweredIndex(state, byId, 2)).toBe(0);
  });

  it('returns null once everything is answered', () => {
    let state = start({ questionCount: 2 }, bank);
    state = sessionReducer(state, { type: 'ANSWER', index: 0, response: ['A'], now: T0 });
    state = sessionReducer(state, { type: 'ANSWER', index: 1, response: ['A'], now: T0 });
    expect(nextUnansweredIndex(state, byId)).toBeNull();
  });
});

describe('mode presets', () => {
  const bank = makeBank(40);

  it('exam mode is timed, shuffled and gives no feedback', () => {
    const config = configForMode(bank, 'exam', 1);
    expect(config.timeLimitSec).toBe(30 * 60);
    expect(config.instantFeedback).toBe(false);
    expect(config.shuffleQuestions).toBe(true);
  });

  it('practice mode is untimed, ordered and covers the whole bank', () => {
    const config = configForMode(bank, 'practice', 1);
    expect(config.timeLimitSec).toBeNull();
    expect(config.instantFeedback).toBe(true);
    expect(config.questionCount).toBe(40);
  });

  it('flashcard mode caps the deck size', () => {
    expect(configForMode(bank, 'flashcard', 1).questionCount).toBe(30);
  });
});
