# GradeSpark GCSE

GradeSpark is a modern GCSE practice and revision app for iPhone, Android and web. Students choose a subject and exam board, complete quick practice or timed tests, review worked answers, and track readiness over time.

## Included content

The app ships with at least 3,750 original exam-style question instances across 50 practice sets. Every subject and exam-board combination contains at least 75 answered questions. Subjects include:

- Mathematics
- English Language
- English Literature
- Combined Science
- Biology
- Chemistry
- Physics
- History
- Geography
- Computer Science

Each subject is available under AQA, Pearson Edexcel, OCR, WJEC Eduqas and CCEA. Every question includes an answer key and worked explanation. Questions are informed by GCSE assessment objectives and common paper formats, but do not reproduce copyrighted past-paper questions.

The Revision Hub links to official AQA, Pearson, OCR, WJEC Eduqas and CCEA past-paper resources plus BBC Bitesize, Corbettmaths, Maths Genie, Cognito, FreeScienceLessons and Craig'n'Dave.

The November expansion adds 25 distinct questions to each subject bank, keeping the first 50 question IDs stable. The same subject pool is shared across board filters; these are topic practice sets, not replicas of individual board papers. History options and literature texts vary by course, so students should check their own specification. Each new question includes a link to the official curriculum guidance used for its subject. Existing repeat variants remain in the first 50 questions; no new repeat variants were added.

## Run locally

Node.js 22 or later is required.

```bash
npm install
npm start
```

Press `w` for the browser, `a` for Android, or scan the QR code with Expo Go. The same React Native project builds for both mobile platforms:

```bash
npm run build:android
npm run build:ios
```

## Quality checks

```bash
npm test
npm run typecheck
npx expo export --platform android
npx expo export --platform ios
```

## Content and copyright

Bundled questions and worked answers are original GradeSpark content. External past papers remain on the exam boards' websites and open in the student's browser. GradeSpark is not affiliated with AQA, Pearson, OCR, WJEC Eduqas, CCEA, BBC, or the linked revision providers.
