import type { Question, Response } from './types';

/**
 * Grading rules for every supported question type.
 *
 * `gradeQuestion` always returns a score in 0..1. Without partial credit the
 * score is only ever 0 or 1; with it enabled, multi-response types return a
 * fraction so a near-miss on a six-way drag-and-drop is not treated the same as
 * a blank.
 */

export interface GradeOptions {
  partialCredit?: boolean;
  /** Require exact case/whitespace on `fill` answers. Off by default. */
  strictFill?: boolean;
}

export interface GradeOutcome {
  /** Full marks. */
  correct: boolean;
  /** 0..1. */
  score: number;
  /** Response entries that were wrong or misplaced — used to tint the UI red. */
  wrongParts: string[];
  /** Expected entries the candidate missed — used to tint the UI green. */
  missingParts: string[];
}

const PAIR_TYPES = new Set(['dragdrop', 'matching', 'hotspot']);

/** Normalises free-text so "  Fail Over " matches "failover"-style keys loosely. */
export function normaliseText(value: string, strict = false): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return strict ? trimmed : trimmed.toLowerCase();
}

function toSet(values: readonly string[]): Set<string> {
  return new Set(values);
}

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/** True when the candidate has supplied anything at all for this question. */
export function isAnswered(question: Question, response: Response | undefined): boolean {
  if (!response || response.length === 0) return false;
  if (question.type === 'fill') {
    return response.some((r) => r.trim().length > 0);
  }
  return true;
}

/**
 * How many responses this question expects. Drives the "(Choose two)" hint and
 * stops the UI accepting a third checkbox on a pick-two question.
 */
export function expectedCount(question: Question): number {
  if (question.selectCount && question.selectCount > 0) return question.selectCount;
  switch (question.type) {
    case 'single':
    case 'truefalse':
      return 1;
    case 'fill':
      // Any one accepted string is enough.
      return 1;
    case 'ordering':
      return question.choices?.length ?? question.correct.length;
    case 'dragdrop':
    case 'matching':
      return question.targets?.length ?? question.correct.length;
    case 'hotspot':
      return question.hotspots?.length ?? question.correct.length;
    default:
      return question.correct.length;
  }
}

/**
 * True when the candidate has supplied a *full* response — every checkbox a
 * "choose two" question asks for, every drop zone filled, and so on.
 *
 * Instant-feedback modes use this to decide when to reveal: revealing as soon as
 * the first of two required checkboxes is ticked would lock the question before
 * the answer could be finished.
 */
export function isComplete(question: Question, response: Response | undefined): boolean {
  if (!isAnswered(question, response)) return false;
  const given = response ?? [];

  switch (question.type) {
    case 'single':
    case 'truefalse':
    case 'fill':
      return true;
    default:
      return given.length >= expectedCount(question);
  }
}

export function gradeQuestion(
  question: Question,
  response: Response | undefined,
  options: GradeOptions = {},
): GradeOutcome {
  const partial = options.partialCredit ?? false;
  const given = response ?? [];

  if (!isAnswered(question, given)) {
    return { correct: false, score: 0, wrongParts: [], missingParts: question.correct.slice() };
  }

  switch (question.type) {
    case 'single':
    case 'truefalse':
      return gradeSingle(question, given);
    case 'multiple':
      return gradeMultiple(question, given, partial);
    case 'fill':
      return gradeFill(question, given, options.strictFill ?? false);
    case 'ordering':
      return gradeOrdering(question, given, partial);
    default:
      if (PAIR_TYPES.has(question.type)) return gradePairs(question, given, partial);
      return gradeMultiple(question, given, partial);
  }
}

function gradeSingle(question: Question, given: Response): GradeOutcome {
  const picked = given[0];
  const ok = question.correct.includes(picked);
  return {
    correct: ok,
    score: ok ? 1 : 0,
    wrongParts: ok ? [] : [picked],
    missingParts: ok ? [] : question.correct.slice(),
  };
}

function gradeMultiple(question: Question, given: Response, partial: boolean): GradeOutcome {
  const expected = toSet(question.correct);
  const picked = toSet(given);

  const hits = [...picked].filter((id) => expected.has(id));
  const wrongParts = [...picked].filter((id) => !expected.has(id));
  const missingParts = [...expected].filter((id) => !picked.has(id));
  const exact = wrongParts.length === 0 && missingParts.length === 0;

  if (exact) return { correct: true, score: 1, wrongParts: [], missingParts: [] };

  // Penalised partial credit: every wrong pick cancels out one right pick, so
  // ticking every box scores zero rather than full marks.
  const score = partial
    ? Math.max(0, (hits.length - wrongParts.length) / Math.max(1, expected.size))
    : 0;

  return { correct: false, score, wrongParts, missingParts };
}

function gradeFill(question: Question, given: Response, strict: boolean): GradeOutcome {
  const typed = normaliseText(given[0] ?? '', strict);
  const accepted = question.correct.map((c) => normaliseText(c, strict));
  const ok = accepted.includes(typed);
  return {
    correct: ok,
    score: ok ? 1 : 0,
    wrongParts: ok ? [] : [given[0] ?? ''],
    missingParts: ok ? [] : question.correct.slice(),
  };
}

function gradeOrdering(question: Question, given: Response, partial: boolean): GradeOutcome {
  const expected = question.correct;
  let inPlace = 0;
  const wrongParts: string[] = [];

  for (let i = 0; i < expected.length; i++) {
    if (given[i] === expected[i]) inPlace++;
    else if (given[i] !== undefined) wrongParts.push(given[i]);
  }

  const exact = inPlace === expected.length && given.length === expected.length;
  if (exact) return { correct: true, score: 1, wrongParts: [], missingParts: [] };

  return {
    correct: false,
    score: partial ? inPlace / Math.max(1, expected.length) : 0,
    wrongParts,
    missingParts: expected.filter((id, i) => given[i] !== id),
  };
}

/**
 * Grades `key=value` responses (drag-and-drop, matching, hotspot). Order is
 * irrelevant; each pair is scored independently.
 */
function gradePairs(question: Question, given: Response, partial: boolean): GradeOutcome {
  const expectedPairs = new Map<string, string>();
  for (const entry of question.correct) {
    const [key, value] = splitPair(entry);
    expectedPairs.set(key, value);
  }

  const givenPairs = new Map<string, string>();
  for (const entry of given) {
    const [key, value] = splitPair(entry);
    givenPairs.set(key, value);
  }

  let hits = 0;
  const wrongParts: string[] = [];
  const missingParts: string[] = [];

  for (const [key, value] of expectedPairs) {
    const answer = givenPairs.get(key);
    if (answer === value) hits++;
    else {
      if (answer !== undefined) wrongParts.push(`${key}=${answer}`);
      missingParts.push(`${key}=${value}`);
    }
  }

  // Pairs pointing at a target that does not exist in the key are always wrong.
  for (const [key, value] of givenPairs) {
    if (!expectedPairs.has(key)) wrongParts.push(`${key}=${value}`);
  }

  const exact = hits === expectedPairs.size && wrongParts.length === 0;
  if (exact) return { correct: true, score: 1, wrongParts: [], missingParts: [] };

  return {
    correct: false,
    score: partial ? hits / Math.max(1, expectedPairs.size) : 0,
    wrongParts,
    missingParts,
  };
}

function splitPair(entry: string): [string, string] {
  const idx = entry.indexOf('=');
  if (idx === -1) return [entry, ''];
  return [entry.slice(0, idx).trim(), entry.slice(idx + 1).trim()];
}

/**
 * Maps choice ids to the display letters used by dump sites, so an answer can be
 * shown as "BD". Letters follow the bank's canonical choice order, never the
 * shuffled presentation order.
 */
export function answerLetters(question: Question, ids: readonly string[]): string {
  const choices = question.choices ?? [];
  const letters = ids
    .map((id) => choices.findIndex((c) => c.id === id))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)
    .map((i) => String.fromCharCode(65 + i));
  return letters.join('');
}

/** Inverse of `answerLetters` — turns "BD" into the matching choice ids. */
export function lettersToIds(question: Question, letters: string): string[] {
  const choices = question.choices ?? [];
  return letters
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((ch) => choices[ch.charCodeAt(0) - 65]?.id)
    .filter((id): id is string => Boolean(id));
}

/** True when both the vendor key and the community vote exist but disagree. */
export function hasDisputedAnswer(question: Question): boolean {
  if (!question.communityAnswer) return false;
  const vendor = answerLetters(question, question.correct);
  const community = question.communityAnswer.toUpperCase().replace(/[^A-Z]/g, '');
  if (!vendor || !community) return false;
  return vendor.split('').sort().join('') !== community.split('').sort().join('');
}

/** The single answer combination with the most community votes, if any. */
export function topCommunityVote(question: Question): { answer: string; percent: number } | null {
  const votes = question.communityVotes ?? [];
  if (votes.length === 0) return null;
  const total = votes.reduce((sum, v) => sum + v.count, 0);
  if (total === 0) return null;
  const top = votes.reduce((best, v) => (v.count > best.count ? v : best), votes[0]);
  return { answer: top.answer, percent: Math.round((top.count / total) * 100) };
}
