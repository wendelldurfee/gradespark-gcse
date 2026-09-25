export interface RevisionResource { subject: string; title: string; provider: string; url: string; kind: 'Video' | 'Revision' | 'Past papers'; }
export const REVISION_RESOURCES: RevisionResource[] = [
  { subject: 'All subjects', title: 'GCSE revision guides and quizzes', provider: 'BBC Bitesize', kind: 'Revision', url: 'https://www.bbc.co.uk/bitesize/levels/z98jmp3' },
  { subject: 'Mathematics', title: 'GCSE Maths videos and practice', provider: 'Corbettmaths', kind: 'Video', url: 'https://corbettmaths.com/contents/' },
  { subject: 'Mathematics', title: 'Maths topic lessons', provider: 'Maths Genie', kind: 'Revision', url: 'https://www.mathsgenie.co.uk/gcse.html' },
  { subject: 'Combined Science', title: 'GCSE Science lessons', provider: 'Cognito', kind: 'Video', url: 'https://www.youtube.com/@Cognitoedu' },
  { subject: 'Combined Science', title: 'Science revision videos', provider: 'FreeScienceLessons', kind: 'Video', url: 'https://www.youtube.com/@Freesciencelessons' },
  { subject: 'English Language', title: 'English Language revision', provider: 'BBC Bitesize', kind: 'Revision', url: 'https://www.bbc.co.uk/bitesize/subjects/zr9d7ty' },
  { subject: 'History', title: 'GCSE History revision', provider: 'BBC Bitesize', kind: 'Revision', url: 'https://www.bbc.co.uk/bitesize/subjects/zj26n39' },
  { subject: 'Geography', title: 'GCSE Geography revision', provider: 'BBC Bitesize', kind: 'Revision', url: 'https://www.bbc.co.uk/bitesize/subjects/zkw76sg' },
  { subject: 'Computer Science', title: 'Computer Science revision', provider: 'Craig’n’Dave', kind: 'Video', url: 'https://www.youtube.com/@craigndave' },
  { subject: 'All subjects', title: 'AQA past papers and mark schemes', provider: 'AQA', kind: 'Past papers', url: 'https://www.aqa.org.uk/find-past-papers-and-mark-schemes' },
  { subject: 'All subjects', title: 'Pearson Edexcel past papers', provider: 'Pearson', kind: 'Past papers', url: 'https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html' },
  { subject: 'All subjects', title: 'OCR assessment materials', provider: 'OCR', kind: 'Past papers', url: 'https://www.ocr.org.uk/qualifications/past-paper-finder/' },
  { subject: 'All subjects', title: 'Eduqas question bank and resources', provider: 'WJEC Eduqas', kind: 'Past papers', url: 'https://www.eduqas.co.uk/ed/home/question-bank/' },
  { subject: 'All subjects', title: 'CCEA past papers and mark schemes', provider: 'CCEA', kind: 'Past papers', url: 'https://apps.ccea.org.uk/pastpapers/' },
];
