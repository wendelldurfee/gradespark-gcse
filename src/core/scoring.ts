import { gradeQuestion, isAnswered } from './grading';
import { elapsedMs } from './session';
import type {
  AttemptResult,
  ExamBank,
  GradedItem,
  Question,
  SectionResult,
  SessionState,
} from './types';

/**
 * Turns a finished session into a score report: per-item grades, per-domain
 * breakdown, and the pass/fail verdict.
 */

/** Vendors report 100–1000 with the pass mark pinned at 700; this mirrors that. */
export function toScaledScore(percent: number, passingPercent: number): number {
  const p = Math.max(0, Math.min(100, percent));
  const cut = Math.max(1, Math.min(99, passingPercent));

  // Two linear segments so that `percent === passingPercent` always maps to 700.
  const scaled = p < cut ? 100 + (p / cut) * 600 : 700 + ((p - cut) / (100 - cut)) * 300;

  return Math.round(scaled);
}

export function gradeSession(
  state: SessionState,
  bank: ExamBank,
  attemptId: string,
  now = Date.now(),
): AttemptResult {
  const questions = new Map(bank.questions.map((q) => [q.id, q]));
  const items: GradedItem[] = [];

  let rawScore = 0;
  let correct = 0;
  let answered = 0;

  for (const item of state.items) {
    const question = questions.get(item.questionId);
    if (!question) continue;

    const didAnswer = isAnswered(question, item.response);
    const outcome = gradeQuestion(question, item.response, {
      partialCredit: state.config.partialCredit,
    });

    if (didAnswer) answered++;
    if (outcome.correct) correct++;
    rawScore += outcome.score;

    items.push({
      questionId: question.id,
      correct: outcome.correct,
      score: outcome.score,
      response: item.response,
      expected: question.correct,
      answered: didAnswer,
      marked: item.marked,
      timeSpentMs: item.timeSpentMs,
      sectionId: question.sectionId,
    });
  }

  const total = items.length;
  const percent = total === 0 ? 0 : round1((rawScore / total) * 100);
  const passingScore = state.config.passingScore;

  return {
    id: attemptId,
    sessionId: state.id,
    bankId: bank.id,
    bankCode: bank.code,
    mode: state.config.mode,
    startedAt: state.startedAt,
    finishedAt: state.submittedAt ?? now,
    durationSec: Math.round(elapsedMs(state, now) / 1000),
    totalQuestions: total,
    answered,
    correct,
    incorrect: answered - correct,
    skipped: total - answered,
    rawScore: round1(rawScore),
    percent,
    scaledScore: toScaledScore(percent, passingScore),
    passingScore,
    passed: percent >= passingScore,
    sections: summariseSections(items, bank),
    items,
  };
}

/** Per-domain breakdown, ordered by the bank's own section list. */
function summariseSections(items: readonly GradedItem[], bank: ExamBank): SectionResult[] {
  const titles = new Map((bank.sections ?? []).map((s) => [s.id, s.title]));
  const buckets = new Map<string, { correct: number; total: number }>();

  for (const item of items) {
    const key = item.sectionId ?? '__unsectioned__';
    const bucket = buckets.get(key) ?? { correct: 0, total: 0 };
    bucket.total++;
    bucket.correct += item.score;
    buckets.set(key, bucket);
  }

  const results: SectionResult[] = [];
  for (const [sectionId, bucket] of buckets) {
    results.push({
      sectionId,
      title: titles.get(sectionId) ?? (sectionId === '__unsectioned__' ? 'General' : sectionId),
      correct: round1(bucket.correct),
      total: bucket.total,
      percent: bucket.total === 0 ? 0 : round1((bucket.correct / bucket.total) * 100),
    });
  }

  // Keep the bank's declared order; anything unlisted falls to the bottom.
  const order = new Map((bank.sections ?? []).map((s, i) => [s.id, i]));
  results.sort(
    (a, b) => (order.get(a.sectionId) ?? 999) - (order.get(b.sectionId) ?? 999),
  );
  return results;
}

/** The weakest domains, for the "what to study next" panel on the report. */
export function weakestSections(result: AttemptResult, limit = 3): SectionResult[] {
  return result.sections
    .filter((s) => s.total > 0)
    .slice()
    .sort((a, b) => a.percent - b.percent)
    .slice(0, limit);
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Average seconds per question, used on the report and the pacing warning. */
export function averageSecPerQuestion(result: AttemptResult): number {
  if (result.totalQuestions === 0) return 0;
  return round1(result.durationSec / result.totalQuestions);
}

export function questionById(bank: ExamBank, id: string): Question | undefined {
  return bank.questions.find((q) => q.id === id);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
