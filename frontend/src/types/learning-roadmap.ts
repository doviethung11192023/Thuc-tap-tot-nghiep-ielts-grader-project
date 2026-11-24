export interface SkillDiagnosticBand {
  skill: string;
  current_band: number;
  target_band: number;
  gap: number;
  confidence: 'high' | 'low' | 'insufficient';
  confidence_label: string;
  attempts_count: number;
  mock_count: number;
  waiting_expert_count: number;
  preliminary_avg?: number | null;
}

export interface StrategyPlaybook {
  title: string;
  focus_label: string;
  steps: string[];
}

export interface SmartRecommendedTest {
  id: string;
  title: string;
  skill: string;
  duration_min: number;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  is_micro: boolean;
  recommended_mode: 'practice' | 'exam';
  slot_label: string;
  match_score: number;
  reason: string;
  link: string;
}

export interface WeeklyPacingSummary {
  days_remaining: number;
  weeks_remaining: number;
  weekly_target_tests: number;
  completed_this_week: number;
  pacing_status: 'on_track' | 'needs_boost' | 'completed';
}

export interface PersonalizedRoadmap {
  priority_skill: string;
  priority_reason: string;
  is_diagnostic: boolean;
  weakest_area: string;
  evidence_summary: string;
  exam_phase: 'foundation' | 'acceleration' | 'sprint';
  strategy: StrategyPlaybook;
  recommended_tests: SmartRecommendedTest[];
  recent_exclude_days?: number;
  expert_review_tip: boolean;
  weekly_pacing: WeeklyPacingSummary;
}

export interface MonthlyProgressionPoint {
  month: string;
  label: string;
  overall_band: number | null;
  mock_band?: number | null;
  practice_band?: number | null;
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
  speaking?: number | null;
  month_over_month_delta: number | null;
  total_tests: number;
  scored_tests: number;
  mock_count: number;
  practice_count: number;
  study_hours: number;
  lr_accuracy_percent: number | null;
  is_provisional: boolean;
  best_improved_skill: string | null;
  monthly_insight: string;
}

export interface MonthlyScorecard {
  current_month: string;
  current_label: string;
  overall_band: number;
  band_delta: number | null;
  lr_accuracy: number | null;
  accuracy_delta: number | null;
  total_tests: number;
  tests_delta: number | null;
  study_hours: number;
  best_skill: string;
  is_provisional: boolean;
  insight: string;
  target_band: number;
}

export interface CriterionMasteryItem {
  code: string;
  name: string;
  average_band: number;
  target_band: number;
  delta: number | null;
  sample_count: number;
  status: 'strong' | 'improving' | 'needs_work';
}

export interface SkillScore {
  skill: string;
  score: number;
  count?: number;
}

export interface ActivityDay {
  date: string;
  minutes: number;
}

export interface QuestionTypeResult {
  id: string;
  type: string;
  averageScore: number;
  lastPracticeTime: string;
  skill: string;
}

export interface TestHistoryItem {
  id: string;
  testName: string;
  score: number;
  type: string;
  skill: string;
  submittedAt: string;
}
