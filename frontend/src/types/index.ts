// ============================================================
// Types dựa theo file api_design_specification.md
// và uml_system_specification_report.md
// ============================================================

// ---------- Auth & User ----------
export type UserRole = "learner" | "expert" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  is_activated?: boolean;
  voice_consent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearnerGoal {
  user_id: string;
  target_overall: number | null;
  target_listening: number | null;
  target_reading: number | null;
  target_writing: number | null;
  target_speaking: number | null;
  test_date: string | null;
  updated_at?: string | null;
}

export interface ExpertProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_available: boolean;
  max_active_reviews: number;
  bio: string | null;
  active_reviews_count: number;
  created_at: string | null;
}


// ---------- Topics (Đề thi) ----------
export type TaskType = "task1" | "task2";
export type Difficulty = "easy" | "medium" | "hard";

// ---------- Essays (Bài viết) ----------
export type EssayStatus = "pending" | "evaluating" | "completed" | "failed" | "rejected";

export interface Essay {
  id: string;
  user_id: string;
  topic_id: string | null;
  content: string;
  word_count: number;
  status: EssayStatus;
  task_id: string | null;
  submitted_at: string;
  evaluated_at: string | null;
}

// ---------- Criteria & Annotations ----------
export interface CriteriaDetail {
  sub_criteria?: Record<string, string>;
  feedback: {
    strengths: string[];
    areas_to_improve: string[];
  };
}

export interface CriteriaAnalysis {
  task_response: CriteriaDetail;
  coherence_cohesion: CriteriaDetail;
  lexical_resource: CriteriaDetail;
  grammar_accuracy: CriteriaDetail;
}

export interface InlineAnnotation {
  id: string;
  type: 'error' | 'upgrade' | 'logic_issue' | 'strength';
  category: 'TR' | 'CC' | 'LR' | 'GRA';
  title?: string;
  original_text: string;
  corrected_text: string | null;
  explanation: string;
  recommendation?: string | null;
  position_start: number;
  position_end: number;
}

// ---------- Evaluation Results (Kết quả chấm điểm từ API) ----------
export interface EvaluationResultDetail {
  overall_band: number;
  task_response_score: number;
  coherence_cohesion_score: number;
  lexical_resource_score: number;
  grammar_accuracy_score: number;
  overall_upgraded_essay: string | null;
  criteria_analysis: CriteriaAnalysis;
  is_score_overridden: boolean;
  evaluator_type?: "ai" | "expert" | string;
  expert_feedback?: string | null;
}

export interface SiblingEssayItem {
  essay_id: string;
  task_no: 1 | 2 | number;
  task_type: string;
  word_count: number;
}

// ---------- Frontend UI Types ----------
// Dùng nội bộ cho các component UI sau khi đã map từ API data
export interface GradingResult {
  essay_id: string;
  attempt_id?: string | null;
  test_id?: string | null;
  test_title?: string | null;
  task_no: 1 | 2;
  task_type: string;
  task_prompt: string;
  chart_image_url: string | null;
  prompt_category?: string | null;
  min_words: number;
  status: string;
  content: string;
  word_count: number;
  overall_upgraded_essay: string;
  is_score_overridden?: boolean;
  evaluator_type?: "ai" | "expert" | string;
  expert_feedback?: string | null;
  sibling_essays?: SiblingEssayItem[];
  scores: {
    overall_band: number;
    task_response: number;
    coherence_cohesion: number;
    lexical_resource: number;
    grammatical_range_and_accuracy: number;
  };
  criteria_analysis: CriteriaAnalysis;
  inline_annotations: InlineAnnotation[];
}

// ---------- API Response Shapes ----------
// Response từ API 2: GET /api/v1/essays/{id}/results
export interface EssayResultsResponse {
  meta: { code: number; message: string };
  data: {
    essay: Pick<Essay, "id" | "content" | "word_count" | "status" | "evaluated_at"> & {
      attempt_id?: string | null;
      test_id?: string | null;
      test_title?: string | null;
      task_no?: number;
      task_type?: string;
      task_prompt?: string;
      chart_image_url?: string | null;
      prompt_category?: string | null;
      min_words?: number;
    };
    result: EvaluationResultDetail | null;
    inline_annotations: InlineAnnotation[] | null;
    sibling_essays?: SiblingEssayItem[];
    trace_info?: { phoenix_trace_url: string }; // Chỉ Admin thấy
  };
}

// Response từ API 4: GET /api/v1/users/me/progress
export interface UserProgress {
  total_essays: number;
  avg_overall_band: number;
  avg_tr_score: number;
  avg_cc_score: number;
  avg_lr_score: number;
  avg_gra_score: number;
  best_overall_band: number;
  last_submission_at: string | null;
}


// ---------- Expert Review Workflow Types (BR-11, BR-15, BR-16, BR-20) ----------
export interface LearnerQuota {
  week_start: string;
  mock_quota: number;
  mock_used: number;
  mock_reserved: number;
  mock_remaining: number;
  practice_quota: number;
  practice_used: number;
  practice_remaining: number;
  school_weekly_capacity: number;
  school_capacity_left: number;
  can_reserve_mock: boolean;
  can_request_practice: boolean;
}

export interface ExpertAssignment {
  id: string;
  request_id: string;
  attempt_id: string;
  expert_id: string;
  skill: 'writing' | 'speaking';
  source: 'mock' | 'practice';
  test_title: string;
  learner_name?: string | null;
  learner_email?: string | null;
  assigned_at: string;
  started_at: string | null;
  due_at: string;
  ended_at: string | null;
  end_reason: string | null;
  note: string | null;
  evaluation_id: string | null;
  can_decline: boolean;
  remaining_hours: number;
}

export interface WorkspaceTaskItem {
  essay_id: string;
  section_id: string;
  task_no?: number;
  task_type: 'task1' | 'task2';
  prompt_category?: string | null;
  task_prompt: string;
  chart_image_key: string | null;
  chart_image_url?: string | null;
  min_words: number;
  content: string;
  word_count: number;
}

export interface WorkspaceQuestionItem {
  response_id: string;
  question_id: string;
  part_number?: number;
  order_no: number;
  prompt: string;
  audio_key: string | null;
  audio_url?: string | null;
  audio_deleted?: boolean;
  duration_ms: number;
  transcript: string;
}

export interface CriterionScoreDetail {
  criterion_id: string;
  code: string;
  name: string;
  task_no: number;
  band: number;
  comment: string;
}

export interface WorkspaceAnnotation {
  id?: string;
  type: string;
  category: string;
  title?: string;
  original_text?: string;
  corrected_text?: string | null;
  explanation: string;
  start_pos?: number | null;
  end_pos?: number | null;
  essay_id?: string | null;
  response_id?: string | null;
  start_ms?: number | null;
  end_ms?: number | null;
}

export interface ExpertWorkspaceData {
  assignment: ExpertAssignment;
  attempt: {
    id: string;
    learner_id: string;
    skill: 'writing' | 'speaking';
    mode: 'mock' | 'practice';
    started_at: string;
    submitted_at: string;
    test_id: string;
    tests: { id: string; title: string; skill: string };
  };
  learner_target: {
    target_overall: number | null;
    target_writing: number | null;
    target_speaking: number | null;
    test_date: string | null;
  };
  content: {
    tasks?: WorkspaceTaskItem[];
    questions?: WorkspaceQuestionItem[];
  };
  criteria_definitions: Array<{
    id: string;
    code: string;
    name: string;
    skill: string;
    task_type?: string;
  }>;
  ai_evaluation: {
    evaluation: { id: string; overall_band: number; feedback: string } | null;
    criteria: CriterionScoreDetail[];
    annotations: WorkspaceAnnotation[];
  };
  expert_draft: {
    evaluation: { id: string; overall_band: number | null; feedback: string; status: string } | null;
    criteria: CriterionScoreDetail[];
    annotations: WorkspaceAnnotation[];
  };
}
