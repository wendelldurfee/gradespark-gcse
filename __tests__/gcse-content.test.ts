import { describe, expect, it } from 'vitest';
import { GCSE_BANKS } from '../assets/banks/gcse';
import { RESEARCHED_ADDITIONS, RESEARCH_SOURCES } from '../assets/banks/researchedExpansion';

const normalise = (stem: string) => stem
  .replace(/^(Application check: |A student is reviewing this topic\. Select the accurate answer: |Misconception check — which option correctly answers this question\? )/, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

describe('bundled GCSE practice library', () => {
  it('covers five boards, ten subjects and at least 75 answered questions per bank', () => {
    expect(new Set(GCSE_BANKS.map(b => b.vendor)).size).toBe(5);
    expect(new Set(GCSE_BANKS.map(b => b.title)).size).toBe(10);
    expect(GCSE_BANKS).toHaveLength(50);
    expect(GCSE_BANKS.reduce((n, b) => n + b.questions.length, 0)).toBeGreaterThanOrEqual(3750);
    for (const bank of GCSE_BANKS) expect(bank.questions.length, `${bank.vendor} ${bank.title}`).toBeGreaterThanOrEqual(75);
  });

  it('provides valid answer keys and explanations', () => {
    for (const bank of GCSE_BANKS) {
      for (const question of bank.questions) {
        expect(question.correct.length).toBeGreaterThan(0);
        expect(question.explanation?.length).toBeGreaterThan(20);
        const choices = new Set(question.choices?.map(c => c.id));
        for (const answer of question.correct) expect(choices.has(answer)).toBe(true);
        expect(bank.sections?.some(s => s.id === question.sectionId)).toBe(true);
      }
    }
  });

  it('keeps bank and question IDs unique and sequential for saved progress', () => {
    expect(new Set(GCSE_BANKS.map(b => b.id)).size).toBe(GCSE_BANKS.length);
    for (const bank of GCSE_BANKS) {
      expect(new Set(bank.questions.map(q => q.id)).size).toBe(bank.questions.length);
      bank.questions.forEach((q, i) => expect(q.id).toBe(`${bank.id}-q${i + 1}`));
    }
  });

  it('appends 25 distinct sourced questions without repackaging an existing stem', () => {
    for (const bank of GCSE_BANKS) {
      const previous = new Set(bank.questions.slice(0, 50).map(q => normalise(q.stem)));
      const added = bank.questions.slice(50);
      expect(added).toHaveLength(25);
      expect(new Set(added.map(q => normalise(q.stem))).size).toBe(25);
      expect(new Set(added.map(q => q.sectionId)).size).toBeGreaterThanOrEqual(3);
      for (const question of added) {
        expect(previous.has(normalise(question.stem)), question.stem).toBe(false);
        expect(question.reference).toBe(RESEARCH_SOURCES[bank.title]);
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices!.map(c => c.text)).size).toBe(4);
        expect(question.correct).toHaveLength(1);
      }
    }
  });

  it('balances answer positions in the new subject pools', () => {
    for (const additions of Object.values(RESEARCHED_ADDITIONS)) {
      expect(additions).toHaveLength(25);
      for (let position = 0; position < 4; position++) {
        const count = additions.filter(q => q.answer === position).length;
        expect(count).toBeGreaterThanOrEqual(6);
        expect(count).toBeLessThanOrEqual(7);
      }
    }
  });
});
