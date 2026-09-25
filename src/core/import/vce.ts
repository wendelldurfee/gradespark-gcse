import { cbc } from '@noble/ciphers/aes.js';
import type { Choice, ExamBank, Question, Section } from '../types';
import { ImportError, makeBankId, makeQuestionId, type ImportResult } from './shared';

const SECTION_MARKER = new Uint8Array([0x2d, 0x38, 0x20, 0x31, 0x20, 0x33, 0x20, 0x31]);
const decoder = new TextDecoder('utf-8');

class Reader {
  offset = 0;
  constructor(readonly data: Uint8Array) {}
  byte() { this.need(1); return this.data[this.offset++]; }
  int32() {
    this.need(4);
    const value = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 4).getInt32(0, true);
    this.offset += 4;
    return value;
  }
  int64() { this.need(8); this.offset += 8; }
  bytes(length: number) {
    if (length < 0) throw new ImportError('The VCE file contains an invalid data length.');
    this.need(length);
    const value = this.data.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
  private need(length: number) {
    if (this.offset + length > this.data.length) throw new ImportError('The VCE file ended unexpectedly.');
  }
}

function arrayLength(reader: Reader): number {
  let current = reader.byte();
  const first = (current ^ (current ^ 0x80)) & 0xff;
  let rolling = (0x80 + first) | 0;
  const bytes = new Uint8Array(4);
  for (let index = 0; index < 4; index++) {
    current = reader.byte();
    bytes[index] = (rolling ^ current) & 0xff;
    const value = (current ^ (rolling ^ current)) & 0xff;
    rolling = (rolling + value) | (index + 1);
  }
  return new DataView(bytes.buffer).getInt32(0, true);
}

function readArray(reader: Reader) { return reader.bytes(arrayLength(reader)); }

function decodeString(bytes: Uint8Array): string {
  return decoder.decode(bytes.filter((byte) => byte >= 32)).replaceAll('\0', '').trim();
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, start: number): number {
  outer: for (let i = start; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

function splitBytes(data: Uint8Array, marker: Uint8Array): Uint8Array[] {
  const result: Uint8Array[] = [];
  let start = 0;
  while (start <= data.length) {
    const found = indexOfBytes(data, marker, start);
    if (found < 0) { result.push(data.slice(start)); break; }
    result.push(data.slice(start, found));
    result.push(marker);
    start = found + marker.length;
  }
  return result;
}

/** Removes VCE's layout records while retaining the visible UTF-8 text. */
function formattedText(data: Uint8Array): string {
  const text = decoder.decode(data)
    .replaceAll('\0', '')
    .replace(/(?:^|\r?\n)-?\d+(?:\s+-?\d+){4,9}(?:\s+"[^"]*")?(?=\r?\n|$)/g, '\n')
    .replace(/T(?:JPEG|Png)Image[\s\S]*$/i, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function contentSections(data: Uint8Array): string[] {
  return splitBytes(data, SECTION_MARKER)
    .filter((part) => !(part.length === SECTION_MARKER.length && part.every((v, i) => v === SECTION_MARKER[i])))
    .map((part) => part.length > 5 ? part.slice(0, -5) : part)
    .map(formattedText)
    .filter(Boolean);
}

function imageMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  return 'application/octet-stream';
}

function base64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    output += b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)];
    output += c === undefined ? '=' : alphabet[c & 63];
  }
  return output;
}

interface RawQuestion {
  type: number; sectionId: number; complexity: number; stem: string; variants: string[];
  answers: string[]; reference?: string; image?: Uint8Array;
}

export function importVce(input: Uint8Array, sourceName = 'exam.vce'): ImportResult {
  try {
    return parseVce(input, sourceName);
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(`Could not read this VCE file: ${(error as Error).message}`);
  }
}

function parseVce(input: Uint8Array, sourceName: string): ImportResult {
  const reader = new Reader(input);
  if (reader.byte() !== 0x85 || reader.byte() !== 0xa8) throw new ImportError('This is not a valid VCE file.');
  const version = reader.byte() * 10 + reader.byte();
  if (version < 60 || version > 62) throw new ImportError(`VCE version ${version} is not supported yet.`);
  reader.int32();
  const keys = readArray(reader);
  readArray(reader);
  reader.byte();

  const decrypt = (): Uint8Array => {
    let length = arrayLength(reader);
    if (length === 0) return new Uint8Array();
    length--;
    const selector = reader.byte();
    if (version >= 61) length -= 4;
    const globalOffset = version >= 61 ? reader.int32() : 0;
    if (selector >= 0x80) throw new ImportError('This VCE file uses an external encryption key and cannot be imported offline.');
    const key = keys.slice(globalOffset, globalOffset + 32);
    const iv = keys.slice(globalOffset + 32, globalOffset + 48);
    if (key.length !== 32 || iv.length !== 16 || length % 16 !== 0) throw new ImportError('The VCE file has invalid encryption data.');
    return cbc(key, iv, { disablePadding: true }).decrypt(reader.bytes(length));
  };
  const string = () => decodeString(decrypt());

  const code = string() || sourceName.replace(/\.vce$/i, '');
  const title = string() || code;
  const rawPassingScore = reader.int32();
  const timeLimitMinutes = reader.int32();
  const fileVersion = string();
  reader.int64(); reader.int64();
  if (version <= 61) { reader.int64(); reader.int64(); reader.byte(); reader.byte(); string(); }
  string();
  const description = string();

  const sectionCount = reader.int32();
  const sections: Section[] = [];
  for (let i = 0; i < sectionCount; i++) {
    const id = reader.int32();
    sections.push({ id: String(id), title: string() || `Section ${i + 1}` });
  }
  string();

  const rawQuestions: RawQuestion[] = [];
  const readQuestions = (count: number) => {
    for (let index = 0; index < count; index++) {
      if (version >= 61) arrayLength(reader);
      decrypt();
      const type = reader.byte();
      const sectionId = reader.int32();
      const complexity = reader.int32();
      reader.int32();
      const raw: RawQuestion = { type, sectionId, complexity, stem: '', variants: [], answers: [] };
      if (type === 0 || type === 1) {
        const questionData = decrypt();
        const answerData = decrypt();
        const variantCount = reader.int32();
        reader.byte(); reader.byte(); reader.byte(); decrypt();
        const parts = contentSections(questionData);
        raw.stem = parts[0] ?? '';
        raw.variants = parts.slice(1, 1 + variantCount);
        raw.reference = parts[1 + variantCount];
        raw.answers = decodeString(answerData).split(/[^A-Za-z0-9]+/).filter(Boolean);
      } else if (type === 8) {
        const questionData = decrypt();
        const answerData = decrypt();
        const answerCount = reader.int32();
        reader.byte(); reader.byte(); reader.byte();
        const parts = contentSections(questionData);
        raw.stem = parts[0] ?? '';
        raw.reference = parts[1];
        raw.answers = decodeString(answerData).split(/\x02\x07|\0+/).map((v) => v.trim()).filter(Boolean).slice(-answerCount);
      } else if (type === 2 || type === 9) {
        const variants = decrypt();
        const answers = decrypt();
        const questionData = decrypt();
        reader.byte(); reader.byte();
        raw.image = decrypt();
        const parts = contentSections(questionData);
        raw.stem = parts[0] ?? (type === 9 ? 'Select the correct area in the exhibit.' : 'Complete the drag-and-drop question.');
        raw.reference = parts[1];
        const data = new DataView(answers.buffer, answers.byteOffset, answers.byteLength);
        if (type === 9 && answers.length >= 4) {
          const count = data.getInt32(0, true);
          for (let i = 0; i < count && i + 4 < answers.length; i++) if (answers[4 + i] === 1) raw.answers.push(String(i + 1));
          raw.variants = Array.from({ length: Math.max(count, 1) }, (_, i) => `Area ${i + 1}`);
        } else {
          raw.answers = ['reviewed'];
          raw.variants = ['Reviewed'];
        }
        void variants;
      } else {
        throw new ImportError(`VCE question type ${type} is not supported.`);
      }
      rawQuestions.push(raw);
    }
  };

  const examCount = reader.int32();
  for (let exam = 0; exam < examCount; exam++) {
    const examType = reader.byte(); string();
    if (examType === 0) readQuestions(reader.int32());
    else if (examType === 1) {
      const examSectionCount = reader.int32();
      for (let i = 0; i < examSectionCount; i++) {
        const sectionType = reader.byte(); reader.int32();
        if (sectionType === 0) readQuestions(reader.int32());
        else if (sectionType === 1) { string(); reader.int32(); string(); decrypt(); reader.int32(); readQuestions(reader.int32()); }
        else throw new ImportError(`VCE section type ${sectionType} is not supported.`);
      }
    } else throw new ImportError(`VCE exam type ${examType} is not supported.`);
  }

  const expectedLength = reader.int32();
  if (expectedLength !== input.length) throw new ImportError('The VCE file is incomplete or damaged.');

  const bankId = makeBankId(code, title);
  const warnings: string[] = [];
  const questions: Question[] = rawQuestions.map((raw, index) => {
    const choices: Choice[] = raw.variants.map((text, choiceIndex) => ({ id: String.fromCharCode(65 + choiceIndex), text }));
    let correct = raw.answers.map((answer) => answer.toUpperCase());
    if (raw.type <= 1) correct = correct.flatMap((answer) => answer.match(/[A-Z]/g) ?? []);
    if (raw.type === 9) correct = correct.map((answer) => String.fromCharCode(64 + Number(answer)));
    const stem = raw.stem || `Question ${index + 1}`;
    const question: Question = {
      id: makeQuestionId(bankId, stem, index), bankId, number: index + 1,
      sectionId: raw.sectionId >= 0 ? String(raw.sectionId) : undefined,
      type: raw.type === 1 ? 'multiple' : raw.type === 8 ? 'fill' : 'single',
      stem, choices: raw.type === 8 ? undefined : choices, correct,
      selectCount: raw.type === 1 ? correct.length : undefined,
      reference: raw.reference || undefined,
      exhibits: raw.image?.length ? [`data:${imageMime(raw.image)};base64,${base64(raw.image)}`] : undefined,
      difficulty: raw.complexity >= 1 && raw.complexity <= 3 ? raw.complexity as 1 | 2 | 3 : undefined,
    };
    return question;
  }).filter((question) => {
    if (!question.stem || question.correct.length === 0 || (question.type !== 'fill' && !question.choices?.length)) {
      warnings.push(`Skipped question ${question.number}: its content or answer key could not be read.`);
      return false;
    }
    return true;
  });

  if (questions.length === 0) throw new ImportError('No usable questions were found in this VCE file.');
  const passingScore = rawPassingScore > 100 ? Math.round(rawPassingScore / 10) : rawPassingScore;
  const bank: ExamBank = {
    id: bankId, code, title, description, passingScore: Math.min(100, Math.max(1, passingScore || 70)),
    timeLimitMinutes: timeLimitMinutes || 90, questionCount: questions.length, version: fileVersion,
    source: sourceName, importedAt: Date.now(), sections, questions,
  };
  return { bank, warnings };
}
