export interface SkillScore {
  skill: string;
  score: number;
}

export interface ActivityDay {
  date: string; // ISO date string
  minutes: number;
}

export interface QuestionTypeResult {
  id: string;
  type: string;
  averageScore: number;
  lastPracticeTime: string; // ISO date string
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
}

export interface TestHistoryItem {
  id: string;
  testName: string;
  score: number;
  type: string;
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  submittedAt: string; // ISO date string
}

export interface TestScoreTracking {
  id: string;
  testNumber: number;
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
  mode: 'practice' | 'exam';
}
