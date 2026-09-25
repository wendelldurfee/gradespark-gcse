import { describe, expect, it, vi } from 'vitest';
import { validateTextFile, readPickedText } from '@/core/import/file';
import { importBank } from '@/core/import';

const json = JSON.stringify({ code: 'TEST', questions: [{ stem: 'Choose alpha.', options: ['Alpha', 'Beta'], answer: 'A' }] });

describe('picked file validation', () => {
  it.each(['bank.json', 'bank.txt', 'bank.vce'])('imports supported text content from %s', (fileName) => {
    const raw = validateTextFile(json, fileName);
    expect(importBank(raw, { fileName }).bank.questions).toHaveLength(1);
  });
  it('accepts Unicode, tabs, and line endings in valid text', () => {
    expect(validateTextFile('Café 日本語\tA\r\nB')).toBe('Café 日本語\tA\r\nB');
  });
  it('strips UTF-8 BOMs before JSON parsing', () => {
    expect(importBank(validateTextFile('\uFEFF' + json)).bank.questions).toHaveLength(1);
  });
  it('rejects an empty file clearly', () => {
    expect(() => validateTextFile('')).toThrow(/empty/);
  });
  it('rejects binary files rather than importing garbage', () => {
    expect(() => validateTextFile('abc\0def', 'file.bin')).toThrow(/not supported text/);
  });
  it('gives an honest conversion message for binary VCE files', () => {
    expect(() => validateTextFile('\uFFFD\0\x01\x02', 'exam.VCE')).toThrow(/Direct binary .vce decoding is not available/);
  });
});

it('reads browser-picked files without invoking the native filesystem', async () => {
  const nativeReader = vi.fn();
  const text = await readPickedText({ name: 'test.json', uri: 'blob:local', file: { text: async () => json } }, nativeReader);
  expect(importBank(text).bank.questions).toHaveLength(1);
  expect(nativeReader).not.toHaveBeenCalled();
});

it('reads native-picked files through the cached URI', async () => {
  const nativeReader = vi.fn().mockResolvedValue(json);
  const text = await readPickedText({ name: 'test.json', uri: 'file:///cache/test.json' }, nativeReader);
  expect(nativeReader).toHaveBeenCalledWith('file:///cache/test.json');
  expect(importBank(text).bank.questions).toHaveLength(1);
});
