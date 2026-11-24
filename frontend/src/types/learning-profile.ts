import type {
  CriterionMasteryItem,
  MonthlyProgressionPoint,
  MonthlyScorecard,
  PersonalizedRoadmap,
  SkillDiagnosticBand,
  SkillScore,
} from "./learning-roadmap";

export * from "./learning-roadmap";

export interface HeatmapDay {
  day_of_week: string;
  date: string;
  minutes: number;
  is_future: boolean;
  is_frozen?: boolean;
}

export interface HeatmapWeek {
  week_index: number;
  month_label: string;
  days: HeatmapDay[];
  total_minutes: number;
}

export interface LearningProfileKPIs {
  total_time_hours: number;
  total_time_minutes: number;
  total_cups: number;
  total_tests_taken: number;
  total_exercises_studied: number;
}

export interface LearningProfileGoals {
  input_band: number;
  /** Overall theo BR-02; null khi chưa đủ band 4 kỹ năng */
  predicted_band: number | null;
  target_band: number;
  target_listening?: number;
  target_reading?: number;
  target_writing?: number;
  target_speaking?: number;
  confidence_label?: string;
  waiting_expert_count?: number;
  progress_percent: number;
  /** null khi Learner chưa chọn ngày thi */
  test_date: string | null;
  goal_set?: boolean;
}

export type JourneySkill = "listening" | "reading" | "writing" | "speaking";

/** Band hiện tại 1 kỹ năng (BR-12, spec 005) */
export interface CurrentSkillBand {
  band: number | null;
  source: "mock" | "practice" | "none";
  attempts_used: number;
  low_confidence: boolean;
  target: number | null;
  gap: number | null;
}

export type CurrentBands = Record<JourneySkill, CurrentSkillBand> & { overall: number | null };

export interface ExamCountdown {
  test_date: string | null;
  days_left: number | null;
  date_passed: boolean;
}

export interface NextStepSuggestion {
  kind: "diagnostic" | "part" | "test" | "mock";
  skill: JourneySkill;
  /** null với gợi ý Mock: hệ thống chọn đề ngẫu nhiên khi bắt đầu */
  test_id: string | null;
  test_title: string | null;
  mode: "practice" | "mock";
  parts: number[];
  question_type: string | null;
  predicted_correct: number | null;
  last_done_at: string | null;
}

export interface NextStepWeakSpot {
  kind: "question_type" | "criterion";
  key: string;
  label: string;
  value: number;
  answered: number | null;
  comment: string | null;
  prompt_type: string | null;
}

/** Thẻ "Bước tiếp theo" (BR-17, ADR-23) */
export interface LearnerNextStep {
  goal_set: boolean;
  priority_skill?: JourneySkill | null;
  reason?: string;
  weak_spot?: NextStepWeakSpot | null;
  suggestions?: NextStepSuggestion[];
  exam_days_left?: number | null;
}

export interface DonutItem {
  name: string;
  value: number;
  color: string;
}

export interface StudyMilestone {
  id: string;
  band_target: number;
  title: string;
  total_cups_earned: number;
  max_cups: number;
  completed_units: number;
  total_units: number;
  is_active: boolean;
  progress_percent: number;
  next_test_id?: string | null;
}

export interface DashboardStats {
  total_submissions: number;
  avg_band: number;
  best_band: number;
  last_activity_date: string;
}

export interface RecentSubmissionItem {
  id: string;
  type: 'essay' | 'test' | string;
  title: string;
  date: string;
  status: string;
  band: number | null;
  link: string;
}

export interface AdaptiveStreakData {
  current_streak: number;
  longest_streak: number;
  mode: 'standard' | 'sprint' | string;
  daily_target_minutes: number;
  days_until_exam: number | null;
  last_active_date?: string | null;
  today_minutes: number;
  today_completed: number;
  today_met: boolean;
  today_progress_pct: number;
  freezes_earned: number;
  freezes_used: number;
  freezes_remaining: number;
  max_freezes_per_month: number;
  frozen_dates?: string[];
  weekly_goal_days?: number;
  weekly_completed_days?: number;
  reminder_enabled?: boolean;
  hours_until_midnight_vn?: number;
  can_repair?: boolean;
  broken_streak_backup?: number;
  repair_deadline_at?: string | null;
  repair_progress?: {
    completed: number;
    required: number;
  };
  grace_recovery?: {
    eligible: boolean;
    recovered_today?: boolean;
    recoverable_streak: number;
    requirement?: string | null;
  };
}

export interface StreakSummaryData {
  current_streak: number;
  longest_streak: number;
  mode: 'standard' | 'sprint' | string;
  daily_target_minutes: number;
  days_until_exam: number | null;
  today_met: boolean;
  today_minutes: number;
  today_completed: number;
  freezes_remaining: number;
  max_freezes_per_month: number;
  weekly_goal_days: number;
  weekly_completed_days: number;
  reminder_enabled: boolean;
  hours_until_midnight_vn: number;
  can_repair: boolean;
  broken_streak_backup: number;
  repair_deadline_at: string | null;
  repair_progress: { completed: number; required: number };
}

export interface StudyPlanUpdatePayload {
  weekly_goal_days?: 3 | 5 | 7;
  reminder_enabled?: boolean;
}

export interface LearnerBadgeItem {
  id: string;
  pillar: 'streak' | 'mastery' | 'breakthrough' | string;
  tier: 'bronze' | 'silver' | 'gold' | string;
  title: string;
  description: string;
  current_value: number;
  target_value: number;
  progress_pct: number;
  unlocked: boolean;
}

export interface LearnerBadgesData {
  summary: {
    unlocked_count: number;
    total_count: number;
    gold_count: number;
    silver_count: number;
    bronze_count: number;
  };
  badges: LearnerBadgeItem[];
}

export interface LearningProfileOverviewData {
  kpis: LearningProfileKPIs;
  dashboard_stats?: DashboardStats;
  recent_submissions?: RecentSubmissionItem[];
  goals: LearningProfileGoals;
  study_milestones?: StudyMilestone[];
  skill_diagnostics?: Record<string, SkillDiagnosticBand>;
  roadmap?: PersonalizedRoadmap;
  monthly_progression?: MonthlyProgressionPoint[];
  monthly_scorecard?: MonthlyScorecard;
  radar_data: SkillScore[];
  donut_data: DonutItem[];
  heatmap_weeks: HeatmapWeek[];
  adaptive_streak?: AdaptiveStreakData;
  badges?: LearnerBadgesData;
  current_bands?: CurrentBands;
  exam?: ExamCountdown;
}

export interface WeeklySkillStat {
  average: number | null;
  completed_tests: number;
  delta: number | null;
}

export interface TestScoreTracking {
  id: string;
  testNumber: number;
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
  mode: 'practice' | 'exam' | 'mock' | string;
  score?: number;
  skill?: string;
  title?: string;
  date?: string;
}

export interface AIDiagnosticFeedback {
  listening: string;
  reading: string;
  writing: string;
  speaking: string;
}

export interface QuestionHighlightItem {
  title: string;
  type_name: string;
  total_attempts: number;
  accuracy_rate: number;
  metric_type?: "accuracy" | "band";
  avg_band?: number;
  note?: string;
  delta_badge?: string;
}

export interface QuestionTypeHighlights {
  most_practiced: QuestionHighlightItem;
  most_stable: QuestionHighlightItem;
  most_improved: QuestionHighlightItem;
  needs_improvement: QuestionHighlightItem;
}

export interface QuestionTypeReportRow {
  type_name: string;
  skill: string;
  total_questions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  metric_type?: "accuracy" | "band";
  avg_band?: number;
  last_practiced: string;
}

export interface PracticeHistoryItem {
  id: string;
  test_id?: string;
  mode?: string;
  status?: string;
  testName: string;
  type_badge: string;
  band: number;
  score_percent: number;
  skill: string;
  submittedAt: string;
}

export interface LearningProfileTestPracticeData {
  skill_averages: Record<string, WeeklySkillStat>;
  score_tracking: TestScoreTracking[];
  ai_feedback: AIDiagnosticFeedback;
  highlights: QuestionTypeHighlights;
  question_type_report: QuestionTypeReportRow[];
  recent_history: PracticeHistoryItem[];
  criterion_mastery?: {
    writing: CriterionMasteryItem[];
    speaking: CriterionMasteryItem[];
  };
  monthly_progression?: MonthlyProgressionPoint[];
  monthly_scorecard?: MonthlyScorecard;
}

export interface GoalUpdatePayload {
  input_band?: number;
  target_overall?: number;
  target_listening?: number;
  target_reading?: number;
  target_writing?: number;
  target_speaking?: number;
  test_date?: string;
}
