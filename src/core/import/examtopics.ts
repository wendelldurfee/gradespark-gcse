import type { Choice, CommunityVote, ExamBank, Question, Section } from '../types';
import {
  ImportError,
  emptyBank,
  indexToLetter,
  inferType,
  makeBankId,
  makeQuestionId,
  normaliseSource,
  pruneInvalid,
  type ImportResult,
} from './shared';

/**
 * Importer for the plain-text question dumps published by community exam sites
 * (ExamTopics and the many layouts that copy it).
 *
 * The format is not specified anywhere, so this parser is tolerant: it splits on
 * question headers, treats the first `A.`-style marker as the start of the
 * options, and picks up whichever of the trailing metadata blocks are present.
 *
 * A recognised block looks like:
 *
 *     Question #12 Topic 3
 *     You need to configure high availability for the database.
 *     What should you do? (Choose two.)
 *
 *     A. Enable geo-replication
 *     B. Add a secondary replica
 *     C. Increase the vCore count
 *     D. Enable auto-failover groups
 *
 *     Correct Answer: BD
 *
 *     Community vote distribution
 *     BD (74%)
 *     AB (26%)
 *
 *     Explanation:
 *     Auto-failover groups plus a secondary replica give ...
 *
 *     Reference:
 *     https://learn.microsoft.com/...
 */

/**
 * Starts a new block. Covers every header style seen in the wild:
 * "Question #12 Topic 3", "QUESTION 12", "Q12.", "NEW QUESTION 7",
 * "QUESTION NO: 5".
 */
const QUESTION_HEADER =
  /^\s*(?:new\s+)?(?:question|q)\s*(?:no)?\s*[#:.]?\s*(\d+)\b(?:\s*[-–—]?\s*\(?\s*(?:exam\s+)?topic\s*(\d+)\s*\)?)?/i;
/** Same header, matched anywhere in the document rather than line by line. */
const QUESTION_HEADER_ANYWHERE = /^[ \t]*(?:new[ \t]+)?(?:question|q)[ \t]*(?:no)?[ \t]*[#:.]?[ \t]*\d+\b/im;
const OPTION_MARKER = /^\s*([A-Z])\s*[.)\]:]\s+(.*)$/;
const CORRECT_LINE = /^\s*(?:correct\s+answer|answer|correct)\s*[:\-]\s*(.*)$/i;
const COMMUNITY_HEADER = /^\s*community\s+vote\s+distribution/i;
const VOTE_LINE = /^\s*([A-Z]{1,6})\s*\((\d+)%?\)/;
const EXPLANATION_HEADER = /^\s*(?:explanation|answer\s+description|rationale)\s*[:\-]?\s*(.*)$/i;
const REFERENCE_HEADER = /^\s*(?:references?|source|link)\s*[:\-]?\s*(.*)$/i;
/** "Topic 3", "(Exam Topic 5)", "- (Exam Topic 5)" on a line of its own. */
const TOPIC_ONLY = /^\s*[-–—]?\s*\(?\s*(?:exam\s+)?topic\s*(\d+)\s*\)?\s*$/i;
const CHOOSE_HINT = /\(\s*(?:choose|select)\s+(two|three|four|2|3|4|all\s+that\s+apply)/i;
const NOISE_LINE =
  /^\s*(?:show\s+suggested\s+answer|hide\s+answer|reveal\s+solution|upvoted\s+\d+\s+times?|most\s+voted|highly\s+voted|selected\s+answer\s*:?)\s*$/i;

export interface ExamTopicsOptions {
  code?: string;
  title?: string;
  vendor?: string;
  passingScore?: number;
  timeLimitMinutes?: number;
  sourceName?: string;
}

export function importExamTopics(raw: string, options: ExamTopicsOptions = {}): ImportResult {
  const warnings: string[] = [];
  const text = normaliseSource(raw);
  const blocks = splitIntoBlocks(text);

  if (blocks.length === 0) {
    throw new ImportError(
      'No questions found. Expected blocks beginning with "Question #1" or "QUESTION 1".',
    );
  }

  // Dumps converted from PDF carry the page header and footer into the middle
  // of questions. Strip them before parsing, or they end up inside stems.
  const boilerplate = findBoilerplate(text, blocks.length);
  if (boilerplate.size > 0) {
    for (const block of blocks) {
      block.lines = block.lines.filter((line) => !boilerplate.has(line.trim()));
    }
  }

  const code = options.code ?? guessExamCode(text) ?? 'DUMP';
  const title = options.title ?? `${code} Question Bank`;
  const bankId = makeBankId(code, title);

  const questions: Question[] = [];
  const topics = new Set<string>();

  blocks.forEach((block, index) => {
    const question = parseBlock(block, bankId, index, warnings);
    if (question) {
      questions.push(question);
      if (question.sectionId) topics.add(question.sectionId);
    }
  });

  const sections: Section[] = [...topics]
    .sort((a, b) => collateTopic(a) - collateTopic(b))
    .map((id) => ({ id, title: `Topic ${id.replace(/^topic-/, '')}` }));

  const bank: ExamBank = emptyBank({
    id: bankId,
    code,
    title,
    vendor: options.vendor,
    description: `Imported from a community question dump (${blocks.length} blocks parsed).`,
    passingScore: options.passingScore ?? 70,
    timeLimitMinutes: options.timeLimitMinutes ?? 120,
    source: options.sourceName ?? 'dump.txt',
    sections,
    questions: pruneInvalid(questions, warnings),
  });

  if (bank.questions.length === 0) {
    throw new ImportError('Questions were found but none had a usable answer key.');
  }

  return { bank, warnings };
}

interface Block {
  number: number;
  topic?: string;
  lines: string[];
}

/**
 * Identifies repeated page furniture — the watermark, site URL and footer that
 * a PDF-to-text conversion repeats on every page, landing mid-question.
 *
 * Detection is by repetition rather than a list of known vendor strings, so it
 * works for any dump site: a line that is not structural (not an option, answer
 * key, explanation header or topic line) and recurs across a large share of the
 * questions is furniture, not content. Answer options such as the "A. Mastered
 * / B. Not Mastered" pair repeat legitimately, which is why structural lines are
 * exempt.
 */
function findBoilerplate(text: string, blockCount: number): Set<string> {
  const counts = new Map<string, number>();

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length < 8) continue;
    if (
      OPTION_MARKER.test(line) ||
      CORRECT_LINE.test(line) ||
      EXPLANATION_HEADER.test(line) ||
      REFERENCE_HEADER.test(line) ||
      COMMUNITY_HEADER.test(line) ||
      TOPIC_ONLY.test(line) ||
      QUESTION_HEADER.test(line)
    ) {
      continue;
    }
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  // Needs to recur often in absolute terms and relative to the question count,
  // so a short dump with a genuinely repeated sentence is not stripped.
  const threshold = Math.max(4, Math.ceil(blockCount * 0.15));
  const boilerplate = new Set<string>();
  for (const [line, count] of counts) {
    if (count >= threshold) boilerplate.add(line);
  }
  return boilerplate;
}

function splitIntoBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const line of lines) {
    const header = QUESTION_HEADER.exec(line);
    if (header) {
      if (current) blocks.push(current);
      current = {
        number: Number(header[1]),
        topic: header[2] ? `topic-${header[2]}` : undefined,
        lines: [],
      };
      // Anything trailing the header on the same line is the start of the stem.
      const rest = line.slice(header[0].length).trim();
      if (rest && !TOPIC_ONLY.test(rest)) current.lines.push(rest);
      continue;
    }
    if (current) current.lines.push(line);
  }

  if (current) blocks.push(current);
  return blocks;
}

type Region = 'stem' | 'options' | 'community' | 'explanation' | 'reference';

/**
 * Locates the real option list within a block.
 *
 * A stem can legitimately contain a line like "A. Datum Corporation has …",
 * which looks exactly like an option marker. So rather than opening the options
 * region at the first marker seen, this collects every marker line and keeps the
 * *last* run that reads A, B, C, … in sequence and is at least two long — the
 * options always sit at the end of the block, and a stray sentence never forms a
 * sequential run. Returns a map of line index to option text.
 */
function findOptionLines(lines: readonly string[]): Map<number, string> {
  // Markers appearing after the answer key belong to the explanation, not the options.
  let limit = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (CORRECT_LINE.test(lines[i]) || COMMUNITY_HEADER.test(lines[i])) {
      limit = i;
      break;
    }
  }

  const candidates: { line: number; index: number; text: string }[] = [];
  for (let i = 0; i < limit; i++) {
    const match = OPTION_MARKER.exec(lines[i]);
    if (match) {
      candidates.push({ line: i, index: letterIndex(match[1]), text: match[2].trim() });
    }
  }

  let best: typeof candidates | null = null;
  let i = 0;
  while (i < candidates.length) {
    if (candidates[i].index !== 0) {
      i++;
      continue;
    }
    const run = [candidates[i]];
    let j = i + 1;
    while (j < candidates.length && candidates[j].index === run.length) {
      run.push(candidates[j]);
      j++;
    }
    if (run.length >= 2) best = run;
    i = Math.max(j, i + 1);
  }

  const result = new Map<number, string>();
  for (const entry of best ?? []) result.set(entry.line, entry.text);
  return result;
}

function parseBlock(
  block: Block,
  bankId: string,
  index: number,
  warnings: string[],
): Question | null {
  const stemLines: string[] = [];
  const explanationLines: string[] = [];
  const referenceLines: string[] = [];
  const choices: Choice[] = [];
  const votes: CommunityVote[] = [];

  let region: Region = 'stem';
  let correctRaw = '';
  let topic = block.topic;

  const optionLines = findOptionLines(block.lines);

  for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex++) {
    const line = block.lines[lineIndex].trimEnd();

    if (NOISE_LINE.test(line)) continue;

    const topicOnly = TOPIC_ONLY.exec(line);
    if (topicOnly && region === 'stem') {
      topic = topic ?? `topic-${topicOnly[1]}`;
      continue;
    }

    // The answer key can appear before or after the community block.
    const correct = CORRECT_LINE.exec(line);
    if (correct && choices.length > 0) {
      correctRaw = correct[1].trim();
      region = 'options';
      continue;
    }

    if (COMMUNITY_HEADER.test(line)) {
      region = 'community';
      continue;
    }

    const explanation = EXPLANATION_HEADER.exec(line);
    if (explanation && region !== 'stem') {
      region = 'explanation';
      if (explanation[1]?.trim()) explanationLines.push(explanation[1].trim());
      continue;
    }

    const reference = REFERENCE_HEADER.exec(line);
    if (reference && region !== 'stem') {
      region = 'reference';
      if (reference[1]?.trim()) referenceLines.push(reference[1].trim());
      continue;
    }

    if (region === 'community') {
      const vote = VOTE_LINE.exec(line);
      if (vote) {
        votes.push({ answer: vote[1].toUpperCase(), count: Number(vote[2]) });
        continue;
      }
      // A non-vote line ends the community block; fall through and re-handle it.
      if (line.trim()) region = 'explanation';
      else continue;
    }

    const optionText = optionLines.get(lineIndex);
    if (optionText !== undefined) {
      region = 'options';
      choices.push({ id: indexToLetter(choices.length), text: optionText });
      continue;
    }

    if (!line.trim()) {
      if (region === 'explanation') explanationLines.push('');
      continue;
    }

    switch (region) {
      case 'stem':
        stemLines.push(line);
        break;
      case 'options':
        // Wrapped option text continues the previous option.
        if (choices.length > 0) {
          choices[choices.length - 1].text += ` ${line.trim()}`;
        }
        break;
      case 'explanation':
        explanationLines.push(line.trim());
        break;
      case 'reference':
        referenceLines.push(line.trim());
        break;
      default:
        break;
    }
  }

  const stem = stemLines.join('\n').trim();
  if (!stem) {
    warnings.push(`Question #${block.number}: no question text, skipped.`);
    return null;
  }

  const communityAnswer = votes.length > 0 ? topVote(votes) : undefined;
  // Some dumps hide the vendor key behind a paywall; the community consensus is
  // then the only key available, so fall back to it rather than dropping the item.
  const answerSource = correctRaw || communityAnswer || '';
  const correct = lettersToChoiceIds(answerSource, choices);

  if (correct.length === 0 && answerSource) {
    warnings.push(`Question #${block.number}: could not resolve answer "${answerSource}".`);
  }

  const selectCount = parseChooseHint(stem);

  return {
    id: makeQuestionId(bankId, stem, index),
    bankId,
    sectionId: topic,
    type: inferType(Math.max(correct.length, selectCount ?? 0), choices),
    number: block.number,
    stem,
    choices: choices.length > 0 ? choices : undefined,
    correct,
    selectCount,
    explanation: explanationLines.join('\n').trim() || undefined,
    reference: referenceLines.join('\n').trim() || undefined,
    communityAnswer,
    communityVotes: votes.length > 0 ? votes : undefined,
  };
}

function letterIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

/** Turns "BD", "B, D", or "Answer: B and D" into choice ids. */
function lettersToChoiceIds(raw: string, choices: Choice[]): string[] {
  if (!raw || choices.length === 0) return [];

  const cleaned = raw
    .replace(/\b(?:and|or)\b/gi, ' ')
    .replace(/[^A-Za-z]/g, ' ')
    .trim();
  if (!cleaned) return [];

  const ids: string[] = [];
  for (const token of cleaned.split(/\s+/)) {
    for (const ch of token.toUpperCase()) {
      const idx = letterIndex(ch);
      if (idx >= 0 && idx < choices.length) {
        const id = choices[idx].id;
        if (!ids.includes(id)) ids.push(id);
      }
    }
  }
  return ids;
}

function topVote(votes: readonly CommunityVote[]): string {
  return votes.reduce((best, v) => (v.count > best.count ? v : best), votes[0]).answer;
}

/** "(Choose two.)" tells us how many boxes must be ticked. */
function parseChooseHint(stem: string): number | undefined {
  const match = CHOOSE_HINT.exec(stem);
  if (!match) return undefined;
  const word = match[1].toLowerCase();
  if (word.startsWith('all')) return undefined;
  const map: Record<string, number> = { two: 2, '2': 2, three: 3, '3': 3, four: 4, '4': 4 };
  return map[word];
}

/**
 * Vendor exam codes, covering the shapes actually in use:
 *   AZ-104, MS-900   (Microsoft)   SY0-701, N10-009  (CompTIA)
 *   SAA-C03, DVA-C02 (AWS)         220-1101, 200-301 (CompTIA A+, Cisco)
 *   1Z0-808          (Oracle)
 */
const EXAM_CODE =
  /\b(\d[A-Z]\d-\d{2,4}|[A-Z]{1,4}\d{0,2}[- ]\d{2,4}|[A-Z]{2,4}[- ][A-Z]\d{2,3}|\d{3}-\d{3,4})\b/;

/**
 * Tokens shaped exactly like an exam code that never are one. Without this,
 * a question mentioning SHA-256 or RFC-1918 can win over the real code.
 */
const NOT_EXAM_CODES = /^(SHA|AES|RSA|MD|RFC|ISO|IEC|IEEE|ANSI|NIST|FIPS|TLS|SSL|IPV|UTF|X)\b/;

/**
 * Reads the vendor exam code from the preamble — the text before the first
 * question block. Restricting the search to the header is what keeps a
 * "SHA-256" inside an answer option from being mistaken for the exam code;
 * codes are declared in the file's title, never mid-question.
 */
function guessExamCode(text: string): string | undefined {
  const firstQuestion = text.search(QUESTION_HEADER_ANYWHERE);
  const preamble = (firstQuestion > 0 ? text.slice(0, firstQuestion) : text.slice(0, 400)).slice(
    0,
    2000,
  );

  // Scan every candidate, not just the first, so a denylisted token does not
  // shadow the real code that follows it.
  const pattern = new RegExp(EXAM_CODE.source, 'g');
  for (const match of preamble.matchAll(pattern)) {
    const code = match[1].replace(/\s+/g, '-').toUpperCase();
    if (!NOT_EXAM_CODES.test(code)) return code;
  }
  return undefined;
}

function collateTopic(id: string): number {
  const n = Number(id.replace(/^topic-/, ''));
  return Number.isFinite(n) ? n : 9999;
}
