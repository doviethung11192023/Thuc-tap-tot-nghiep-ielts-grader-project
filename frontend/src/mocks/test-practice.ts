import { TestSet, QuestionTypeCategory, PracticeExercise } from '../types/test-practice';

// --- [MÃ MỚI BỞI AGENT: Bộ đề chuẩn hóa 4 kỹ năng không có tag HOT/Pro và loại bỏ 100% ngoặc đơn tùy tiện] ---
export const mockTestSets: TestSet[] = [
  // --- READING ---
  {
    id: 'cam-18-test-1-reading',
    title: 'Cambridge IELTS 18 - Reading Test 1',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    tags: ['Reading', 'Academic'],
    progress: { completed: 1, total: 3 },
    isBookmarked: false,
    durationMinutes: 60,
    questionsCount: 40,
  },
  {
    id: 'cam-18-test-2-reading',
    title: 'Cambridge IELTS 18 - Reading Test 2',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    tags: ['Reading', 'Academic'],
    progress: { completed: 0, total: 3 },
    isBookmarked: false,
    durationMinutes: 60,
    questionsCount: 40,
  },
  {
    id: 'actual-test-reading-2024',
    title: 'Recent Actual Test - Academic Reading',
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    tags: ['Reading', 'Actual Test'],
    progress: { completed: 0, total: 3 },
    isBookmarked: true,
    durationMinutes: 60,
    questionsCount: 40,
  },

  // --- LISTENING ---
  {
    id: 'cam-18-test-1-listening',
    title: 'Cambridge IELTS 18 - Listening Test 1',
    imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    tags: ['Listening', 'Academic'],
    progress: { completed: 0, total: 4 },
    isBookmarked: true,
    durationMinutes: 30,
    questionsCount: 40,
  },
  {
    id: 'cam-18-test-2-listening',
    title: 'Cambridge IELTS 18 - Listening Test 2',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    tags: ['Listening', 'Academic'],
    progress: { completed: 0, total: 4 },
    isBookmarked: false,
    durationMinutes: 30,
    questionsCount: 40,
  },
  {
    id: 'actual-test-listening-2024',
    title: 'Recent Actual Test - Standard Listening',
    imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80',
    tags: ['Listening', 'Actual Test'],
    progress: { completed: 0, total: 4 },
    isBookmarked: false,
    durationMinutes: 30,
    questionsCount: 40,
  },

  // --- WRITING ---
  {
    id: 'cam-18-test-1-writing',
    title: 'Cambridge IELTS 18 - Writing Test 1 Task 1 và Task 2',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    tags: ['Writing', 'Academic'],
    progress: { completed: 2, total: 2 },
    isBookmarked: false,
    durationMinutes: 60,
    questionsCount: 2,
  },
  {
    id: 'cam-18-test-2-writing',
    title: 'Cambridge IELTS 18 - Writing Test 2 Task 1 và Task 2',
    imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80',
    tags: ['Writing', 'Academic'],
    progress: { completed: 0, total: 2 },
    isBookmarked: true,
    durationMinutes: 60,
    questionsCount: 2,
  },
  {
    id: 'actual-test-writing-2024',
    title: 'Recent Actual Test - Academic Writing',
    imageUrl: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80',
    tags: ['Writing', 'Actual Test'],
    progress: { completed: 0, total: 2 },
    isBookmarked: false,
    durationMinutes: 60,
    questionsCount: 2,
  },

  // --- SPEAKING ---
  {
    id: 'cam-18-test-1-speaking',
    title: 'Cambridge IELTS 18 - Full Speaking Examination 3 Parts',
    imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=600&q=80',
    tags: ['Speaking', 'Interview'],
    progress: { completed: 1, total: 3 },
    isBookmarked: true,
    durationMinutes: 14,
    questionsCount: 3,
  },
  {
    id: 'cam-18-test-2-speaking',
    title: 'Cambridge IELTS 18 - Speaking Test 2 Full 3 Parts',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80',
    tags: ['Speaking', 'Interview'],
    progress: { completed: 0, total: 3 },
    isBookmarked: false,
    durationMinutes: 14,
    questionsCount: 3,
  },
  {
    id: 'forecast-speaking-q4-2024',
    title: 'IELTS Speaking Forecast Quý 4 3 Parts',
    imageUrl: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=600&q=80',
    tags: ['Speaking', 'Forecast'],
    progress: { completed: 0, total: 3 },
    isBookmarked: false,
    durationMinutes: 14,
    questionsCount: 3,
  }
];

export const mockQuestionTypes: Record<string, QuestionTypeCategory[]> = {
  Reading: [
    { id: 'tr1', name: 'Sentence Completion', accuracy: 80 },
    { id: 'tr2', name: 'True / False / Not Given', accuracy: 65 },
    { id: 'tr3', name: 'Matching Headings', accuracy: 75 },
    { id: 'tr4', name: 'Diagram Labelling', accuracy: 90 },
    { id: 'tr5', name: 'Multiple Choice Single Answer', accuracy: 85 }
  ],
  Listening: [
    { id: 'tl1', name: 'Form Completion', accuracy: 85 },
    { id: 'tl2', name: 'Map and Plan Labelling', accuracy: 70 },
    { id: 'tl3', name: 'Multiple Choice Discussion', accuracy: 60 },
    { id: 'tl4', name: 'Lecture Notes Completion', accuracy: 75 }
  ],
  Writing: [
    { id: 'tw1', name: 'Task 1: Mixed Charts and Trends', accuracy: 75 },
    { id: 'tw2', name: 'Task 2: Discuss Both Views', accuracy: 70 },
    { id: 'tw3', name: 'Task 2: Agree or Disagree', accuracy: 65 }
  ],
  Speaking: [
    { id: 'ts1', name: 'Part 1: Personal Interview', accuracy: 80 },
    { id: 'ts2', name: 'Part 2: Cue Card Presentation', accuracy: 65 },
    { id: 'ts3', name: 'Part 3: In-Depth Discussion', accuracy: 70 }
  ]
};

export const mockExercises: PracticeExercise[] = [
  // --- READING EXERCISES ---
  {
    id: 'er1',
    title: 'Sentence Completion - The Memory Paradox',
    type: 'Sentence Completion',
    skill: 'Reading',
    questionCount: 4,
    isPro: false,
    timeMinutes: 8,
    difficulty: 'Trung bình',
  },
  {
    id: 'er2',
    title: 'True / False / Not Given - Cognitive Pruning',
    type: 'True / False / Not Given',
    skill: 'Reading',
    questionCount: 3,
    isPro: false,
    timeMinutes: 6,
    difficulty: 'Trung bình',
  },
  {
    id: 'er3',
    title: 'Matching Headings - Urban Architecture Evolution',
    type: 'Matching Headings',
    skill: 'Reading',
    questionCount: 5,
    isPro: false,
    timeMinutes: 10,
    difficulty: 'Nâng cao',
  },
  {
    id: 'er4',
    title: 'Diagram Labelling - Hydroelectric Power Plant',
    type: 'Diagram Labelling',
    skill: 'Reading',
    questionCount: 4,
    isPro: false,
    timeMinutes: 8,
    difficulty: 'Dễ',
  },
  {
    id: 'er5',
    title: 'Multiple Choice - Climate Change Mitigation Strategies',
    type: 'Multiple Choice Single Answer',
    skill: 'Reading',
    questionCount: 4,
    isPro: false,
    timeMinutes: 8,
    difficulty: 'Nâng cao',
  },

  // --- LISTENING EXERCISES ---
  {
    id: 'el1',
    title: 'Form Completion - Section 1 Accommodation Enquiry',
    type: 'Form Completion',
    skill: 'Listening',
    questionCount: 3,
    isPro: false,
    timeMinutes: 5,
    difficulty: 'Dễ',
  },
  {
    id: 'el2',
    title: 'Map and Plan Labelling - Greenways Riverside Park',
    type: 'Map and Plan Labelling',
    skill: 'Listening',
    questionCount: 4,
    isPro: false,
    timeMinutes: 6,
    difficulty: 'Trung bình',
  },
  {
    id: 'el3',
    title: 'Multiple Choice - Renewable Energy Seminar Discussion',
    type: 'Multiple Choice Discussion',
    skill: 'Listening',
    questionCount: 4,
    isPro: false,
    timeMinutes: 7,
    difficulty: 'Nâng cao',
  },
  {
    id: 'el4',
    title: 'Lecture Notes Completion - Marine Biology Conservation',
    type: 'Lecture Notes Completion',
    skill: 'Listening',
    questionCount: 5,
    isPro: false,
    timeMinutes: 8,
    difficulty: 'Trung bình',
  },

  // --- WRITING EXERCISES ---
  {
    id: 'ew1',
    title: 'WT2: Higher Education Funding Free vs Paid',
    type: 'Task 2: Discuss Both Views',
    skill: 'Writing',
    questionCount: 1,
    isPro: false,
    timeMinutes: 40,
    difficulty: 'Nâng cao',
  },
  {
    id: 'ew2',
    title: 'WT1: European Education Expenditure Trends',
    type: 'Task 1: Mixed Charts and Trends',
    skill: 'Writing',
    questionCount: 1,
    isPro: false,
    timeMinutes: 20,
    difficulty: 'Trung bình',
  },
  {
    id: 'ew3',
    title: 'WT2: Technological Advancement and Traditional Values',
    type: 'Task 2: Agree or Disagree',
    skill: 'Writing',
    questionCount: 1,
    isPro: false,
    timeMinutes: 40,
    difficulty: 'Trung bình',
  },

  // --- SPEAKING EXERCISES ---
  {
    id: 'es1',
    title: 'Part 2 Cue Card: Describe an Unforgettable Journey',
    type: 'Part 2: Cue Card Presentation',
    skill: 'Speaking',
    questionCount: 1,
    isPro: false,
    timeMinutes: 4,
    difficulty: 'Trung bình',
  },
  {
    id: 'es2',
    title: 'Part 1: Hometown and Leisure Activities',
    type: 'Part 1: Personal Interview',
    skill: 'Speaking',
    questionCount: 4,
    isPro: false,
    timeMinutes: 5,
    difficulty: 'Dễ',
  },
  {
    id: 'es3',
    title: 'Part 3: Social Media Impact on Modern Communication',
    type: 'Part 3: In-Depth Discussion',
    skill: 'Speaking',
    questionCount: 4,
    isPro: false,
    timeMinutes: 6,
    difficulty: 'Nâng cao',
  }
];
