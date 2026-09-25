import { describe, expect, it } from 'vitest';
import {
  answerLetters,
  expectedCount,
  gradeQuestion,
  hasDisputedAnswer,
  isAnswered,
  isComplete,
  lettersToIds,
  normaliseText,
  topCommunityVote,
} from '@/core/grading';
import type { Question } from '@/core/types';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    bankId: 'bank',
    type: 'single',
    stem: 'Sample question?',
    choices: [
      { id: 'A', text: 'Alpha' },
      { id: 'B', text: 'Bravo' },
      { id: 'C', text: 'Charlie' },
      { id: 'D', text: 'Delta' },
    ],
    correct: ['A'],
    ...overrides,
  };
}

describe('single choice', () => {
  it('marks the right choice correct', () => {
    const q = makeQuestion({ correct: ['C'] });
    expect(gradeQuestion(q, ['C']).correct).toBe(true);
    expect(gradeQuestion(q, ['C']).score).toBe(1);
  });

  it('marks a wrong choice incorrect and reports both sides', () => {
    const q = makeQuestion({ correct: ['C'] });
    const outcome = gradeQuestion(q, ['A']);
    expect(outcome.correct).toBe(false);
    expect(outcome.score).toBe(0);
    expect(outcome.wrongParts).toEqual(['A']);
    expect(outcome.missingParts).toEqual(['C']);
  });

  it('treats an empty response as unanswered, not wrong-by-omission', () => {
    const q = makeQuestion();
    const outcome = gradeQuestion(q, []);
    expect(outcome.correct).toBe(false);
    expect(isAnswered(q, [])).toBe(false);
  });
});

describe('multiple choice', () => {
  const q = makeQuestion({ type: 'multiple', correct: ['B', 'D'] });

  it('requires the exact set, in any order', () => {
    expect(gradeQuestion(q, ['D', 'B']).correct).toBe(true);
  });

  it('scores zero for a partial answer when partial credit is off', () => {
    expect(gradeQuestion(q, ['B']).score).toBe(0);
  });

  it('awards half marks for one of two with partial credit on', () => {
    const outcome = gradeQuestion(q, ['B'], { partialCredit: true });
    expect(outcome.score).toBe(0.5);
    expect(outcome.missingParts).toEqual(['D']);
  });

  it('cancels a right pick with a wrong pick under partial credit', () => {
    // One hit (B) minus one miss (A) = 0.
    expect(gradeQuestion(q, ['B', 'A'], { partialCredit: true }).score).toBe(0);
  });

  it('never rewards ticking every box', () => {
    const outcome = gradeQuestion(q, ['A', 'B', 'C', 'D'], { partialCredit: true });
    expect(outcome.correct).toBe(false);
    expect(outcome.score).toBe(0);
  });
});

describe('fill in the blank', () => {
  const q = makeQuestion({
    type: 'fill',
    choices: undefined,
    correct: ['show ip route', 'sh ip ro'],
  });

  it('accepts any of the listed answers, ignoring case and spacing', () => {
    expect(gradeQuestion(q, ['  SHOW   IP Route ']).correct).toBe(true);
    expect(gradeQuestion(q, ['sh ip ro']).correct).toBe(true);
  });

  it('rejects an answer that is not in the accepted list', () => {
    expect(gradeQuestion(q, ['show route']).correct).toBe(false);
  });

  it('honours strict matching when asked', () => {
    expect(gradeQuestion(q, ['SHOW IP ROUTE'], { strictFill: true }).correct).toBe(false);
  });

  it('treats whitespace-only input as unanswered', () => {
    expect(isAnswered(q, ['   '])).toBe(false);
  });

  it('normalises text predictably', () => {
    expect(normaliseText('  A   B ')).toBe('a b');
    expect(normaliseText('  A   B ', true)).toBe('A B');
  });
});

describe('ordering', () => {
  const q = makeQuestion({ type: 'ordering', correct: ['C', 'A', 'D', 'B'] });

  it('requires the exact sequence', () => {
    expect(gradeQuestion(q, ['C', 'A', 'D', 'B']).correct).toBe(true);
    expect(gradeQuestion(q, ['A', 'C', 'D', 'B']).correct).toBe(false);
  });

  it('gives credit per correctly placed item', () => {
    // C and D are in place; A and B are swapped.
    const outcome = gradeQuestion(q, ['C', 'B', 'D', 'A'], { partialCredit: true });
    expect(outcome.score).toBe(0.5);
  });
});

describe('drag and drop / matching', () => {
  const q = makeQuestion({
    type: 'dragdrop',
    targets: [
      { id: 't1', label: 'Step 1' },
      { id: 't2', label: 'Step 2' },
    ],
    correct: ['t1=A', 't2=B'],
  });

  it('ignores the order the pairs arrive in', () => {
    expect(gradeQuestion(q, ['t2=B', 't1=A']).correct).toBe(true);
  });

  it('scores each pair independently under partial credit', () => {
    const outcome = gradeQuestion(q, ['t1=A', 't2=C'], { partialCredit: true });
    expect(outcome.score).toBe(0.5);
    expect(outcome.wrongParts).toEqual(['t2=C']);
    expect(outcome.missingParts).toEqual(['t2=B']);
  });

  it('counts a pair on an unknown target as wrong', () => {
    const outcome = gradeQuestion(q, ['t1=A', 't9=B'], { partialCredit: true });
    expect(outcome.wrongParts).toContain('t9=B');
    expect(outcome.correct).toBe(false);
  });
});

describe('hotspot', () => {
  const q = makeQuestion({
    type: 'hotspot',
    choices: undefined,
    hotspots: [
      { id: 'h1', label: 'Protocol', options: ['TCP', 'UDP'], correct: 'TCP' },
      { id: 'h2', label: 'Port', options: ['80', '443'], correct: '443' },
    ],
    correct: ['h1=TCP', 'h2=443'],
  });

  it('grades every region', () => {
    expect(gradeQuestion(q, ['h1=TCP', 'h2=443']).correct).toBe(true);
    expect(gradeQuestion(q, ['h1=UDP', 'h2=443']).correct).toBe(false);
  });

  it('expects one response per region', () => {
    expect(expectedCount(q)).toBe(2);
  });
});

describe('answer letters', () => {
  const q = makeQuestion({ type: 'multiple', correct: ['B', 'D'] });

  it('renders ids as sorted display letters', () => {
    expect(answerLetters(q, ['D', 'B'])).toBe('BD');
  });

  it('round-trips back to ids', () => {
    expect(lettersToIds(q, 'BD')).toEqual(['B', 'D']);
    expect(lettersToIds(q, 'B, D')).toEqual(['B', 'D']);
  });

  it('ignores letters outside the choice range', () => {
    expect(lettersToIds(q, 'BZ')).toEqual(['B']);
  });
});

describe('community answers', () => {
  it('flags a vendor key that disagrees with the community', () => {
    const q = makeQuestion({ type: 'multiple', correct: ['A', 'B'], communityAnswer: 'BD' });
    expect(hasDisputedAnswer(q)).toBe(true);
  });

  it('does not flag agreement, whatever the letter order', () => {
    const q = makeQuestion({ type: 'multiple', correct: ['B', 'D'], communityAnswer: 'DB' });
    expect(hasDisputedAnswer(q)).toBe(false);
  });

  it('computes the leading vote share', () => {
    const q = makeQuestion({
      communityVotes: [
        { answer: 'BD', count: 75 },
        { answer: 'AC', count: 25 },
      ],
    });
    expect(topCommunityVote(q)).toEqual({ answer: 'BD', percent: 75 });
  });

  it('returns null when there are no votes', () => {
    expect(topCommunityVote(makeQuestion())).toBeNull();
  });
});

describe('isComplete', () => {
  it('is satisfied by one pick on a single-choice question', () => {
    expect(isComplete(makeQuestion(), ['A'])).toBe(true);
  });

  it('needs every required pick on a multi-select', () => {
    const q = makeQuestion({ type: 'multiple', correct: ['B', 'D'] });
    expect(isComplete(q, ['B'])).toBe(false);
    expect(isComplete(q, ['B', 'D'])).toBe(true);
  });

  it('honours a selectCount larger than the key', () => {
    const q = makeQuestion({ type: 'multiple', correct: ['B'], selectCount: 2 });
    expect(isComplete(q, ['B'])).toBe(false);
    expect(isComplete(q, ['B', 'C'])).toBe(true);
  });

  it('needs every drop zone filled', () => {
    const q = makeQuestion({
      type: 'dragdrop',
      targets: [
        { id: 't1', label: 'One' },
        { id: 't2', label: 'Two' },
      ],
      correct: ['t1=A', 't2=B'],
    });
    expect(isComplete(q, ['t1=A'])).toBe(false);
    expect(isComplete(q, ['t1=A', 't2=C'])).toBe(true);
  });

  it('is never satisfied by a blank response', () => {
    expect(isComplete(makeQuestion(), [])).toBe(false);
    expect(isComplete(makeQuestion({ type: 'fill', choices: undefined, correct: ['x'] }), ['  '])).toBe(
      false,
    );
  });
});

describe('expectedCount', () => {
  it('uses the explicit selectCount when the stem says "choose two"', () => {
    const q = makeQuestion({ type: 'multiple', correct: ['A'], selectCount: 2 });
    expect(expectedCount(q)).toBe(2);
  });

  it('falls back to the size of the answer key', () => {
    expect(expectedCount(makeQuestion({ type: 'multiple', correct: ['A', 'C'] }))).toBe(2);
  });
});
