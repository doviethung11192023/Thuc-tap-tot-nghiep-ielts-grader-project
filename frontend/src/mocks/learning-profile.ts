import {
  SkillScore,
  ActivityDay,
  QuestionTypeResult,
  TestHistoryItem,
  TestScoreTracking
} from '../types/learning-profile';

export const mockRadarData: SkillScore[] = [
  { skill: 'Writing', score: 1.0 },
  { skill: 'Overview', score: 0.5 },
  { skill: 'Listening', score: 0.0 },
  { skill: 'Reading', score: 0.0 },
  { skill: 'Speaking', score: 0.0 },
];

export const mockDonutData = [
  { name: 'Listening', value: 0, color: '#f59e0b' },
  { name: 'Reading', value: 1, color: '#10b981' },
  { name: 'Writing', value: 1, color: '#3b82f6' },
  { name: 'Speaking', value: 0, color: '#eab308' },
];

export const mockQuestionTypeResults: QuestionTypeResult[] = [
  {
    id: '1',
    type: 'Mixed Charts',
    averageScore: 1.0,
    lastPracticeTime: '2026-09-30T10:00:00Z',
    skill: 'Writing',
  },
  {
    id: '2',
    type: 'Cause - Effect',
    averageScore: 1.0,
    lastPracticeTime: '2026-09-30T10:00:00Z',
    skill: 'Writing',
  },
];

export const mockTestHistory: TestHistoryItem[] = [
  {
    id: 'h1',
    testName: 'Sentence Completion - The Memory Paradox',
    score: 0,
    type: 'Sentence Completion',
    skill: 'Reading',
    submittedAt: '2026-09-30T20:31:00Z',
  },
  {
    id: 'h2',
    testName: 'WT1: Mixed charts + WT2: Two-part question',
    score: 1.0,
    type: 'Writing Task 1 & 2',
    skill: 'Writing',
    submittedAt: '2026-09-30T20:19:00Z',
  },
];

export const mockScoreTracking: TestScoreTracking[] = [
  { id: 'st1', testNumber: 1, writing: 1.0, mode: 'practice' },
  { id: 'st2', testNumber: 2, writing: 1.5, mode: 'practice' },
  { id: 'st3', testNumber: 3, writing: 2.0, mode: 'practice' },
];

// Generate simple mock activity data for 3 months
export const mockActivityData: ActivityDay[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (89 - i));
  return {
    date: date.toISOString(),
    minutes: Math.random() > 0.5 ? Math.floor(Math.random() * 120) : 0,
  };
});
