/**
 * Core domain types for the exam engine.
 *
 * Nothing in `src/core` may import from react-native or expo — the engine is
 * plain TypeScript so it can be unit tested under Node and reused on any
 * platform.
 */

export type QuestionType =
  /** One correct choice, rendered as radio buttons. */
  | 'single'
  /** N correct choices, rendered as checkboxes ("Choose two"). */
  | 'multiple'
  /** Degenerate single-choice with True/False options. */
  | 'truefalse'
  /** Free text typed by the candidate, matched against accepted answers. */
  | 'fill'
  /** Put the items into the correct sequence. */
  | 'ordering'
  /** Drag tokens onto labelled drop targets (VCE "drag and drop"). */
  | 'dragdrop'
  /** Match each left item to a right item. */
  | 'matching'
  /** An exhibit with one dropdown per hotspot region. */
  | 'hotspot';

export interface Choice {
  id: string;
  text: string;
  /** Optional image shown beside the choice text. */
  image?: string;
}

/** A drop target for `dragdrop` / `matching` questions. */
export interface DropTarget {
  id: string;
  label: string;
}

/** One selectable region of a `hotspot` question. */
export interface Hotspot {
  id: string;
  label: string;
  options: string[];
  correct: string;
}

/** A single community reply, in the style of a public dump site discussion. */
export interface DiscussionPost {
  author: string;
  /** ISO-8601 date string. */
  date?: string;
  content: string;
  /** The answer letters this poster argued for, e.g. "BD". */
  suggested?: string;
  upvotes?: number;
}

/** Aggregated community vote for one answer combination, e.g. `{ answer: 'BD', count: 41 }`. */
export interface CommunityVote {
  answer: string;
  count: number;
}

export interface Question {
  id: string;
  bankId: string;
  /** Section / domain / objective this question belongs to. */
  sectionId?: string;
  type: QuestionType;
  /** Display number within the bank, as printed in the source dump. */
  number?: number;
  /** Question text. A small subset of Markdown is rendered (code blocks, bold). */
  stem: string;
  /** Image URIs (bundled asset, file:// path, or remote URL) shown above the stem. */
  exhibits?: string[];

  /** Selectable options for single/multiple/truefalse, or draggable tokens for dragdrop/ordering/matching. */
  choices?: Choice[];
  /** Drop zones for dragdrop/matching. */
  targets?: DropTarget[];
  /** Regions for hotspot questions. */
  hotspots?: Hotspot[];

  /**
   * The correct response, encoded per type:
   *  - single/truefalse : exactly one choice id
   *  - multiple         : the set of correct choice ids (order irrelevant)
   *  - ordering         : choice ids in the required order
   *  - fill             : every accepted string
   *  - dragdrop/matching: `"targetId=choiceId"` pairs
   *  - hotspot          : `"hotspotId=option"` pairs
   */
  correct: string[];

  /** How many options the candidate must pick; defaults to `correct.length`. */
  selectCount?: number;

  explanation?: string;
  reference?: string;
  /** The answer the community converged on, which often differs from the vendor key. */
  communityAnswer?: string;
  communityVotes?: CommunityVote[];
  discussion?: DiscussionPost[];

  tags?: string[];
  /** 1 = easy, 2 = medium, 3 = hard. */
  difficulty?: 1 | 2 | 3;
  /** Groups questions that share a scenario (Microsoft-style case studies). */
  caseStudyId?: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  /** Tabs of background material, e.g. Overview / Existing Environment / Requirements. */
  sections: { title: string; body: string }[];
}

export interface Section {
  id: string;
  title: string;
  /** Share of the exam this domain is worth, 0..1. Used for weighted score reports. */
  weight?: number;
}

export interface ExamBank {
  id: string;
  /** e.g. "AZ-104" */
  code: string;
  /** e.g. "Microsoft Azure Administrator" */
  title: string;
  vendor?: string;
  description?: string;
  /** Pass mark as a percentage, 0..100. */
  passingScore: number;
  /** Default exam duration in minutes. */
  timeLimitMinutes: number;
  /** Default number of questions drawn for an exam-mode attempt. */
  questionCount?: number;
  version?: string;
  /** Where the bank came from — file name, URL, or "built-in". */
  source?: string;
  /** Epoch millis. */
  importedAt?: number;
  sections?: Section[];
  caseStudies?: CaseStudy[];
  questions: Question[];
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type ExamMode =
  /** Timed, no feedback until the end — mimics the real testing centre. */
  | 'exam'
  /** Untimed, answer revealed immediately with explanation. */
  | 'practice'
  /** Everything user-configurable. */
  | 'custom'
  /** Tap to flip, self-graded — quick memorisation drill. */
  | 'flashcard';

/** Restricts the pool a session draws from. */
export type QuestionFilter =
  | 'all'
  | 'unseen'
  | 'incorrect'
  | 'marked'
  | 'unanswered';

export interface SessionConfig {
  bankId: string;
  mode: ExamMode;
  /** How many questions to draw. Clamped to the size of the filtered pool. */
  questionCount: number;
  /** Total time in seconds, or null for untimed. */
  timeLimitSec: number | null;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  /** Only draw from these section ids; empty means all sections. */
  sectionIds: string[];
  filter: QuestionFilter;
  passingScore: number;
  /** Grade and reveal each question as soon as it is answered. */
  instantFeedback: boolean;
  /** Award a fraction of the mark for partially correct multi-select answers. */
  partialCredit: boolean;
  /** Let the candidate move on without answering. */
  allowSkip: boolean;
  /** Show the countdown clock. */
  showTimer: boolean;
  /** Seed for the shuffle, so an attempt can be replayed exactly. */
  seed: number;
}

/** The candidate's response to one question, encoded exactly like `Question.correct`. */
export type Response = string[];

export interface SessionItem {
  questionId: string;
  /** Choice ids in presentation order, after any shuffle. */
  choiceOrder: string[];
  response: Response;
  /** Flagged for review via the ribbon button. */
  marked: boolean;
  /** True once the answer has been revealed (practice mode / instant feedback). */
  revealed: boolean;
  /** Cumulative milliseconds spent with this question on screen. */
  timeSpentMs: number;
  /** Epoch millis of first view, or null if never reached. */
  firstSeenAt: number | null;
  /** Epoch millis of the last response change. */
  answeredAt: number | null;
}

export type SessionStatus = 'active' | 'paused' | 'submitted' | 'abandoned';

export interface SessionState {
  id: string;
  bankId: string;
  config: SessionConfig;
  items: SessionItem[];
  currentIndex: number;
  status: SessionStatus;
  /** Epoch millis when the attempt started. */
  startedAt: number;
  /** Epoch millis when the clock was paused, or null if running. */
  pausedAt: number | null;
  /** Total milliseconds spent paused, excluded from elapsed time. */
  pausedTotalMs: number;
  /** Epoch millis of the last tick, used to bill time to the current item. */
  lastTickAt: number;
  submittedAt: number | null;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface GradedItem {
  questionId: string;
  correct: boolean;
  /** 0..1. Only ever fractional when partial credit is enabled. */
  score: number;
  response: Response;
  expected: string[];
  answered: boolean;
  marked: boolean;
  timeSpentMs: number;
  sectionId?: string;
}

export interface SectionResult {
  sectionId: string;
  title: string;
  correct: number;
  total: number;
  /** Percentage 0..100. */
  percent: number;
}

export interface AttemptResult {
  id: string;
  sessionId: string;
  bankId: string;
  bankCode: string;
  mode: ExamMode;
  startedAt: number;
  finishedAt: number;
  /** Wall-clock seconds spent, excluding paused time. */
  durationSec: number;
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  /** Sum of item scores, so it can be fractional under partial credit. */
  rawScore: number;
  /** Percentage 0..100, rounded to one decimal. */
  percent: number;
  /** Score on the 100–1000 scale vendors like Microsoft and Cisco report. */
  scaledScore: number;
  passingScore: number;
  passed: boolean;
  sections: SectionResult[];
  items: GradedItem[];
}
