export type PracticeSeed = { stem: string; options: string[]; answer: number | number[]; explanation: string; topic: string };

const choice = (topic: string, stem: string, options: string[], answer: number, explanation: string): PracticeSeed => ({ topic, stem, options, answer, explanation });

export function mathsQuestions(): PracticeSeed[] {
  const questions: PracticeSeed[] = [];
  for (const [percent, amount] of [[15, 240], [12, 350], [35, 80], [22, 450], [8, 625]] as const) {
    const result = percent * amount / 100;
    questions.push(choice('Number', `Calculate ${percent}% of £${amount}.`, [`£${result / 2}`, `£${result}`, `£${result + percent}`, `£${amount - result}`], 1, `${percent}% = ${percent}/100, so ${percent}/100 × ${amount} = ${result}.`));
  }
  for (const [a, b, solution] of [[4, 7, 6], [5, -3, 7], [3, 11, 9], [8, -5, 4], [6, 2, 8]] as const) {
    const total = a * solution + b;
    questions.push(choice('Algebra', `Solve ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${total}.`, [`x = ${solution - 2}`, `x = ${solution - 1}`, `x = ${solution}`, `x = ${solution + 2}`], 2, `Rearrange the equation: ${a}x = ${total - b}, then divide by ${a}, giving x = ${solution}.`));
  }
  for (const [base, height] of [[8, 7], [12, 9], [15, 6], [18, 11]] as const) {
    const area = base * height / 2;
    questions.push(choice('Geometry', `A triangle has base ${base} cm and perpendicular height ${height} cm. Find its area.`, [`${area / 2} cm²`, `${area} cm²`, `${base * height} cm²`, `${base + height} cm²`], 1, `Area of a triangle = ½ × base × height = ½ × ${base} × ${height} = ${area} cm².`));
  }
  for (const [a, b, c, d] of [[4, 9, 11, 16], [7, 8, 13, 20], [5, 12, 14, 21], [6, 10, 15, 25]] as const) {
    const mean = (a + b + c + d) / 4;
    questions.push(choice('Statistics', `Find the mean of ${a}, ${b}, ${c} and ${d}.`, [`${mean - 2}`, `${mean - 1}`, `${mean}`, `${mean + 2}`], 2, `Add the values to get ${a + b + c + d}, then divide by 4. The mean is ${mean}.`));
  }
  questions.push(
    choice('Ratio', 'A recipe uses flour and sugar in the ratio 5:2. If 350 g of flour is used, how much sugar is needed?', ['70 g', '120 g', '140 g', '175 g'], 2, '350 ÷ 5 = 70 g per part. Sugar is 2 parts, so 140 g.'),
    choice('Probability', 'A bag contains 4 red, 3 blue and 5 green counters. What is the probability of choosing blue?', ['1/3', '1/4', '3/5', '3/8'], 1, 'There are 12 counters and 3 are blue, so the probability is 3/12 = 1/4.'),
    choice('Sequences', 'Find the nth term of 5, 8, 11, 14, …', ['3n + 2', '3n + 5', '5n − 2', 'n + 4'], 0, 'The common difference is 3. Since 3(1) + 2 = 5, the nth term is 3n + 2.'),
    choice('Geometry', 'A right-angled triangle has shorter sides 6 cm and 8 cm. Find the hypotenuse.', ['7 cm', '10 cm', '12 cm', '14 cm'], 1, 'By Pythagoras, c² = 6² + 8² = 100, so c = 10 cm.'),
    choice('Graphs', 'For y = 2x − 3, what is y when x = 5?', ['5', '7', '10', '13'], 1, 'Substitute x = 5: y = 2(5) − 3 = 7.'),
    choice('Number', 'Write 6.4 × 10⁵ as an ordinary number.', ['6,400', '64,000', '640,000', '6,400,000'], 2, 'Move the decimal point five places right: 640,000.'),
  );
  return questions;
}

export const SCIENCE_EXTRA: PracticeSeed[] = [
  choice('Biology', 'What is the main function of mitochondria?', ['Protein synthesis', 'Aerobic respiration', 'Controlling entry to the cell', 'Storing genetic information'], 1, 'Mitochondria are the site of aerobic respiration, releasing usable energy.'),
  choice('Biology', 'Which enzyme breaks down starch?', ['Amylase', 'Lipase', 'Protease', 'Catalase'], 0, 'Amylase catalyses the breakdown of starch into sugars.'),
  choice('Biology', 'Why are villi effective at absorbing digested food?', ['They reduce blood flow', 'They provide a large surface area', 'They make stomach acid', 'They stop diffusion'], 1, 'Numerous villi and microvilli provide a large surface area for absorption.'),
  choice('Biology', 'Which process produces genetically identical body cells?', ['Meiosis', 'Fertilisation', 'Mitosis', 'Mutation'], 2, 'Mitosis produces two genetically identical daughter cells.'),
  choice('Biology', 'What is the role of chlorophyll?', ['Absorb light energy', 'Absorb minerals from soil', 'Release nitrogen', 'Transport glucose'], 0, 'Chlorophyll absorbs light energy used in photosynthesis.'),
  choice('Biology', 'Which change is most likely to increase biodiversity?', ['Removing hedgerows', 'Creating varied habitats', 'Using one crop species', 'Draining wetlands'], 1, 'A range of habitats provides more niches and supports more species.'),
  choice('Chemistry', 'An atom has 11 protons and 12 neutrons. What is its mass number?', ['11', '12', '23', '24'], 2, 'Mass number is protons plus neutrons: 11 + 12 = 23.'),
  choice('Chemistry', 'Which bonding occurs when electrons are transferred from a metal to a non-metal?', ['Covalent', 'Ionic', 'Metallic', 'Hydrogen'], 1, 'Electron transfer produces oppositely charged ions held by electrostatic attraction.'),
  choice('Chemistry', 'What does a catalyst do?', ['Raises activation energy', 'Lowers activation energy', 'Changes the products', 'Gets used up'], 1, 'A catalyst provides an alternative reaction pathway with lower activation energy.'),
  choice('Chemistry', 'Which gas relights a glowing splint?', ['Hydrogen', 'Carbon dioxide', 'Oxygen', 'Chlorine'], 2, 'Oxygen supports combustion and relights a glowing splint.'),
  choice('Chemistry', 'During electrolysis of a molten ionic compound, where do positive ions move?', ['Anode', 'Cathode', 'Salt bridge', 'Electrolyte surface'], 1, 'Positive ions are attracted to the negatively charged cathode.'),
  choice('Chemistry', 'Calculate the relative formula mass of CO₂. Ar: C = 12, O = 16.', ['28', '32', '44', '48'], 2, 'Mr = 12 + (2 × 16) = 44.'),
  choice('Physics', 'A car travels 150 m in 10 s. What is its mean speed?', ['10 m/s', '15 m/s', '20 m/s', '1500 m/s'], 1, 'Speed = distance ÷ time = 150 ÷ 10 = 15 m/s.'),
  choice('Physics', 'A 12 V supply drives a current of 3 A. What is the resistance?', ['0.25 Ω', '4 Ω', '9 Ω', '36 Ω'], 1, 'Using V = IR, R = V/I = 12/3 = 4 Ω.'),
  choice('Physics', 'What happens to energy in a closed system?', ['It is destroyed', 'It is created', 'The total remains constant', 'It becomes mass only'], 2, 'Energy is conserved: it may transfer between stores but the total remains constant.'),
  choice('Physics', 'Which wave can travel through a vacuum?', ['Sound', 'Water', 'Electromagnetic', 'Seismic S-wave'], 2, 'Electromagnetic waves do not require particles and can travel through a vacuum.'),
  choice('Physics', 'A force of 200 N acts over 0.5 m². What pressure is produced?', ['100 Pa', '200 Pa', '400 Pa', '800 Pa'], 2, 'Pressure = force ÷ area = 200 ÷ 0.5 = 400 Pa.'),
  choice('Physics', 'Why does a transformer require alternating current?', ['To make permanent charge', 'To create a changing magnetic field', 'To stop induction', 'To reduce all resistance'], 1, 'A changing current creates the changing magnetic field needed to induce a voltage.'),
];

export const ENGLISH_EXTRA: PracticeSeed[] = [
  choice('Reading', 'Which approach best compares two writers’ viewpoints?', ['Discuss each text without links', 'Compare ideas and methods using evidence from both', 'Count the paragraphs', 'Copy both conclusions'], 1, 'A comparison should connect similarities or differences in viewpoints and analyse supporting evidence from both texts.'),
  choice('Language', 'What is the effect of a rhetorical question in an argument?', ['It always provides statistics', 'It prompts the audience to consider the writer’s point', 'It changes past tense to present', 'It removes the writer’s viewpoint'], 1, 'A rhetorical question engages the audience and directs thought without requiring an answer.'),
  choice('Structure', 'What can a cyclical ending create?', ['A return to the opening idea or image', 'A new alphabet', 'Only a faster pace', 'A change of font'], 0, 'Returning to an opening detail can create closure or show what has changed.'),
  choice('Writing', 'Which device most clearly establishes cohesion across paragraphs?', ['Random sentence lengths', 'Discourse markers and linked ideas', 'Repeated spelling errors', 'Removing topic sentences'], 1, 'Logical links and discourse markers guide the reader through a developed argument.'),
  choice('Language', 'Which phrase uses personification?', ['The wind whispered through the gate', 'The gate was wooden', 'The wind was cold', 'The gate measured two metres'], 0, '“Whispered” gives the wind a human action.'),
  choice('Evaluation', 'Which comment is analytical rather than descriptive?', ['The writer uses a short sentence.', 'The abrupt short sentence interrupts the flowing description, mirroring the character’s shock.', 'There are twelve lines.', 'The extract has an ending.'], 1, 'It explains how the method shapes meaning and reader response.'),
  choice('Writing', 'Which punctuation best introduces a list after a complete clause?', ['Colon', 'Apostrophe', 'Hyphen only', 'Question mark'], 0, 'A colon can introduce a list when it follows a complete clause.'),
  choice('Reading', 'What does “implicit information” mean?', ['Information stated directly', 'Information suggested rather than directly stated', 'A spelling rule', 'The title only'], 1, 'Implicit meaning is inferred from clues in the text.'),
];

export const HUMANITIES_EXTRA: Record<string, PracticeSeed[]> = {
  History: [
    choice('Causation', 'Which makes the strongest causal argument?', ['Listing events only', 'Explaining how factors interacted and judging importance', 'Giving one unsupported opinion', 'Describing a portrait'], 1, 'Strong causation answers explain links between factors and reach a supported judgement.'),
    choice('Change', 'To assess change over time, what should a conclusion consider?', ['Only the final year', 'Extent, pace and areas of continuity', 'The longest quotation', 'Only one individual'], 1, 'Change is best judged by its scale and speed alongside what remained continuous.'),
    choice('Source skills', 'A government poster produced during wartime is especially useful for studying what?', ['Exact private thoughts of every citizen', 'Official messages and methods of persuasion', 'Weather records only', 'Events centuries later'], 1, 'Its provenance makes it valuable evidence of official messaging and intended persuasion.'),
    choice('Interpretations', 'How should two historical interpretations be compared?', ['Decide by length', 'Compare their claims and supporting evidence', 'Assume the newer one is correct', 'Ignore their context'], 1, 'Comparison should identify different claims and assess how evidence supports them.'),
    choice('Significance', 'Which criterion helps judge historical significance?', ['How far an event affected people over time', 'Whether its name is short', 'Its position in a textbook', 'Whether it happened in summer'], 0, 'Impact, duration, reach and how representative an event was are useful significance criteria.'),
  ],
  Geography: [
    choice('Maps', 'On a 1:50,000 map, 2 cm represents what ground distance?', ['100 m', '500 m', '1 km', '10 km'], 2, '2 cm × 50,000 = 100,000 cm, which is 1 km.'),
    choice('Weather', 'What usually happens to air as it rises?', ['It warms and sinks', 'It cools and may condense', 'It becomes solid', 'It loses all water instantly'], 1, 'Rising air expands and cools; water vapour may condense to form clouds.'),
    choice('Coasts', 'Which process moves beach material along a coast at an angle?', ['Longshore drift', 'Hydraulic action', 'Freeze-thaw weathering', 'Mass extinction'], 0, 'Angled swash and perpendicular backwash transport sediment alongshore.'),
    choice('Development', 'Why is a composite development indicator useful?', ['It uses several measures', 'It measures rainfall only', 'It guarantees equality', 'It ignores health'], 0, 'Combining measures such as income, education and life expectancy gives a broader view.'),
    choice('Fieldwork', 'What improves the reliability of fieldwork data?', ['Taking one reading', 'Repeating measurements and calculating a mean', 'Changing method each time', 'Removing unexpected values without reason'], 1, 'Repeated measurements reduce the influence of random error.'),
  ],
  'Computer Science': [
    choice('Algorithms', 'What is decomposition?', ['Breaking a problem into smaller parts', 'Encrypting a network', 'Deleting variables', 'Joining every file'], 0, 'Decomposition makes a complex problem manageable by splitting it into sub-problems.'),
    choice('Programming', 'What does iteration mean?', ['Selecting one branch', 'Repeating instructions', 'Naming a constant', 'Translating binary'], 1, 'Iteration repeats a block of instructions using a loop.'),
    choice('Data', 'What is the denary value of binary 10110?', ['18', '20', '22', '24'], 2, '10110 = 16 + 4 + 2 = 22.'),
    choice('Networks', 'Which protocol securely transfers web pages?', ['HTTP', 'HTTPS', 'FTP only', 'SMTP'], 1, 'HTTPS uses encryption to protect web traffic in transit.'),
    choice('Databases', 'What uniquely identifies each record in a relational table?', ['Foreign colour', 'Primary key', 'File extension', 'Loop counter'], 1, 'A primary key contains a unique value for every record.'),
  ],
};

export const NEW_SUBJECTS: Record<string, PracticeSeed[]> = {
  Biology: SCIENCE_EXTRA.filter((q) => q.topic === 'Biology'),
  Chemistry: SCIENCE_EXTRA.filter((q) => q.topic === 'Chemistry'),
  Physics: SCIENCE_EXTRA.filter((q) => q.topic === 'Physics'),
  'English Literature': [
    choice('Analysis', 'A strong literature thesis should do what?', ['Retell the plot', 'Present a clear argument about the question', 'List every character', 'Avoid the writer’s methods'], 1, 'A thesis establishes the central interpretation that the essay will prove.'),
    choice('Poetry', 'What does enjambment describe?', ['A line continuing without terminal punctuation', 'A six-line stanza', 'A repeated consonant', 'A poem with no title'], 0, 'Enjambment carries meaning over a line break and can affect pace or emphasis.'),
    choice('Drama', 'Why are stage directions useful evidence?', ['They show performance and physical action', 'They are always spoken aloud', 'They replace context', 'They provide marks'], 0, 'Stage directions guide movement, expression and staging, which shape audience response.'),
    choice('Context', 'How should context be used in a literature essay?', ['As a separate fact list', 'To illuminate the text and argument', 'Instead of quotations', 'To guess the writer’s private life'], 1, 'Relevant context should support interpretation rather than sit separately from textual analysis.'),
    choice('Comparison', 'A poetry comparison should focus on what?', ['Only poem length', 'Connections between ideas and methods', 'Alphabetical order', 'Which poem is older'], 1, 'Effective comparisons connect meanings, attitudes and the methods used to create them.'),
    choice('Language', 'What is a semantic field?', ['A group of related words', 'One punctuation mark', 'A type of rhyme only', 'The book cover'], 0, 'A semantic field is a pattern of vocabulary connected by meaning.'),
  ],
};
