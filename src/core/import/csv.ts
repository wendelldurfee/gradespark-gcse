import type { Choice, Question } from '../types';
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
 * Importer for spreadsheet exports. The header row is matched by name, so column
 * order does not matter and unknown columns are ignored:
 *
 *     question,a,b,c,d,answer,explanation,section
 *     "Which port does HTTPS use?",80,443,22,25,B,"TLS runs on 443",networking
 *
 * `answer` accepts letters ("B", "BD"), 1-based indexes, or the option text.
 * Tab-separated files are detected automatically.
 */

const QUESTION_KEYS = ['question', 'stem', 'text', 'prompt'];
const ANSWER_KEYS = ['answer', 'correct', 'correctanswer', 'key'];
const EXPLANATION_KEYS = ['explanation', 'rationale', 'notes'];
const SECTION_KEYS = ['section', 'topic', 'domain', 'objective', 'category'];
const REFERENCE_KEYS = ['reference', 'link', 'url', 'source'];
const OPTION_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export interface CsvOptions {
  code?: string;
  title?: string;
  sourceName?: string;
  /** Force a delimiter instead of sniffing it. */
  delimiter?: string;
}

export function importCsv(raw: string, options: CsvOptions = {}): ImportResult {
  const warnings: string[] = [];
  const text = normaliseSource(raw).trim();
  if (!text) throw new ImportError('The file is empty.');

  const delimiter = options.delimiter ?? sniffDelimiter(text);
  const rows = parseCsv(text, delimiter);
  if (rows.length < 2) {
    throw new ImportError('Expected a header row followed by at least one question.');
  }

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const colOf = (keys: string[]) => header.findIndex((h) => keys.includes(h));

  const questionCol = colOf(QUESTION_KEYS);
  const answerCol = colOf(ANSWER_KEYS);
  if (questionCol === -1) {
    throw new ImportError('No question column found. Expected a header named "question".');
  }
  if (answerCol === -1) {
    throw new ImportError('No answer column found. Expected a header named "answer".');
  }

  // Option columns may be named a..h, option1.., or choice1..
  const optionCols: number[] = [];
  header.forEach((name, i) => {
    const isLetter = OPTION_KEYS.includes(name);
    const isNumbered = /^(?:option|choice|opt)\d+$/.test(name);
    if (isLetter || isNumbered) optionCols.push(i);
  });

  if (optionCols.length === 0) {
    throw new ImportError('No option columns found. Expected columns named a, b, c, … or option1, option2, …');
  }

  const explanationCol = colOf(EXPLANATION_KEYS);
  const sectionCol = colOf(SECTION_KEYS);
  const referenceCol = colOf(REFERENCE_KEYS);

  const code = options.code ?? 'CSV';
  const title = options.title ?? 'Imported CSV Bank';
  const bankId = makeBankId(code, title);

  const questions: Question[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    if (row.every((cell) => !cell.trim())) return;

    const stem = (row[questionCol] ?? '').trim();
    if (!stem) {
      warnings.push(`Row ${rowIndex + 2}: no question text, skipped.`);
      return;
    }

    const choices: Choice[] = [];
    for (const col of optionCols) {
      const value = (row[col] ?? '').trim();
      if (value) choices.push({ id: indexToLetter(choices.length), text: value });
    }

    const correct = resolveAnswers((row[answerCol] ?? '').trim(), choices);
    if (correct.length === 0) {
      warnings.push(`Row ${rowIndex + 2}: answer "${row[answerCol]}" did not match any option.`);
    }

    questions.push({
      id: makeQuestionId(bankId, stem, rowIndex),
      bankId,
      sectionId: sectionCol >= 0 ? (row[sectionCol] ?? '').trim() || undefined : undefined,
      type: inferType(correct.length, choices),
      number: rowIndex + 1,
      stem,
      choices,
      correct,
      explanation: explanationCol >= 0 ? (row[explanationCol] ?? '').trim() || undefined : undefined,
      reference: referenceCol >= 0 ? (row[referenceCol] ?? '').trim() || undefined : undefined,
    });
  });

  const sections = [...new Set(questions.map((q) => q.sectionId).filter(Boolean))].map((id) => ({
    id: id as string,
    title: id as string,
  }));

  const bank = emptyBank({
    id: bankId,
    code,
    title,
    source: options.sourceName ?? 'bank.csv',
    sections,
    questions: pruneInvalid(questions, warnings),
  });

  if (bank.questions.length === 0) {
    throw new ImportError('No usable rows found in the file.');
  }

  return { bank, warnings };
}

function resolveAnswers(raw: string, choices: Choice[]): string[] {
  if (!raw || choices.length === 0) return [];

  // Exact option text wins, so answers containing commas still work.
  const byText = choices.find((c) => c.text.trim().toLowerCase() === raw.toLowerCase());
  if (byText) return [byText.id];

  const tokens = /[,;|]/.test(raw) ? raw.split(/[,;|]+/) : raw.replace(/\s+/g, '').split('');
  const ids: string[] = [];

  for (const token of tokens) {
    const t = token.trim();
    if (!t) continue;

    if (/^[A-Za-z]$/.test(t)) {
      const idx = t.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < choices.length && !ids.includes(choices[idx].id)) {
        ids.push(choices[idx].id);
      }
      continue;
    }

    if (/^\d+$/.test(t)) {
      const idx = Number(t) - 1;
      if (idx >= 0 && idx < choices.length && !ids.includes(choices[idx].id)) {
        ids.push(choices[idx].id);
      }
      continue;
    }

    const match = choices.find((c) => c.text.trim().toLowerCase() === t.toLowerCase());
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }

  return ids;
}

function sniffDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] ?? '';
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  if (tabs > commas && tabs > semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

/** RFC 4180 parser: handles quoted fields, escaped quotes, and embedded newlines. */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
