import type { AttemptResult, GradedItem } from './types';

/**
 * Longitudinal study analytics derived from stored attempts — readiness, trend,
 * and the per-question mastery used by the `incorrect` question filter.
 */

export interface BankStats {
  bankId: string;
  attempts: number;
  bestPercent: number;
  lastPercent: number;
  averagePercent: number;
  passRate: number;
  totalStudySec: number;
  /** Percentage-point change between the first and last half of attempts. */
  trend: number;
  /** Distinct questions the candidate has answered at least once. */
  questionsSeen: number;
}

export function summariseAttempts(bankId: string, attempts: readonly AttemptResult[]): BankStats {
  const own = attempts
    .filter((a) => a.bankId === bankId)
    .slice()
    .sort((a, b) => a.finishedAt - b.finishedAt);

  if (own.length === 0) {
    return {
      bankId,
      attempts: 0,
      bestPercent: 0,
      lastPercent: 0,
      averagePercent: 0,
      passRate: 0,
      totalStudySec: 0,
      trend: 0,
      questionsSeen: 0,
    };
  }

  const percents = own.map((a) => a.percent);
  const seen = new Set<string>();
  for (const attempt of own) {
    for (const item of attempt.items) {
      if (item.answered) seen.add(item.questionId);
    }
  }

  return {
    bankId,
    attempts: own.length,
    bestPercent: Math.max(...percents),
    lastPercent: percents[percents.length - 1],
    averagePercent: round1(percents.reduce((a, b) => a + b, 0) / percents.length),
    passRate: round1((own.filter((a) => a.passed).length / own.length) * 100),
    totalStudySec: own.reduce((sum, a) => sum + a.durationSec, 0),
    trend: computeTrend(percents),
    questionsSeen: seen.size,
  };
}

/** Mean of the newest half minus mean of the oldest half. */
function computeTrend(percents: readonly number[]): number {
  if (percents.length < 2) return 0;
  const mid = Math.floor(percents.length / 2);
  const older = percents.slice(0, mid);
  const newer = percents.slice(mid);
  return round1(mean(newer) - mean(older));
}

export interface QuestionMastery {
  questionId: string;
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  /** 0..1 across all attempts. */
  accuracy: number;
  /** Correct on the most recent attempt that included this question. */
  lastCorrect: boolean;
}

/** Rolls every attempt up into per-question mastery. */
export function buildMastery(attempts: readonly AttemptResult[]): Map<string, QuestionMastery> {
  const byQuestion = new Map<string, QuestionMastery>();
  const ordered = attempts.slice().sort((a, b) => a.finishedAt - b.finishedAt);

  for (const attempt of ordered) {
    for (const item of attempt.items) {
      if (!item.answered) continue;
      const entry = byQuestion.get(item.questionId) ?? {
        questionId: item.questionId,
        timesSeen: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        accuracy: 0,
        lastCorrect: false,
      };

      entry.timesSeen++;
      if (item.correct) entry.timesCorrect++;
      else entry.timesIncorrect++;
      entry.lastCorrect = item.correct;
      entry.accuracy = entry.timesCorrect / entry.timesSeen;
      byQuestion.set(item.questionId, entry);
    }
  }

  return byQuestion;
}

/**
 * A 0–100 readiness estimate. Weighted towards recent scores, then discounted
 * for thin coverage of the bank — scoring 95% on 10 of 400 questions is not
 * evidence of being ready.
 */
export function readinessScore(
  stats: BankStats,
  bankQuestionCount: number,
  passingScore: number,
): number {
  if (stats.attempts === 0 || bankQuestionCount === 0) return 0;

  const recentWeight = 0.7;
  const blended = stats.lastPercent * recentWeight + stats.averagePercent * (1 - recentWeight);

  const coverage = Math.min(1, stats.questionsSeen / bankQuestionCount);
  // Coverage never zeroes the estimate outright, it caps it.
  const coverageFactor = 0.55 + 0.45 * coverage;

  // Comfortably clearing the pass mark is worth a small bonus.
  const margin = Math.max(0, blended - passingScore) / Math.max(1, 100 - passingScore);
  const bonus = margin * 5;

  return Math.max(0, Math.min(100, Math.round(blended * coverageFactor + bonus)));
}

export type ReadinessBand = 'not-ready' | 'developing' | 'nearly-ready' | 'ready';

export function readinessBand(score: number): ReadinessBand {
  if (score >= 85) return 'ready';
  if (score >= 70) return 'nearly-ready';
  if (score >= 45) return 'developing';
  return 'not-ready';
}

export const READINESS_LABEL: Record<ReadinessBand, string> = {
  'not-ready': 'Not ready',
  developing: 'Developing',
  'nearly-ready': 'Nearly ready',
  ready: 'Exam ready',
};

/** Questions answered wrongly most recently — the retry queue. */
export function weakQuestionIds(attempts: readonly AttemptResult[], limit = 50): string[] {
  const mastery = buildMastery(attempts);
  return [...mastery.values()]
    .filter((m) => !m.lastCorrect || m.accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy || b.timesIncorrect - a.timesIncorrect)
    .slice(0, limit)
    .map((m) => m.questionId);
}

/** Items where the candidate spent an unusually long time, right or wrong. */
export function slowestItems(result: AttemptResult, limit = 5): GradedItem[] {
  return result.items
    .slice()
    .sort((a, b) => b.timeSpentMs - a.timeSpentMs)
    .slice(0, limit);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
