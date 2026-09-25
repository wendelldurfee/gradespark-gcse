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
 * Importer for the Aiken format — the simplest common quiz interchange format,
 * and what most "convert my dump" tools emit:
 *
 *     Which protocol resolves an IP address to a MAC address?
 *     A. ARP
 *     B. DNS
 *     C. DHCP
 *     D. ICMP
 *     ANSWER: A
 *
 * Multiple answers ("ANSWER: AC") are accepted as an extension.
 */

const OPTION = /^\s*([A-Z])\s*[.)]\s+(.*)$/;
const ANSWER = /^\s*answer\s*[:\-]?\s*([A-Za-z ,]+)\s*$/i;

export interface AikenOptions {
  code?: string;
  title?: string;
  sourceName?: string;
}

export function importAiken(raw: string, options: AikenOptions = {}): ImportResult {
  const warnings: string[] = [];
  const lines = normaliseSource(raw).split('\n');

  const code = options.code ?? 'AIKEN';
  const title = options.title ?? 'Imported Aiken Bank';
  const bankId = makeBankId(code, title);

  const questions: Question[] = [];
  let stemLines: string[] = [];
  let choices: Choice[] = [];

  const flush = (answerRaw: string) => {
    const stem = stemLines.join(' ').trim();
    if (!stem) {
      warnings.push('Found an ANSWER line with no preceding question, skipped.');
    } else {
      const correct = answerRaw
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .split('')
        .map((ch) => ch.charCodeAt(0) - 65)
        .filter((i) => i >= 0 && i < choices.length)
        .map((i) => choices[i].id);

      questions.push({
        id: makeQuestionId(bankId, stem, questions.length),
        bankId,
        type: inferType(correct.length, choices),
        number: questions.length + 1,
        stem,
        choices: choices.slice(),
        correct,
      });
    }
    stemLines = [];
    choices = [];
  };

  for (const line of lines) {
    const answer = ANSWER.exec(line);
    if (answer && choices.length > 0) {
      flush(answer[1]);
      continue;
    }

    const option = OPTION.exec(line);
    if (option && option[1].toUpperCase().charCodeAt(0) - 65 === choices.length) {
      choices.push({ id: indexToLetter(choices.length), text: option[2].trim() });
      continue;
    }

    if (!line.trim()) continue;

    // A new stem starts once options have been collected but no ANSWER arrived.
    if (choices.length > 0) {
      warnings.push(`Question "${stemLines.join(' ').slice(0, 40)}…" had no ANSWER line.`);
      stemLines = [];
      choices = [];
    }
    stemLines.push(line.trim());
  }

  const bank = emptyBank({
    id: bankId,
    code,
    title,
    source: options.sourceName ?? 'aiken.txt',
    questions: pruneInvalid(questions, warnings),
  });

  if (bank.questions.length === 0) {
    throw new ImportError('No Aiken questions found. Each block must end with an "ANSWER:" line.');
  }

  return { bank, warnings };
}
