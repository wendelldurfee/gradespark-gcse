import type { Choice, ExamBank, Question, QuestionType } from '../types';
import {
  ImportError,
  emptyBank,
  indexToLetter,
  inferType,
  makeBankId,
  makeQuestionId,
  pruneInvalid,
  type ImportResult,
} from './shared';

/**
 * Importer for the app's native JSON bank format, written defensively so that
 * hand-edited and third-party files still load. Choices may be given as plain
 * strings or objects, and the answer key may be letters ("BD"), indexes, ids,
 * or the option text itself.
 */

const VALID_TYPES = new Set<QuestionType>([
  'single',
  'multiple',
  'truefalse',
  'fill',
  'ordering',
  'dragdrop',
  'matching',
  'hotspot',
]);

export function importJson(raw: string, sourceName = 'import.json'): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ImportError(`Not valid JSON: ${(err as Error).message}`);
  }
  return importJsonObject(parsed, sourceName);
}

export function importJsonObject(parsed: unknown, sourceName = 'import.json'): ImportResult {
  const warnings: string[] = [];

  // Accept either a full bank object or a bare array of questions.
  const root = Array.isArray(parsed)
    ? { questions: parsed }
    : (parsed as Record<string, unknown> | null);

  if (!root || typeof root !== 'object') {
    throw new ImportError('Expected a JSON object describing a bank, or an array of questions.');
  }

  const rawQuestions = root.questions ?? root.items ?? root.data;
  if (!Array.isArray(rawQuestions)) {
    throw new ImportError('No "questions" array found in the file.');
  }

  const code = str(root.code) ?? str(root.examCode) ?? 'CUSTOM';
  const title = str(root.title) ?? str(root.name) ?? 'Imported Question Bank';
  const bankId = str(root.id) ?? makeBankId(code, title);

  const questions: Question[] = [];
  rawQuestions.forEach((entry, index) => {
    try {
      const question = parseQuestion(entry as Record<string, unknown>, bankId, index, warnings);
      if (question) questions.push(question);
    } catch (err) {
      warnings.push(`Question ${index + 1}: ${(err as Error).message}`);
    }
  });

  const bank: ExamBank = emptyBank({
    id: bankId,
    code,
    title,
    vendor: str(root.vendor),
    description: str(root.description),
    passingScore: num(root.passingScore) ?? 70,
    timeLimitMinutes: num(root.timeLimitMinutes) ?? num(root.timeLimit) ?? 90,
    questionCount: num(root.questionCount),
    version: str(root.version),
    source: sourceName,
    sections: parseSections(root.sections),
    caseStudies: Array.isArray(root.caseStudies) ? (root.caseStudies as ExamBank['caseStudies']) : [],
    questions: pruneInvalid(questions, warnings),
  });

  if (bank.questions.length === 0) {
    throw new ImportError('The file contained no usable questions.');
  }

  return { bank, warnings };
}

function parseSections(value: unknown): ExamBank['sections'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => {
      if (typeof s === 'string') return { id: s, title: s };
      const obj = s as Record<string, unknown>;
      const id = str(obj.id) ?? str(obj.title);
      if (!id) return null;
      return { id, title: str(obj.title) ?? id, weight: num(obj.weight) };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

function parseQuestion(
  entry: Record<string, unknown>,
  bankId: string,
  index: number,
  warnings: string[],
): Question | null {
  const stem = str(entry.stem) ?? str(entry.question) ?? str(entry.text) ?? '';
  if (!stem) {
    warnings.push(`Question ${index + 1}: no question text, skipped.`);
    return null;
  }

  const choices = parseChoices(entry.choices ?? entry.options ?? entry.answers);
  const declaredType = str(entry.type)?.toLowerCase();
  const correct = parseCorrect(entry, choices);

  const type: QuestionType =
    declaredType && VALID_TYPES.has(declaredType as QuestionType)
      ? (declaredType as QuestionType)
      : inferType(correct.length, choices);

  return {
    id: str(entry.id) ?? makeQuestionId(bankId, stem, index),
    bankId,
    sectionId: str(entry.sectionId) ?? str(entry.section) ?? str(entry.topic),
    type,
    number: num(entry.number) ?? index + 1,
    stem,
    exhibits: strArray(entry.exhibits ?? entry.images),
    choices: choices.length > 0 ? choices : undefined,
    targets: parseTargets(entry.targets),
    hotspots: parseHotspots(entry.hotspots),
    correct,
    selectCount: num(entry.selectCount),
    explanation: str(entry.explanation) ?? str(entry.rationale),
    reference: str(entry.reference) ?? str(entry.link),
    communityAnswer: str(entry.communityAnswer),
    communityVotes: parseVotes(entry.communityVotes),
    discussion: Array.isArray(entry.discussion) ? (entry.discussion as Question['discussion']) : undefined,
    tags: strArray(entry.tags),
    difficulty: num(entry.difficulty) as Question['difficulty'],
    caseStudyId: str(entry.caseStudyId),
  };
}

function parseChoices(value: unknown): Choice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((c, i): Choice | null => {
      if (typeof c === 'string') return { id: indexToLetter(i), text: c };
      if (c && typeof c === 'object') {
        const obj = c as Record<string, unknown>;
        const text = str(obj.text) ?? str(obj.label) ?? str(obj.value);
        if (!text) return null;
        return { id: str(obj.id) ?? indexToLetter(i), text, image: str(obj.image) };
      }
      return null;
    })
    .filter((c): c is Choice => c !== null);
}

function parseTargets(value: unknown): Question['targets'] {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((t, i) => {
      if (typeof t === 'string') return { id: `t${i + 1}`, label: t };
      const obj = t as Record<string, unknown>;
      const label = str(obj.label) ?? str(obj.text);
      if (!label) return null;
      return { id: str(obj.id) ?? `t${i + 1}`, label };
    })
    .filter((t): t is { id: string; label: string } => t !== null);
}

function parseHotspots(value: unknown): Question['hotspots'] {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((h, i) => {
      const obj = h as Record<string, unknown>;
      const options = strArray(obj.options) ?? [];
      const correct = str(obj.correct);
      if (options.length === 0 || !correct) return null;
      return {
        id: str(obj.id) ?? `h${i + 1}`,
        label: str(obj.label) ?? `Item ${i + 1}`,
        options,
        correct,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);
}

function parseVotes(value: unknown): Question['communityVotes'] {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((v) => {
      const obj = v as Record<string, unknown>;
      const answer = str(obj.answer);
      const count = num(obj.count) ?? num(obj.votes);
      if (!answer || count === undefined) return null;
      return { answer, count };
    })
    .filter((v): v is { answer: string; count: number } => v !== null);
}

/**
 * Resolves the answer key against the choice list. Supports every shape seen in
 * the wild: `"BD"`, `["B","D"]`, `[1,3]`, choice ids, and full option text.
 */
function parseCorrect(entry: Record<string, unknown>, choices: Choice[]): string[] {
  const raw = entry.correct ?? entry.answer ?? entry.correctAnswer ?? entry.correctAnswers;
  if (raw === undefined || raw === null) return [];

  const tokens: string[] = Array.isArray(raw)
    ? raw.map((r) => String(r))
    : typeof raw === 'string'
      ? splitAnswerString(raw, choices)
      : [String(raw)];

  const resolved: string[] = [];
  for (const token of tokens) {
    const id = resolveToken(token.trim(), choices);
    if (id !== null && !resolved.includes(id)) resolved.push(id);
  }
  return resolved;
}

/** "BD" and "B, D" both mean two answers; "failover" is one free-text answer. */
function splitAnswerString(raw: string, choices: Choice[]): string[] {
  const trimmed = raw.trim();
  if (/[,;|]/.test(trimmed)) return trimmed.split(/[,;|]+/);
  // A short run of bare letters within range is a letter key, not prose.
  if (/^[A-Za-z]{1,8}$/.test(trimmed) && choices.length > 0) {
    const letters = trimmed.toUpperCase().split('');
    if (letters.every((l) => l.charCodeAt(0) - 65 < choices.length)) return letters;
  }
  return [trimmed];
}

function resolveToken(token: string, choices: Choice[]): string | null {
  if (!token) return null;
  if (choices.length === 0) return token; // fill-in-the-blank and pair answers

  // Already an id, or a "target=choice" pair.
  if (choices.some((c) => c.id === token)) return token;
  if (token.includes('=')) return token;

  // Single letter within range.
  if (/^[A-Za-z]$/.test(token)) {
    const idx = token.toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < choices.length) return choices[idx].id;
  }

  // Numeric index — treated as 1-based unless a 0 appears, which implies 0-based.
  if (/^\d+$/.test(token)) {
    const n = Number(token);
    const idx = n > 0 && n <= choices.length ? n - 1 : n;
    if (idx >= 0 && idx < choices.length) return choices[idx].id;
  }

  // Full option text.
  const byText = choices.find((c) => c.text.trim().toLowerCase() === token.toLowerCase());
  if (byText) return byText.id;

  return token;
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function strArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return out.length > 0 ? out : undefined;
}
