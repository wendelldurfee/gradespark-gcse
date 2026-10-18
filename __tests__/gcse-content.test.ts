import { describe, expect, it } from 'vitest';
import { GCSE_BANKS } from '../assets/banks/gcse';

describe('bundled GCSE practice library', () => {
  it('covers five UK exam boards and ten subjects', () => {
    expect(new Set(GCSE_BANKS.map((bank) => bank.vendor)).size).toBe(5);
    expect(new Set(GCSE_BANKS.map((bank) => bank.title)).size).toBe(10);
    expect(GCSE_BANKS.length).toBe(50);
    expect(GCSE_BANKS.reduce((total, bank) => total + bank.questions.length, 0)).toBeGreaterThanOrEqual(2500);
  });

  it('provides a valid answer and explanation for every question', () => {
    for (const bank of GCSE_BANKS) {
      expect(bank.questions.length).toBeGreaterThanOrEqual(50);
      for (const question of bank.questions) {
        expect(question.correct.length).toBeGreaterThan(0);
        expect(question.explanation?.length).toBeGreaterThan(20);
        const choiceIds = new Set((question.choices ?? []).map((choice) => choice.id));
        for (const answer of question.correct) expect(choiceIds.has(answer)).toBe(true);
      }
    }
  });

  it('keeps ids unique inside each bank', () => {
    for (const bank of GCSE_BANKS) {
      expect(new Set(bank.questions.map((question) => question.id)).size).toBe(bank.questions.length);
    }
  });
});
