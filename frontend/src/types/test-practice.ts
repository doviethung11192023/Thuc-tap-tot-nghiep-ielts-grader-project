export interface TestSet {
  id: string;
  title: string;
  imageUrl: string;
  tags: string[];
  progress: {
    completed: number;
    total: number;
  };
  isBookmarked: boolean;
  durationMinutes?: number;
  questionsCount?: number;
}

export interface QuestionTypeCategory {
  id: string;
  name: string;
  accuracy: number; // 0 - 100
}

export interface PracticeExercise {
  id: string;
  title: string;
  type: string; // The question type it belongs to
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  questionCount: number;
  isPro: boolean;
  timeMinutes?: number;
  difficulty?: 'Dễ' | 'Trung bình' | 'Nâng cao';
}

export interface SkillAttemptHistory {
  id: string;
  attemptNumber: number;
  submittedAt: string;
  bandScore: number;
}

export interface SkillDetailInTest {
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  status: 'not_started' | 'draft' | 'completed';
  draftTime?: string;
  hasVirtualRoom?: boolean;
  latestBandScore?: number;
  attempts: SkillAttemptHistory[];
}

export interface SingleTestItem {
  id: string;
  orderNumber: number;
  title: string;
  skills: SkillDetailInTest[];
}

export interface ExamCollection {
  id: string;
  title: string;
  imageUrl: string;
  isHot?: boolean;
  isBookmarked?: boolean;
  skillsIncluded: ('Listening' | 'Reading' | 'Writing' | 'Speaking')[];
  testsCount: number;
  completedTestsCount: number;
  tests: SingleTestItem[];
}

export interface PublishedTestItem {
  id: string;
  title: string;
  skill: 'reading' | 'listening' | 'writing' | 'speaking';
  duration_min: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  allowed_mode?: 'practice' | 'mock' | 'both';
  test_set_id?: string | null;
  test_sets?: { id: string; name: string } | null;
  created_at?: string;
}

