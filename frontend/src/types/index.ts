// ============================================================
// Types dựa theo file api_design_specification.md
// và uml_system_specification_report.md
// ============================================================

// ---------- Auth & User ----------
export type UserRole = "student" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- Topics (Đề thi) ----------
export type TaskType = "task1" | "task2";
export type Difficulty = "easy" | "medium" | "hard";

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  prompt_content: string;
  task_type: TaskType;
  difficulty: Difficulty;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

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

// ---------- Grammar Errors ----------
export type ErrorSeverity = "minor" | "major" | "critical";

export interface GrammarError {
  error_type: string;
  original_text: string;
  corrected_text: string;
  explanation: string;
  position_start: number;
  position_end: number;
  severity: ErrorSeverity;
}

// ---------- Evaluation Results (Kết quả chấm điểm) ----------
export interface EvaluationResult {
  overall_band: number;
  task_response_score: number;
  coherence_cohesion_score: number;
  lexical_resource_score: number;
  grammar_accuracy_score: number;
  overall_feedback: string;
  tr_feedback: string;
  cc_feedback: string;
  lr_feedback: string;
  gra_feedback: string;
  improvement_suggestions: string;
  is_score_overridden: boolean;
}

// ---------- API Response Shapes ----------
// Response từ API 1: POST /api/v1/essays/evaluate
export interface SubmitEssayResponse {
  meta: { code: number; message: string };
  data: {
    essay_id: string;
    status: EssayStatus;
    word_count: number;
  };
}

// Response từ API 2: GET /api/v1/essays/{id}/results
export interface EssayResultsResponse {
  meta: { code: number; message: string };
  data: {
    essay: Pick<Essay, "id" | "content" | "word_count" | "status" | "evaluated_at">;
    result: EvaluationResult;
    grammar_errors: GrammarError[];
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

// Response từ API 5: GET /api/v1/topics (có phân trang)
export interface PaginatedResponse<T> {
  meta: { code: number; message: string };
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
  };
}

// Response từ API 6: GET /api/v1/essays (lịch sử bài viết)
export interface EssayHistoryItem {
  essay_id: string;
  topic_title: string;
  status: EssayStatus;
  overall_band: number | null;
  submitted_at: string;
}
