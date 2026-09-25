import { describe, expect, it } from 'vitest';
import { createSession, sessionReducer } from '@/core/session';
import {
  averageSecPerQuestion,
  formatDuration,
  gradeSession,
  toScaledScore,
  weakestSections,
} from '@/core/scoring';
import { buildMastery, readinessBand, readinessScore, summariseAttempts, weakQuestionIds } from '@/core/stats';
import type { AttemptResult, ExamBank, SessionConfig } from '@/core/types';

const T0 = 1_700_000_000_000;

function makeBank(): ExamBank {
  return {
    id: 'bank',
    code: 'TEST-101',
    title: 'Test Exam',
    passingScore: 70,
    timeLimitMinutes: 30,
    sections: [
      { id: 'sec-a', title: 'Identity' },
      { id: 'sec-b', title: 'Networking' },
    ],
    questions: [
      mk('q1', 'sec-a', ['A']),
      mk('q2', 'sec-a', ['B']),
      mk('q3', 'sec-b', ['C']),
      mk('q4', 'sec-b', ['A']),
    ],
  };
}

function mk(id: string, sectionId: string, correct: string[]) {
  return {
    id,
    bankId: 'bank',
    sectionId,
    type: 'single' as const,
    stem: `${id}?`,
    choices: [
      { id: 'A', text: 'Alpha' },
      { id: 'B', text: 'Bravo' },
      { id: 'C', text: 'Charlie' },
    ],
    correct,
  };
}

function config(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    bankId: 'bank',
    mode: 'exam',
    questionCount: 4,
    timeLimitSec: 1800,
    shuffleQuestions: false,
    shuffleChoices: false,
    sectionIds: [],
    filter: 'all',
    passingScore: 70,
    instantFeedback: false,
    partialCredit: false,
    allowSkip: true,
    showTimer: true,
    seed: 1,
    ...overrides,
  };
}

/** Answers questions by index, then submits 10 minutes in. */
function runAttempt(responses: (string[] | null)[], overrides: Partial<SessionConfig> = {}) {
  const bank = makeBank();
  let state = createSession({ id: 's1', bank, config: config(overrides), now: T0 });
  responses.forEach((response, index) => {
    if (response) {
      state = sessionReducer(state, { type: 'ANSWER', index, response, now: T0 });
    }
  });
  state = sessionReducer(state, { type: 'SUBMIT', now: T0 + 600_000 });
  return gradeSession(state, bank, 'a1', T0 + 600_000);
}

describe('gradeSession', () => {
  it('scores a perfect attempt as a pass', () => {
    const result = runAttempt([['A'], ['B'], ['C'], ['A']]);
    expect(result.correct).toBe(4);
    expect(result.percent).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.scaledScore).toBe(1000);
  });

  it('scores a failing attempt correctly', () => {
    const result = runAttempt([['A'], ['C'], ['C'], ['B']]);
    expect(result.correct).toBe(2);
    expect(result.percent).toBe(50);
    expect(result.passed).toBe(false);
  });

  it('separates skipped from incorrect', () => {
    const result = runAttempt([['A'], null, ['B'], null]);
    expect(result.answered).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.incorrect).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.percent).toBe(25);
  });

  it('passes exactly at the pass mark', () => {
    // 3 of 4 = 75% against a 75% cut score.
    const result = runAttempt([['A'], ['B'], ['C'], ['B']], { passingScore: 75 });
    expect(result.percent).toBe(75);
    expect(result.passed).toBe(true);
    expect(result.scaledScore).toBe(700);
  });

  it('records the duration excluding paused time', () => {
    const result = runAttempt([['A'], ['A'], ['A'], ['A']]);
    expect(result.durationSec).toBe(600);
    expect(averageSecPerQuestion(result)).toBe(150);
  });

  it('breaks the score down by section, in bank order', () => {
    const result = runAttempt([['A'], ['B'], ['C'], ['B']]);
    expect(result.sections.map((s) => s.title)).toEqual(['Identity', 'Networking']);
    expect(result.sections[0]).toMatchObject({ correct: 2, total: 2, percent: 100 });
    expect(result.sections[1]).toMatchObject({ correct: 1, total: 2, percent: 50 });
  });

  it('ranks the weakest sections first', () => {
    const result = runAttempt([['A'], ['B'], ['B'], ['B']]);
    expect(weakestSections(result, 1)[0].title).toBe('Networking');
  });

  it('preserves per-item detail for the answer review screen', () => {
    const result = runAttempt([['A'], ['C'], null, ['A']]);
    expect(result.items).toHaveLength(4);
    expect(result.items[1]).toMatchObject({ correct: false, response: ['C'], expected: ['B'] });
    expect(result.items[2]).toMatchObject({ answered: false, correct: false });
  });
});

describe('toScaledScore', () => {
  it('pins the pass mark to 700 on the 100–1000 scale', () => {
    expect(toScaledScore(70, 70)).toBe(700);
    expect(toScaledScore(75, 75)).toBe(700);
  });

  it('maps the extremes to 100 and 1000', () => {
    expect(toScaledScore(0, 70)).toBe(100);
    expect(toScaledScore(100, 70)).toBe(1000);
  });

  it('stays monotonic across the cut score', () => {
    expect(toScaledScore(69, 70)).toBeLessThan(700);
    expect(toScaledScore(71, 70)).toBeGreaterThan(700);
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
  });

  it('adds an hours field past 60 minutes', () => {
    expect(formatDuration(3_725)).toBe('1:02:05');
  });
});

describe('study statistics', () => {
  const attempts: AttemptResult[] = [
    fakeAttempt('a1', T0, 50, false, [
      ['q1', true],
      ['q2', false],
    ]),
    fakeAttempt('a2', T0 + 86_400_000, 75, true, [
      ['q1', true],
      ['q2', false],
      ['q3', true],
    ]),
  ];

  it('summarises best, last, average and pass rate', () => {
    const stats = summariseAttempts('bank', attempts);
    expect(stats).toMatchObject({
      attempts: 2,
      bestPercent: 75,
      lastPercent: 75,
      averagePercent: 62.5,
      passRate: 50,
      questionsSeen: 3,
    });
  });

  it('reports an improving trend', () => {
    expect(summariseAttempts('bank', attempts).trend).toBe(25);
  });

  it('ignores attempts from other banks', () => {
    expect(summariseAttempts('other', attempts).attempts).toBe(0);
  });

  it('rolls up per-question mastery across attempts', () => {
    const mastery = buildMastery(attempts);
    expect(mastery.get('q1')).toMatchObject({ timesSeen: 2, timesCorrect: 2, lastCorrect: true });
    expect(mastery.get('q2')).toMatchObject({ timesIncorrect: 2, accuracy: 0, lastCorrect: false });
  });

  it('queues consistently wrong questions for retry', () => {
    expect(weakQuestionIds(attempts)).toContain('q2');
    expect(weakQuestionIds(attempts)).not.toContain('q1');
  });

  it('discounts readiness when bank coverage is thin', () => {
    const stats = summariseAttempts('bank', attempts);
    const broad = readinessScore(stats, 3, 70);
    const thin = readinessScore(stats, 300, 70);
    expect(broad).toBeGreaterThan(thin);
  });

  it('reports zero readiness with no attempts', () => {
    expect(readinessScore(summariseAttempts('bank', []), 100, 70)).toBe(0);
  });

  it('bands the readiness score', () => {
    expect(readinessBand(90)).toBe('ready');
    expect(readinessBand(75)).toBe('nearly-ready');
    expect(readinessBand(50)).toBe('developing');
    expect(readinessBand(10)).toBe('not-ready');
  });
});

function fakeAttempt(
  id: string,
  finishedAt: number,
  percent: number,
  passed: boolean,
  items: [string, boolean][],
): AttemptResult {
  return {
    id,
    sessionId: `s-${id}`,
    bankId: 'bank',
    bankCode: 'TEST-101',
    mode: 'exam',
    startedAt: finishedAt - 600_000,
    finishedAt,
    durationSec: 600,
    totalQuestions: items.length,
    answered: items.length,
    correct: items.filter(([, ok]) => ok).length,
    incorrect: items.filter(([, ok]) => !ok).length,
    skipped: 0,
    rawScore: items.filter(([, ok]) => ok).length,
    percent,
    scaledScore: toScaledScore(percent, 70),
    passingScore: 70,
    passed,
    sections: [],
    items: items.map(([questionId, correct]) => ({
      questionId,
      correct,
      score: correct ? 1 : 0,
      response: ['A'],
      expected: ['A'],
      answered: true,
      marked: false,
      timeSpentMs: 30_000,
    })),
  };
}
