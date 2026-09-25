import { importAiken } from './aiken';
import { importCsv } from './csv';
import { importExamTopics } from './examtopics';
import { importGift } from './gift';
import { importJson } from './json';
import { ImportError, normaliseSource, type ImportResult } from './shared';

export { ImportError, type ImportResult } from './shared';
export { importAiken } from './aiken';
export { importCsv, parseCsv } from './csv';
export { importExamTopics } from './examtopics';
export { importGift } from './gift';
export { importJson, importJsonObject } from './json';
export { importVce } from './vce';

export function isVceFile(fileName: string): boolean {
  return /\.vce$/i.test(fileName);
}

/** Every format the import screen can ingest. */
export type BankFormat = 'json' | 'examtopics' | 'gift' | 'aiken' | 'csv';

export const FORMAT_LABEL: Record<BankFormat, string> = {
  json: 'JSON bank',
  examtopics: 'Dump text (ExamTopics style)',
  gift: 'Moodle GIFT',
  aiken: 'Aiken',
  csv: 'CSV / TSV',
};

/**
 * Guesses the format from the file name and a sample of the contents. The
 * extension is only a hint — a `.txt` file holding JSON is still parsed as JSON.
 */
export function detectFormat(raw: string, fileName = ''): BankFormat {
  const text = normaliseSource(raw).trim();
  const head = text.slice(0, 4000);
  const ext = fileName.toLowerCase().split('.').pop() ?? '';

  if (text.startsWith('{') || text.startsWith('[')) return 'json';

  if (/^::.+?::/m.test(head) || /\{\s*(?:=|~)/.test(head)) return 'gift';

  /**
   * Numbered question headers are the dump-site signature. Two or more of them
   * settles it, and this has to be tested before Aiken: many dumps mark the key
   * with a bare "Answer: C", which is also Aiken's marker, but Aiken has no
   * question headers and no concept of an explanation — misrouting a dump to it
   * silently discards every explanation and reference in the file.
   */
  const headers = text.match(/^[ \t]*(?:new[ \t]+)?(?:question|q)[ \t]*(?:no)?[ \t]*[#:.]?[ \t]*\d+\b/gim);
  if ((headers?.length ?? 0) >= 2) return 'examtopics';

  if (/^\s*answer\s*[:\-]\s*[A-Z]/im.test(head)) return 'aiken';

  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'gift') return 'gift';
  if (ext === 'json') return 'json';

  // A header row naming a question and an answer column is a spreadsheet.
  const firstLine = (head.split('\n')[0] ?? '').toLowerCase();
  if (/(?:question|stem)/.test(firstLine) && /answer|correct/.test(firstLine)) return 'csv';

  // Dump text is the most common paste, so prefer it over a hard failure.
  if (/^\s*(?:question|q)\s*[#:]?\s*\d+/im.test(head)) return 'examtopics';

  throw new ImportError(
    'Could not recognise the file format. Supported: JSON bank, dump text, GIFT, Aiken, CSV.',
  );
}

export interface ImportOptions {
  fileName?: string;
  /** Skip detection and force a parser. */
  format?: BankFormat;
  code?: string;
  title?: string;
  vendor?: string;
  passingScore?: number;
  timeLimitMinutes?: number;
}

/** Detects the format and runs the matching parser. */
export function importBank(raw: string, options: ImportOptions = {}): ImportResult & { format: BankFormat } {
  const fileName = options.fileName ?? '';
  const format = options.format ?? detectFormat(raw, fileName);

  let result: ImportResult;
  switch (format) {
    case 'json':
      result = importJson(raw, fileName || 'import.json');
      break;
    case 'examtopics':
      result = importExamTopics(raw, {
        code: options.code,
        title: options.title,
        vendor: options.vendor,
        passingScore: options.passingScore,
        timeLimitMinutes: options.timeLimitMinutes,
        sourceName: fileName || 'dump.txt',
      });
      break;
    case 'gift':
      result = importGift(raw, {
        code: options.code,
        title: options.title,
        sourceName: fileName || 'bank.gift',
      });
      break;
    case 'aiken':
      result = importAiken(raw, {
        code: options.code,
        title: options.title,
        sourceName: fileName || 'aiken.txt',
      });
      break;
    case 'csv':
      result = importCsv(raw, {
        code: options.code,
        title: options.title,
        sourceName: fileName || 'bank.csv',
      });
      break;
    default:
      throw new ImportError(`Unsupported format: ${format}`);
  }

  // Explicit metadata from the import form always wins over parsed defaults.
  const bank = { ...result.bank };
  if (options.code) bank.code = options.code;
  if (options.title) bank.title = options.title;
  if (options.vendor) bank.vendor = options.vendor;
  if (options.passingScore !== undefined) bank.passingScore = options.passingScore;
  if (options.timeLimitMinutes !== undefined) bank.timeLimitMinutes = options.timeLimitMinutes;

  return { bank, warnings: result.warnings, format };
}
