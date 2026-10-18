import type { ExamBank, Question } from '../../src/core/types';
import { expandToMinimum } from './curriculumExpansion';
import { ENGLISH_EXTRA, HUMANITIES_EXTRA, NEW_SUBJECTS, SCIENCE_EXTRA, mathsQuestions, type PracticeSeed } from './expanded';

type Seed = PracticeSeed;

const SUBJECTS: Record<string, Seed[]> = {
  Mathematics: [
    { topic: 'Number', stem: 'Write 0.375 as a fraction in its simplest form.', options: ['3/5', '3/8', '5/8', '375/100'], answer: 1, explanation: '0.375 = 375/1000. Divide numerator and denominator by 125 to get 3/8.' },
    { topic: 'Algebra', stem: 'Solve 3(2x − 1) = 21.', options: ['x = 3', 'x = 4', 'x = 6', 'x = 12'], answer: 1, explanation: 'Expand to 6x − 3 = 21, add 3, then divide 24 by 6. Therefore x = 4.' },
    { topic: 'Geometry', stem: 'The exterior angle of a regular polygon is 24°. How many sides does it have?', options: ['12', '15', '18', '24'], answer: 1, explanation: 'Exterior angles total 360°, so the number of sides is 360 ÷ 24 = 15.' },
    { topic: 'Ratio', stem: 'Red and blue counters are in the ratio 3:5. There are 40 counters. How many are red?', options: ['8', '15', '20', '24'], answer: 1, explanation: 'There are 8 ratio parts. Each part is 5, so red counters = 3 × 5 = 15.' },
    { topic: 'Probability', stem: 'A fair six-sided die is rolled. What is the probability of rolling a prime number?', options: ['1/6', '1/3', '1/2', '2/3'], answer: 2, explanation: 'The prime outcomes are 2, 3 and 5: three of six outcomes, giving 1/2.' },
    { topic: 'Statistics', stem: 'The mean of five numbers is 12. Four numbers total 41. What is the fifth number?', options: ['12', '19', '48', '60'], answer: 1, explanation: 'The total is 5 × 12 = 60. The missing number is 60 − 41 = 19.' },
  ],
  'English Language': [
    { topic: 'Reading', stem: 'A writer describes a street as “the city’s pulsing artery”. Which technique is used?', options: ['Simile', 'Metaphor', 'Alliteration', 'Onomatopoeia'], answer: 1, explanation: 'The street is directly described as an artery, without “like” or “as”, so this is a metaphor.' },
    { topic: 'Reading', stem: 'Which quotation best supports an inference that a character is nervous?', options: ['She entered the room.', 'Her fingers worried the frayed edge of her sleeve.', 'The clock showed six.', 'She wore a blue coat.'], answer: 1, explanation: 'The restless physical action implies anxiety and gives specific evidence for the inference.' },
    { topic: 'Structure', stem: 'Why might a writer shift from a wide landscape description to one small object?', options: ['To change tense', 'To narrow the reader’s focus', 'To remove imagery', 'To introduce dialogue punctuation'], answer: 1, explanation: 'A shift from panoramic detail to a close-up directs attention and can make the object significant.' },
    { topic: 'Writing', stem: 'Which opening is most suitable for a formal letter to a council?', options: ['Hey, sort this out!', 'Dear Sir or Madam, I am writing to raise…', 'Once upon a time…', 'You lot need to listen.'], answer: 1, explanation: 'It uses an appropriate salutation, purpose and formal register.' },
    { topic: 'Language', stem: 'Which sentence uses a semicolon correctly?', options: ['The rain stopped; the match resumed.', 'The rain; stopped the match.', 'The; rain stopped.', 'The rain stopped; because it was late.'], answer: 0, explanation: 'A semicolon can join two closely related independent clauses.' },
    { topic: 'Evaluation', stem: 'A strong evaluation response should primarily do what?', options: ['Retell the whole extract', 'State an opinion and support it with analysed evidence', 'List techniques only', 'Discuss the writer’s biography'], answer: 1, explanation: 'Evaluation needs a clear judgement supported by well-chosen evidence and analysis of effects.' },
  ],
  'Combined Science': [
    { topic: 'Biology', stem: 'Which structure controls movement of substances into and out of a cell?', options: ['Nucleus', 'Cell membrane', 'Cytoplasm', 'Mitochondrion'], answer: 1, explanation: 'The cell membrane is selectively permeable and controls exchange with the surroundings.' },
    { topic: 'Biology', stem: 'Which two factors can increase the rate of photosynthesis until another factor becomes limiting?', options: ['Light intensity and carbon dioxide concentration', 'Oxygen and urea', 'Humidity and protein', 'Nitrogen and sound'], answer: 0, explanation: 'Light intensity, carbon dioxide concentration and temperature are the main limiting factors.' },
    { topic: 'Chemistry', stem: 'What is the pH of a neutral solution at room temperature?', options: ['0', '5', '7', '14'], answer: 2, explanation: 'A neutral solution has equal hydrogen and hydroxide ion concentrations and a pH of 7.' },
    { topic: 'Chemistry', stem: 'Why does increasing temperature usually increase reaction rate?', options: ['Particles become larger', 'Particles collide more often and with more energy', 'Atoms disappear', 'The catalyst is used up'], answer: 1, explanation: 'Higher kinetic energy produces more frequent collisions and a greater fraction exceed activation energy.' },
    { topic: 'Physics', stem: 'A device transfers 600 J in 20 s. What is its power?', options: ['12 W', '30 W', '120 W', '12,000 W'], answer: 1, explanation: 'Power = energy ÷ time = 600 ÷ 20 = 30 W.' },
    { topic: 'Physics', stem: 'Which change increases the resistance of a metal wire?', options: ['Making it shorter', 'Making it thicker', 'Cooling it', 'Making it longer'], answer: 3, explanation: 'A longer wire gives charge carriers a longer path and therefore has greater resistance.' },
  ],
  History: [
    { topic: 'Source skills', stem: 'When judging a historical source’s usefulness, which combination matters most?', options: ['Only its length', 'Content, provenance and relevant own knowledge', 'Only whether it agrees with you', 'The colour of the paper'], answer: 1, explanation: 'Usefulness depends on what the source says, who produced it and why, checked against contextual knowledge.' },
    { topic: 'Interpretations', stem: 'Why can historians produce different interpretations of the same event?', options: ['Facts never exist', 'They may select and weigh evidence differently', 'Only one has read any sources', 'Dates change over time'], answer: 1, explanation: 'Historians can reach different supported judgements because they ask different questions and weigh evidence differently.' },
    { topic: 'Medicine', stem: 'Which development most directly enabled doctors to observe microorganisms?', options: ['The printing press', 'Improved microscopes', 'The steam engine', 'The telegraph'], answer: 1, explanation: 'Improved microscopes allowed scientists such as Pasteur and Koch to investigate microorganisms.' },
    { topic: 'Germany', stem: 'Which was a consequence of hyperinflation in Germany in 1923?', options: ['Savings lost value', 'Prices remained fixed', 'Unemployment disappeared permanently', 'The currency became stronger'], answer: 0, explanation: 'Rapid price rises destroyed the real value of savings and wages struggled to keep pace.' },
    { topic: 'Conflict', stem: 'What is a “turning point” in a historical argument?', options: ['Any date', 'A development that significantly changes direction or outcome', 'A source quotation', 'A minor detail'], answer: 1, explanation: 'A turning point marks substantial change and should be assessed against what came before and after.' },
  ],
  Geography: [
    { topic: 'Physical landscapes', stem: 'Which process is the wearing away of a river’s bed and banks by transported material?', options: ['Attrition', 'Abrasion', 'Deposition', 'Evaporation'], answer: 1, explanation: 'Abrasion occurs when the river load scrapes and wears away the channel.' },
    { topic: 'Hazards', stem: 'Why are earthquakes common at destructive plate margins?', options: ['Plates never move', 'One plate is forced beneath another and pressure is released', 'Rainfall shakes the crust', 'Rivers erode the mantle'], answer: 1, explanation: 'Subduction and friction cause stress to build; sudden release produces seismic waves.' },
    { topic: 'Urban issues', stem: 'Which is a likely challenge of rapid urbanisation?', options: ['Reduced housing demand', 'Pressure on housing and services', 'No traffic congestion', 'Lower waste production'], answer: 1, explanation: 'Population growth can outpace housing, sanitation, transport and healthcare provision.' },
    { topic: 'Fieldwork', stem: 'Why is systematic sampling useful along a transect?', options: ['It removes all error', 'It collects data at regular intervals', 'It guarantees a preferred result', 'It avoids recording locations'], answer: 1, explanation: 'Regular intervals provide consistent spatial coverage and make the method repeatable.' },
    { topic: 'Resources', stem: 'Which energy source is renewable?', options: ['Coal', 'Natural gas', 'Wind', 'Oil'], answer: 2, explanation: 'Wind is continually replenished, unlike finite fossil fuels.' },
  ],
  'Computer Science': [
    { topic: 'Algorithms', stem: 'Which search algorithm repeatedly halves an ordered list?', options: ['Linear search', 'Binary search', 'Bubble sort', 'Merge sort'], answer: 1, explanation: 'Binary search compares the middle item and discards half of the remaining ordered list each step.' },
    { topic: 'Programming', stem: 'What does a Boolean variable store?', options: ['A whole number', 'True or false', 'A character only', 'A sound sample'], answer: 1, explanation: 'A Boolean has two logical states: true and false.' },
    { topic: 'Networks', stem: 'What is the main role of DNS?', options: ['Encrypt every file', 'Translate domain names to IP addresses', 'Provide electrical power', 'Compile programs'], answer: 1, explanation: 'DNS resolves human-readable domain names to the IP addresses used for routing.' },
    { topic: 'Data', stem: 'How many bits are in one byte?', options: ['4', '8', '16', '1024'], answer: 1, explanation: 'A byte consists of 8 bits.' },
    { topic: 'Cyber security', stem: 'Which attack tricks a person into revealing credentials through a fake message or site?', options: ['Phishing', 'Defragmentation', 'Compression', 'Iteration'], answer: 0, explanation: 'Phishing uses fraudulent communication to obtain credentials or other sensitive information.' },
  ],
};

const SUBJECT_POOLS: Record<string, Seed[]> = {
  ...SUBJECTS,
  Mathematics: [...SUBJECTS.Mathematics, ...mathsQuestions()],
  'English Language': [...SUBJECTS['English Language'], ...ENGLISH_EXTRA],
  'Combined Science': [...SUBJECTS['Combined Science'], ...SCIENCE_EXTRA],
  History: [...SUBJECTS.History, ...HUMANITIES_EXTRA.History],
  Geography: [...SUBJECTS.Geography, ...HUMANITIES_EXTRA.Geography],
  'Computer Science': [...SUBJECTS['Computer Science'], ...HUMANITIES_EXTRA['Computer Science']],
  ...NEW_SUBJECTS,
};

const ALL_SUBJECTS: Record<string, Seed[]> = Object.fromEntries(
  Object.entries(SUBJECT_POOLS).map(([subject, seeds]) => [subject, expandToMinimum(subject, seeds)]),
);

const BOARDS = ['AQA', 'Pearson Edexcel', 'OCR', 'WJEC Eduqas', 'CCEA'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function makeBank(subject: string, board: string, seeds: Seed[]): ExamBank {
  const id = `gcse-${board.toLowerCase().replace(/\W+/g, '-')}-${subject.toLowerCase().replace(/\W+/g, '-')}`;
  const topics = [...new Set(seeds.map((seed) => seed.topic))];
  const questions: Question[] = seeds.map((seed, index) => {
    const answers = Array.isArray(seed.answer) ? seed.answer : [seed.answer];
    return {
      id: `${id}-q${index + 1}`, bankId: id, sectionId: seed.topic.toLowerCase().replace(/\W+/g, '-'),
      number: index + 1, type: answers.length > 1 ? 'multiple' : 'single', stem: seed.stem,
      choices: seed.options.map((text, i) => ({ id: LETTERS[i], text })),
      correct: answers.map((i) => LETTERS[i]), explanation: seed.explanation,
      tags: ['GCSE', board, subject, seed.topic], difficulty: index < 2 ? 1 : index < 4 ? 2 : 3,
    };
  });
  return {
    id, code: `GCSE • ${board}`, title: subject, vendor: board,
    description: `Original ${board}-style GCSE ${subject} practice with worked answers.`,
    passingScore: 60, timeLimitMinutes: Math.max(20, questions.length * 2), questionCount: questions.length,
    version: '2026.3', source: 'GradeSpark original practice', importedAt: 0,
    sections: topics.map((topic) => ({ id: topic.toLowerCase().replace(/\W+/g, '-'), title: topic })), questions,
  };
}

export const GCSE_BANKS: ExamBank[] = BOARDS.flatMap((board) =>
  Object.entries(ALL_SUBJECTS).map(([subject, seeds]) => makeBank(subject, board, seeds)),
);
