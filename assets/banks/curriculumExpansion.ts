import type { PracticeSeed } from './expanded';

const q = (topic: string, stem: string, options: string[], answer: number, explanation: string): PracticeSeed => ({ topic, stem, options, answer, explanation });

export const CURRICULUM_EXTRA: Record<string, PracticeSeed[]> = {
  Mathematics: [
    q('Number', 'Evaluate 3⁴.', ['12', '27', '64', '81'], 3, '3⁴ means 3 × 3 × 3 × 3, which equals 81.'),
    q('Algebra', 'Factorise x² + 7x + 12.', ['(x + 3)(x + 4)', '(x + 2)(x + 6)', '(x − 3)(x − 4)', 'x(x + 7) + 12'], 0, 'The two numbers that multiply to 12 and add to 7 are 3 and 4.'),
    q('Geometry', 'Find the circumference of a circle with radius 5 cm in terms of π.', ['5π cm', '10π cm', '20π cm', '25π cm'], 1, 'Circumference = 2πr, so 2 × π × 5 = 10π cm.'),
    q('Ratio', 'Divide £84 in the ratio 3:4.', ['£21 and £63', '£28 and £56', '£36 and £48', '£42 and £42'], 2, 'There are 7 parts, each worth £12. The shares are £36 and £48.'),
    q('Probability', 'Two fair coins are tossed. What is the probability of two heads?', ['1/2', '1/3', '1/4', '3/4'], 2, 'The equally likely outcomes are HH, HT, TH and TT; one of four is two heads.'),
    q('Statistics', 'What is the median of 3, 7, 8, 11, 14, 18?', ['8', '9', '9.5', '11'], 2, 'There are six values, so average the middle two: (8 + 11) ÷ 2 = 9.5.'),
    q('Graphs', 'What is the gradient of the line through (2, 3) and (6, 11)?', ['1/2', '2', '4', '8'], 1, 'Gradient = change in y ÷ change in x = (11 − 3) ÷ (6 − 2) = 2.'),
    q('Measures', 'Convert 2.75 km to metres.', ['27.5 m', '275 m', '2,750 m', '27,500 m'], 2, 'One kilometre is 1,000 metres, so 2.75 × 1,000 = 2,750 m.'),
    q('Geometry', 'A cuboid measures 3 cm by 4 cm by 8 cm. Find its volume.', ['15 cm³', '32 cm³', '64 cm³', '96 cm³'], 3, 'Volume = length × width × height = 3 × 4 × 8 = 96 cm³.'),
    q('Algebra', 'Make x the subject of y = 5x − 2.', ['x = (y + 2)/5', 'x = (y − 2)/5', 'x = 5y + 2', 'x = y/5 − 2'], 0, 'Add 2 to both sides and divide by 5, giving x = (y + 2)/5.'),
  ],
  'English Language': [
    q('Reading', 'Which detail most clearly creates an uneasy atmosphere?', ['Sunlight warmed the quiet garden', 'A loose shutter tapped although the air was still', 'The café opened at nine', 'Birds nested in the hedge'], 1, 'The unexplained tapping in still air suggests something unsettling may be present.'),
    q('Language', 'What is the effect of the sibilance in “snakes slid silently”?', ['It creates a soft hissing sound', 'It gives an exact statistic', 'It establishes chronological order', 'It removes imagery'], 0, 'Repeated s sounds imitate hissing and can create a secretive or threatening tone.'),
    q('Structure', 'Why might a writer withhold a character’s identity until the final paragraph?', ['To create suspense and a later revelation', 'To correct punctuation', 'To make every sentence shorter', 'To change the genre automatically'], 0, 'Delayed identification makes readers question who the character is and gives the reveal impact.'),
    q('Writing', 'Which sentence best uses varied syntax for emphasis?', ['The crowd waited. Silent. Expectant.', 'The crowd waited and the crowd waited.', 'Crowd the waited.', 'The crowd, because, waited.'], 0, 'The fragments interrupt the complete sentence and focus attention on the tense mood.'),
    q('Reading', 'Which response best synthesises information from two sources?', ['Source A is old. Source B is long.', 'Both describe travel as difficult, but only Source B presents it as worthwhile.', 'I prefer Source A.', 'The sources use words.'], 1, 'Synthesis connects a shared idea and a meaningful difference across both sources.'),
    q('Writing', 'Which technique most strengthens a persuasive conclusion?', ['Introduce an unrelated topic', 'Restate the central case with a clear call to action', 'Repeat the opening word for word', 'Add unsupported figures'], 1, 'A concise restatement and call to action leave the audience with a clear purpose.'),
    q('Language', 'Which term describes deliberate exaggeration for effect?', ['Hyperbole', 'Caesura', 'Pronoun', 'Euphemism'], 0, 'Hyperbole is deliberate exaggeration used to emphasise an idea or feeling.'),
    q('Evaluation', 'What makes textual evidence well selected?', ['It is always the longest quotation', 'It directly supports the judgement being made', 'It appears in the first line', 'It contains difficult spelling'], 1, 'Relevant evidence should directly substantiate the evaluation and allow close analysis.'),
    q('Writing', 'Which sentence maintains a formal register?', ['Kids should totally get more breaks.', 'Pupils would benefit from a carefully planned extension to break time.', 'More breaks are, like, obviously better.', 'Give us breaks now!'], 1, 'The precise vocabulary and measured phrasing suit a formal audience.'),
    q('Reading', 'What is the best evidence of a shift in tone?', ['A change from playful imagery to bleak, abrupt sentences', 'The text has three paragraphs', 'A noun appears twice', 'The page number changes'], 0, 'Contrasting imagery and sentence style can mark a clear movement from humour to seriousness.'),
  ],
  Biology: [
    q('Cells', 'Which structure is present in plant cells but absent from animal cells?', ['Cell membrane', 'Cytoplasm', 'Cellulose cell wall', 'Ribosome'], 2, 'Plant cells have a cellulose cell wall that supports and strengthens the cell.'),
    q('Transport', 'What is osmosis?', ['Movement of water through a partially permeable membrane', 'Movement of any solid against a gradient', 'Breakdown of glucose with oxygen', 'Production of antibodies'], 0, 'Osmosis is the net movement of water from a dilute to a more concentrated solution through a partially permeable membrane.'),
    q('Organisation', 'Which blood vessel carries blood away from the heart?', ['Vein', 'Artery', 'Capillary', 'Valve'], 1, 'Arteries carry blood away from the heart and have thick muscular walls.'),
    q('Disease', 'Why do antibiotics not cure viral infections?', ['Viruses are too large', 'Viruses reproduce inside cells and lack the bacterial targets', 'Antibiotics contain viruses', 'All viruses are beneficial'], 1, 'Antibiotics target bacterial structures or processes that viruses do not possess.'),
    q('Bioenergetics', 'Which word equation represents aerobic respiration?', ['glucose + oxygen → carbon dioxide + water', 'carbon dioxide + water → glucose + oxygen', 'glucose → lactic acid + oxygen', 'oxygen + water → glucose'], 0, 'Aerobic respiration transfers energy using glucose and oxygen, producing carbon dioxide and water.'),
    q('Homeostasis', 'Which hormone lowers blood glucose concentration?', ['Adrenaline', 'Insulin', 'Thyroxine', 'Oestrogen'], 1, 'Insulin causes body cells to take up glucose and the liver to store glucose as glycogen.'),
    q('Inheritance', 'What is an allele?', ['A version of a gene', 'A complete chromosome set', 'A type of protein only', 'An environmental factor'], 0, 'An allele is one of the alternative forms of a gene.'),
    q('Ecology', 'What does a quadrat help a biologist estimate?', ['Abundance or distribution in a sample area', 'The age of a fossil exactly', 'Blood glucose level', 'Mutation rate in one cell'], 0, 'Quadrats sample organisms in known areas so abundance or distribution can be estimated.'),
    q('Evolution', 'What drives natural selection?', ['Inherited variation and differential survival', 'All organisms changing because they need to', 'Identical reproduction only', 'Removal of every mutation'], 0, 'Individuals with advantageous inherited variation are more likely to survive and reproduce.'),
    q('Required practicals', 'Why is iodine used when testing a leaf for starch?', ['It turns blue-black when starch is present', 'It removes chlorophyll', 'It supplies carbon dioxide', 'It measures temperature'], 0, 'Iodine solution changes from orange-brown to blue-black in the presence of starch.'),
  ],
  Chemistry: [
    q('Atomic structure', 'What is the charge of an electron?', ['+1', '0', '−1', '−2'], 2, 'An electron has a relative charge of −1.'),
    q('Periodic table', 'Why do elements in the same group have similar chemical properties?', ['They have the same number of shells', 'They have the same number of outer-shell electrons', 'They have identical mass numbers', 'They are all metals'], 1, 'Chemical reactions depend strongly on the number of electrons in the outer shell.'),
    q('Bonding', 'Why can graphite conduct electricity?', ['It contains mobile delocalised electrons', 'Its molecules are ionic', 'It melts at room temperature', 'Every carbon has five bonds'], 0, 'Each carbon contributes a delocalised electron that can move through the layered structure.'),
    q('Quantitative chemistry', 'How many moles are in 18 g of water? Mr(H₂O) = 18.', ['0.5 mol', '1 mol', '18 mol', '36 mol'], 1, 'Moles = mass ÷ relative formula mass = 18 ÷ 18 = 1 mol.'),
    q('Energy changes', 'What happens to the surroundings in an exothermic reaction?', ['They cool down', 'They warm up', 'Their mass doubles', 'Their pH becomes 7'], 1, 'An exothermic reaction transfers energy to the surroundings, increasing their temperature.'),
    q('Rates', 'Why does powdered calcium carbonate react faster than large chips?', ['It has a larger surface area to volume ratio', 'It has a different formula', 'It removes collisions', 'It lowers the temperature'], 0, 'More surface is exposed, so reacting particles collide more frequently.'),
    q('Organic chemistry', 'What is the general formula of an alkane?', ['CnH2n+2', 'CnH2n', 'CnH2n−2', 'CnHn'], 0, 'Saturated alkanes follow the general formula CnH2n+2.'),
    q('Analysis', 'Which method separates the coloured substances in ink?', ['Filtration', 'Paper chromatography', 'Crystallisation only', 'Neutralisation'], 1, 'Paper chromatography separates soluble substances by their different movement through the paper.'),
    q('Atmosphere', 'Which gas makes up about 78% of Earth’s atmosphere?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Argon'], 1, 'Nitrogen is the largest component of the present atmosphere at about 78%.'),
    q('Resources', 'What is potable water?', ['Water safe to drink', 'Pure H₂O only', 'Salt water', 'Water at boiling point'], 0, 'Potable water has sufficiently low levels of dissolved salts and microbes to be safe to drink.'),
  ],
  Physics: [
    q('Energy', 'A 2 kg object is raised 5 m. Calculate its gain in gravitational potential energy using g = 10 N/kg.', ['10 J', '25 J', '50 J', '100 J'], 3, 'GPE = mass × gravitational field strength × height = 2 × 10 × 5 = 100 J.'),
    q('Electricity', 'Two resistors are connected in series. What happens to their resistances?', ['They add together', 'They multiply', 'The smaller resistance disappears', 'Both become zero'], 0, 'The total resistance in a series circuit is the sum of the component resistances.'),
    q('Particle model', 'What happens to particles when a solid melts?', ['They stop moving', 'They gain energy and move past one another', 'They become new atoms', 'They lose all mass'], 1, 'Energy weakens the forces holding particles in fixed positions, allowing them to move past each other.'),
    q('Atomic physics', 'What is alpha radiation?', ['A helium nucleus', 'A high-energy electron', 'An electromagnetic wave', 'A neutron only'], 0, 'An alpha particle contains two protons and two neutrons, the same as a helium nucleus.'),
    q('Forces', 'A 4 kg object accelerates at 3 m/s². What resultant force acts?', ['0.75 N', '7 N', '12 N', '24 N'], 2, 'Using F = ma, force = 4 × 3 = 12 N.'),
    q('Waves', 'What is frequency measured in?', ['Metres', 'Seconds', 'Hertz', 'Newtons'], 2, 'Frequency is the number of waves per second and is measured in hertz, Hz.'),
    q('Magnetism', 'Where is the magnetic field around a bar magnet strongest?', ['At the poles', 'Exactly halfway between the poles', 'Everywhere equally', 'Only inside the magnet'], 0, 'Field lines are closest together at the poles, showing the field is strongest there.'),
    q('Motion', 'What does the gradient of a distance–time graph represent?', ['Acceleration', 'Speed', 'Force', 'Energy'], 1, 'The gradient is change in distance divided by change in time, which is speed.'),
    q('Electricity', 'A device uses 240 J in 20 s. Calculate its power.', ['12 W', '20 W', '120 W', '4,800 W'], 0, 'Power = energy transferred ÷ time = 240 ÷ 20 = 12 W.'),
    q('Space', 'What keeps a planet in orbit around the Sun?', ['Magnetic repulsion', 'Gravitational attraction', 'Air resistance', 'Nuclear radiation'], 1, 'Gravity supplies the centripetal force that continually changes the planet’s direction.'),
  ],
  History: [
    q('Chronology', 'Why is chronology important in a causal explanation?', ['It shows the order in which causes and consequences developed', 'It proves every event was inevitable', 'It replaces evidence', 'It removes the need for judgement'], 0, 'Accurate sequence helps explain how one development influenced another over time.'),
    q('Source skills', 'What does provenance tell a historian?', ['Who produced a source, when and for what purpose', 'Whether the source is automatically true', 'The modern value of the paper', 'Only how long it is'], 0, 'Authorship, date and purpose help assess what a source can reveal and its limitations.'),
    q('Medicine', 'Why was germ theory a major turning point?', ['It linked microorganisms to disease', 'It proved miasma caused every illness', 'It ended all disease immediately', 'It removed the need for surgery'], 0, 'Germ theory provided a scientific explanation of infection and guided prevention and treatment.'),
    q('Conflict', 'What made trench warfare on the Western Front difficult to break?', ['Defensive weapons and fortified positions', 'A complete absence of artillery', 'No transport systems', 'Peace throughout Europe'], 0, 'Machine guns, artillery, barbed wire and deep defences gave a strong advantage to defenders.'),
    q('Germany', 'Why did the Wall Street Crash affect Germany severely?', ['Germany depended on American loans', 'Germany had no trade links', 'The mark was made of gold', 'Reparations had never existed'], 0, 'Withdrawal of US lending damaged German businesses, banks and employment.'),
    q('Cold War', 'What was containment?', ['A US policy aimed at limiting the spread of communism', 'A plan to abolish NATO', 'The division of Germany in 1914', 'A Soviet farming method'], 0, 'Containment used economic, political and military measures to resist further communist expansion.'),
    q('Elizabethan England', 'Why was the Spanish Armada defeated in 1588?', ['English tactics, weather and Spanish planning problems', 'Spain had no ships', 'England invaded Madrid first', 'The conflict took place on land only'], 0, 'Several factors combined, including fireships, English manoeuvrability, storms and logistical weaknesses.'),
    q('Norman England', 'What was the main purpose of motte-and-bailey castles?', ['To establish rapid military control', 'To serve only as monasteries', 'To replace all villages', 'To grow crops inside the keep'], 0, 'Quickly built castles helped Norman forces dominate strategic areas and suppress resistance.'),
    q('Change', 'What is continuity?', ['An aspect that remains broadly the same over time', 'A sudden revolution only', 'A source written later', 'An unsupported interpretation'], 0, 'Continuity describes features that persist despite other developments and changes.'),
    q('Significance', 'Which feature most supports a claim that an event was significant?', ['It had wide, lasting consequences', 'It happened on a Tuesday', 'Its name is memorable', 'Only one source mentions it'], 0, 'Historical significance is strengthened by deep, widespread and long-lasting impact.'),
  ],
  Geography: [
    q('Rivers', 'Why does a river usually deposit material?', ['It loses energy and competence', 'Its velocity always increases', 'Its load dissolves instantly', 'The gradient becomes steeper'], 0, 'When velocity falls, the river has less energy to carry sediment and deposits its load.'),
    q('Coasts', 'What is hydraulic action?', ['Wave pressure forcing air into cracks', 'Pebbles striking one another', 'Dissolving limestone by acid only', 'Wind moving sand inland'], 0, 'Repeated compression of air in cracks weakens the cliff and causes erosion.'),
    q('Hazards', 'Why can monitoring reduce volcanic risk?', ['It can provide warning of changing activity', 'It prevents magma forming', 'It moves settlements automatically', 'It stops plate movement'], 0, 'Measurements such as gas output and ground deformation can support evacuation decisions.'),
    q('Ecosystems', 'What is a food web?', ['Interconnected food chains', 'A map of rainfall', 'A soil profile only', 'A measure of population density'], 0, 'A food web shows the feeding relationships among organisms in an ecosystem.'),
    q('Urban change', 'What is urban regeneration?', ['Investment to improve a run-down urban area', 'Movement from cities to villages only', 'Building on every greenfield site', 'Reducing all public transport'], 0, 'Regeneration seeks environmental, social and economic improvement in areas of decline.'),
    q('Development', 'What does the Human Development Index combine?', ['Income, education and life expectancy', 'Rainfall, relief and rock type', 'Imports only', 'Birth rate only'], 0, 'HDI provides a broader development measure using health, education and income.'),
    q('Resource management', 'How can water transfer schemes create conflict?', ['Donor and receiving regions may have competing needs', 'They create unlimited water', 'They have no environmental effects', 'They remove every cost'], 0, 'Moving water can benefit one area while reducing supply or damaging environments elsewhere.'),
    q('Climate change', 'What is mitigation?', ['Action to reduce causes of climate change', 'Recording weather for one day', 'Ignoring emissions', 'Moving every coastal city'], 0, 'Mitigation reduces greenhouse-gas emissions or increases carbon storage.'),
    q('Fieldwork', 'Why should a fieldwork conclusion refer to data?', ['To support the judgement with evidence', 'To make the report longer only', 'To replace the method', 'To hide anomalous results'], 0, 'A valid conclusion uses collected results to answer the enquiry question.'),
    q('Maps', 'What do closely spaced contour lines indicate?', ['A steep slope', 'A gentle slope', 'A river mouth', 'A low population'], 0, 'Height changes rapidly over a short horizontal distance where contours are close together.'),
  ],
  'Computer Science': [
    q('Algorithms', 'What does abstraction do?', ['Removes unnecessary detail to focus on key information', 'Adds every possible detail', 'Encrypts all variables', 'Repeats a loop forever'], 0, 'Abstraction simplifies a problem or model by retaining only relevant features.'),
    q('Programming', 'What is a syntax error?', ['Code that breaks the language’s grammar rules', 'A correct output', 'A hardware fault only', 'A type of compression'], 0, 'A syntax error occurs when source code does not follow the programming language’s rules.'),
    q('Programming', 'Why is a function useful?', ['It packages reusable code for a defined task', 'It permanently deletes input', 'It converts every value to binary manually', 'It prevents testing'], 0, 'Functions improve reuse, decomposition and maintainability by naming a block of behaviour.'),
    q('Data representation', 'What is the hexadecimal value of binary 1111?', ['A', 'D', 'E', 'F'], 3, 'Binary 1111 equals decimal 15, represented by F in hexadecimal.'),
    q('Data representation', 'What determines the file size of an uncompressed bitmap image?', ['Resolution and colour depth', 'Only the filename', 'The monitor brightness', 'The number of folders'], 0, 'More pixels and more bits per pixel both increase the amount of stored data.'),
    q('Networks', 'What is a LAN?', ['A network covering a limited geographical area', 'A programming language', 'A worldwide satellite only', 'An encryption key'], 0, 'A local area network connects devices within a small area such as a school or office.'),
    q('Cyber security', 'What is brute-force authentication attack?', ['Trying many possible passwords systematically', 'Physically breaking a monitor', 'Compressing a database', 'Installing updates'], 0, 'A brute-force attack repeatedly guesses credentials until a valid combination is found.'),
    q('Databases', 'What is validation?', ['Checking data follows defined rules', 'Proving data is completely accurate', 'Deleting every duplicate', 'Sorting records alphabetically only'], 0, 'Validation checks format, range or presence; valid data may still be factually wrong.'),
    q('Systems', 'What is the purpose of an operating system?', ['Manage hardware and provide services for applications', 'Create electricity', 'Replace all application software', 'Design network cables'], 0, 'The operating system manages resources, files, peripherals, users and application execution.'),
    q('Ethics', 'Why should personal data be collected only when necessary?', ['To reduce privacy risk and support data minimisation', 'To make databases larger', 'To avoid all backups', 'To remove consent requirements'], 0, 'Data minimisation limits exposure by collecting only information needed for a stated purpose.'),
  ],
  'English Literature': [
    q('Character', 'What makes a character interpretation convincing?', ['A clear idea supported by patterns of evidence', 'A plot summary only', 'One quotation without explanation', 'A list of adjectives'], 0, 'A convincing interpretation tracks relevant choices, language and development across the text.'),
    q('Language', 'What is dramatic irony?', ['The audience knows something a character does not', 'A poem has no rhyme', 'A stage direction is spoken', 'The narrator changes tense'], 0, 'Dramatic irony creates tension or humour through the audience’s greater knowledge.'),
    q('Poetry', 'What is a caesura?', ['A strong pause within a poetic line', 'The final stanza only', 'A repeated vowel sound', 'A fourteen-line poem'], 0, 'A caesura interrupts the line and can alter pace, emphasis or tone.'),
    q('Structure', 'What can a repeated image contribute to a text?', ['A motif that develops an idea', 'A guaranteed happy ending', 'A new narrator each time', 'Only historical context'], 0, 'A recurring image can accumulate meaning and connect moments across the work.'),
    q('Drama', 'Why might a playwright use an aside?', ['To reveal thoughts to the audience while other characters do not hear', 'To end the play immediately', 'To describe the set only', 'To change prose into a sonnet'], 0, 'An aside creates privileged audience knowledge about a character’s motives or reaction.'),
    q('Context', 'Which use of context is most effective?', ['Linking a relevant social idea to the writer’s presentation', 'Adding unrelated dates', 'Replacing analysis with biography', 'Assuming every reader responded identically'], 0, 'Context earns its place when it clarifies a textual choice and supports the argument.'),
    q('Comparison', 'What should a comparative paragraph establish first?', ['A meaningful connection between the texts', 'Which text is longer', 'The publication price', 'A list of all techniques'], 0, 'A focused similarity or contrast gives the comparison a clear analytical purpose.'),
    q('Theme', 'How is a theme different from a topic?', ['A theme is an idea the text explores about a topic', 'A theme is always one word', 'A topic includes analysis but a theme cannot', 'They are unrelated to meaning'], 0, 'A topic might be power; a theme expresses what the work suggests about power.'),
    q('Form', 'What does an unreliable narrator require the reader to do?', ['Question the account and infer beyond it', 'Accept every claim as fact', 'Ignore other characters', 'Read only the ending'], 0, 'Contradictions, bias or limited knowledge invite readers to evaluate the narrator’s version.'),
    q('Essay skills', 'What is the purpose of embedding a quotation?', ['Integrate evidence grammatically into the analysis', 'Make the quotation longer', 'Avoid explaining evidence', 'Replace the topic sentence'], 0, 'Embedded evidence keeps the argument fluent and makes close analysis easier.'),
  ],
};

const FRAMES = [
  (stem: string) => `Application check: ${stem}`,
  (stem: string) => `A student is reviewing this topic. Select the accurate answer: ${stem}`,
  (stem: string) => `Misconception check — which option correctly answers this question? ${stem}`,
];

/** Add topic questions, then create answer-position and application variants until the minimum is met. */
export function expandToMinimum(subject: string, seeds: PracticeSeed[], minimum = 50): PracticeSeed[] {
  const pool = [...seeds, ...(CURRICULUM_EXTRA[subject] ?? [])];
  const expanded = [...pool];
  let index = 0;
  while (expanded.length < minimum) {
    const base = pool[index % pool.length];
    const shift = (index % (base.options.length - 1)) + 1;
    const options = base.options.map((_, optionIndex) => base.options[(optionIndex + shift) % base.options.length]);
    const answers = (Array.isArray(base.answer) ? base.answer : [base.answer]).map((answer) => (answer - shift + base.options.length) % base.options.length);
    expanded.push({
      ...base,
      stem: FRAMES[index % FRAMES.length](base.stem),
      options,
      answer: Array.isArray(base.answer) ? answers : answers[0],
      explanation: `This checks the same skill in a different answer order. ${base.explanation}`,
    });
    index += 1;
  }
  return expanded;
}
