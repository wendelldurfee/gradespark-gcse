import type { Choice, Question, QuestionType } from '../types';
import {
  ImportError,
  emptyBank,
  indexToLetter,
  makeBankId,
  makeQuestionId,
  normaliseSource,
  pruneInvalid,
  type ImportResult,
} from './shared';

/**
 * Importer for Moodle's GIFT format, which most question-bank editors can
 * export:
 *
 *     ::Subnetting::Which mask gives 30 usable hosts? {
 *       =255.255.255.224
 *       ~255.255.255.192
 *       ~255.255.255.240
 *     }
 *
 *     // A true/false item
 *     ::VLANs::A trunk port carries multiple VLANs. {T}
 *
 *     // Short answer, several accepted spellings
 *     The command to view the routing table is {=show ip route =sh ip ro}
 *
 * `=` marks a correct option, `~` a distractor, `#` an explanation, and
 * `~%50%text` a partially-credited option (treated here as correct).
 */

const TITLE = /^::(.*?)::/;
const COMMENT = /^\s*\/\//;

export interface GiftOptions {
  code?: string;
  title?: string;
  sourceName?: string;
}

export function importGift(raw: string, options: GiftOptions = {}): ImportResult {
  const warnings: string[] = [];
  const text = normaliseSource(raw)
    .split('\n')
    .filter((line) => !COMMENT.test(line))
    .join('\n');

  const code = options.code ?? 'GIFT';
  const title = options.title ?? 'Imported GIFT Bank';
  const bankId = makeBankId(code, title);

  const questions: Question[] = [];

  for (const rawBlock of splitBlocks(text)) {
    const block = rawBlock.trim();
    if (!block) continue;

    const open = block.indexOf('{');
    const close = block.lastIndexOf('}');

    // No braces means a description block, which carries no answer.
    if (open === -1 || close === -1 || close < open) {
      warnings.push(`Skipped a block with no { } answer section: "${block.slice(0, 40)}…"`);
      continue;
    }

    let stem = block.slice(0, open).trim();
    const trailing = block.slice(close + 1).trim();
    const body = block.slice(open + 1, close).trim();

    const titleMatch = TITLE.exec(stem);
    let sectionId: string | undefined;
    if (titleMatch) {
      sectionId = titleMatch[1].trim() || undefined;
      stem = stem.slice(titleMatch[0].length).trim();
    }

    // Short-answer items embed the blank mid-sentence; put it back as "____".
    if (trailing) stem = `${stem} ____ ${trailing}`.trim();

    stem = unescapeGift(stem);
    if (!stem) {
      warnings.push('Skipped a GIFT block with no question text.');
      continue;
    }

    const parsed = parseBody(body);
    questions.push({
      id: makeQuestionId(bankId, stem, questions.length),
      bankId,
      sectionId,
      type: parsed.type,
      number: questions.length + 1,
      stem,
      choices: parsed.choices.length > 0 ? parsed.choices : undefined,
      correct: parsed.correct,
      explanation: parsed.explanation,
    });
  }

  const bank = emptyBank({
    id: bankId,
    code,
    title,
    source: options.sourceName ?? 'bank.gift',
    sections: [...new Set(questions.map((q) => q.sectionId).filter(Boolean))].map((id) => ({
      id: id as string,
      title: id as string,
    })),
    questions: pruneInvalid(questions, warnings),
  });

  if (bank.questions.length === 0) {
    throw new ImportError('No GIFT questions found. Each question needs a { } answer section.');
  }

  return { bank, warnings };
}

/** Splits on blank lines, but never inside a `{ }` answer section. */
function splitBlocks(text: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let buffer: string[] = [];

  for (const line of text.split('\n')) {
    const opens = (line.match(/(?<!\\)\{/g) ?? []).length;
    const closes = (line.match(/(?<!\\)\}/g) ?? []).length;

    if (!line.trim() && depth === 0) {
      if (buffer.length > 0) blocks.push(buffer.join('\n'));
      buffer = [];
      continue;
    }

    buffer.push(line);
    depth += opens - closes;
    if (depth < 0) depth = 0;
  }

  if (buffer.length > 0) blocks.push(buffer.join('\n'));
  return blocks;
}

interface ParsedBody {
  type: QuestionType;
  choices: Choice[];
  correct: string[];
  explanation?: string;
}

function parseBody(body: string): ParsedBody {
  const upper = body.trim().toUpperCase();

  if (upper === 'T' || upper === 'TRUE' || upper === 'F' || upper === 'FALSE') {
    const isTrue = upper.startsWith('T');
    return {
      type: 'truefalse',
      choices: [
        { id: 'A', text: 'True' },
        { id: 'B', text: 'False' },
      ],
      correct: [isTrue ? 'A' : 'B'],
    };
  }

  const choices: Choice[] = [];
  const correct: string[] = [];
  const accepted: string[] = [];
  const explanations: string[] = [];

  for (const token of tokenise(body)) {
    const { marker, text, feedback } = token;
    if (feedback) explanations.push(feedback);

    if (marker === '=') {
      // A block with only `=` entries and no `~` is a short-answer question.
      accepted.push(text);
      choices.push({ id: indexToLetter(choices.length), text });
      correct.push(choices[choices.length - 1].id);
    } else if (marker === '~') {
      choices.push({ id: indexToLetter(choices.length), text });
    } else if (marker === '#') {
      explanations.push(text);
    }
  }

  const hasDistractors = choices.length > correct.length;
  const explanation = explanations.filter(Boolean).join('\n').trim() || undefined;

  if (!hasDistractors && accepted.length > 0) {
    return { type: 'fill', choices: [], correct: accepted, explanation };
  }

  return {
    type: correct.length > 1 ? 'multiple' : 'single',
    choices,
    correct,
    explanation,
  };
}

interface Token {
  marker: '=' | '~' | '#';
  text: string;
  feedback?: string;
}

/** Walks the answer body, honouring `\` escapes and `%50%` credit weights. */
function tokenise(body: string): Token[] {
  const tokens: Token[] = [];
  let marker: Token['marker'] | null = null;
  let buffer = '';

  const push = () => {
    if (marker === null) return;
    // Everything after an unescaped `#` is per-option feedback.
    const hash = indexOfUnescaped(buffer, '#');
    const text = hash === -1 ? buffer : buffer.slice(0, hash);
    const feedback = hash === -1 ? undefined : buffer.slice(hash + 1);
    tokens.push({
      marker,
      text: unescapeGift(stripWeight(text)).trim(),
      feedback: feedback ? unescapeGift(feedback).trim() : undefined,
    });
    buffer = '';
  };

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\') {
      buffer += ch + (body[i + 1] ?? '');
      i++;
      continue;
    }
    if (ch === '=' || ch === '~') {
      push();
      marker = ch;
      continue;
    }
    buffer += ch;
  }
  push();

  return tokens.filter((t) => t.text.length > 0 || t.feedback);
}

/** `%50%Partly right` → `Partly right`. */
function stripWeight(text: string): string {
  return text.replace(/^\s*%-?\d+(?:\.\d+)?%/, '');
}

function indexOfUnescaped(text: string, char: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === char) return i;
  }
  return -1;
}

function unescapeGift(text: string): string {
  return text.replace(/\\([:~=#{}\\])/g, '$1').replace(/\s+/g, ' ').trim();
}
