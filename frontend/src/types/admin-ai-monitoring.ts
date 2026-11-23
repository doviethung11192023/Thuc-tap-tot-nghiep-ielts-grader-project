// Kiểu dữ liệu API giám sát AI của Admin (spec 008). Shape theo code backend app/services/ai_monitoring/*.

export type RunStatus = "running" | "done" | "failed";
export type RunStatusFilter = RunStatus | "stuck" | "attention";
export type BudgetState = "ok" | "warning" | "exceeded" | "off";

export interface Paged<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

/** prompt_versions của một lượt: {khoá prompt: số phiên bản}, ví dụ {"ta": 3, "grade": 7}. */
export type PromptVersions = Record<string, number | string> | null;

export interface GradingRunItem {
  id: string;
  attempt_id: string | null;
  evaluation_id: string;
  skill: string | null;
  mode: string | null;
  task_no: number | null;
  status: RunStatus;
  is_stuck: boolean;
  model: string | null;
  prompt_versions: PromptVersions;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | string | null;
  latency_ms: number | null;
  started_at: string;
  finished_at: string | null;
  error_short: string | null;
  trace_url: string | null;
}

export interface GradingRunDetail extends GradingRunItem {
  error: string | null;
  output: unknown;
  evaluation: { id: string; status: string; is_official: boolean; overall_band: number | null } | null;
  attempt: { id: string; status: string; skill: string; mode: string | null; test_title: string | null } | null;
}

export interface GradingRunFilters {
  status?: string;
  skill?: string;
  date_from?: string;
  date_to?: string;
  model?: string;
  prompt_name?: string;
  prompt_version?: string;
  attempt_id?: string;
}

export interface BudgetStatus {
  state: BudgetState;
  budget_usd: number | null;
  month_cost_usd: number;
  percent: number | null;
}

export interface AdminAlerts {
  failed_attempts: number;
  stuck_runs: number;
  budget: BudgetStatus;
  total: number;
}

export type RegradeSkipReason =
  | "grading"
  | "no_speech"
  | "audio_deleted"
  | "not_submitted"
  | "not_ai_graded"
  | "duplicate"
  | "not_found";

export interface RegradePreview {
  to_regrade: { attempt_id: string; skill: string; status: string }[];
  skipped: { attempt_id: string; reason: RegradeSkipReason | string }[];
  estimated_cost_usd: number | null;
  budget: { state: BudgetState; percent: number | null };
}

export interface RegradeResult {
  batch_id: string | null;
  queued: { attempt_id: string; evaluation_id: string; run_ids: string[] }[];
  skipped: { attempt_id: string; reason: RegradeSkipReason | string }[];
}

export type UsageGroupBy = "day" | "model" | "skill";

export interface UsageRow {
  key: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  runs: number;
  unknown_cost_runs: number;
  no_usage_runs: number;        // trong unknown_cost_runs: lượt chấm trước khi có ghi token
}

export interface UsageReport {
  month: string;
  total: Omit<UsageRow, "key">;
  budget: BudgetStatus;
  rows: UsageRow[];
  models_without_price: string[];
}

export interface ModelPrice {
  input_per_1m: number | null;
  output_per_1m: number | null;
}

/** Kết quả kiểm giá một model với nguồn của nhà cung cấp. */
export interface PriceSyncModelResult {
  status: "updated" | "unchanged" | "not_found";
  source: "alibaba_official" | "litellm" | null;
  note: string | null;          // ví dụ giảm giá có thời hạn; giá lưu vẫn là giá niêm yết
  previous?: ModelPrice;        // chỉ có khi status = updated
}

export interface PriceSyncStatus {
  checked_at: string;
  last_change_at: string | null;
  errors: string[];
  models: Record<string, PriceSyncModelResult>;
}

export interface PricingConfig {
  prices: Record<string, ModelPrice>;
  budget_usd: number | null;
  models_in_use: { model: string; steps: string[] }[];
  sync: PriceSyncStatus | null; // null khi chưa kiểm lần nào
}

export interface PricingUpdate {
  prices?: Record<string, ModelPrice>;
  budget_usd?: number | null;
}

export interface GapStats {
  n: number;
  mean_abs: number;
  mean_signed: number;
}

export interface GapCriterionStats extends GapStats {
  skill: string;
  code: string;
}

export interface GapBlock {
  overall: GapStats | null;
  by_criterion: GapCriterionStats[];
}

export type GapGroupBy = "none" | "prompt_version" | "model" | "task_type" | "band_range";

export interface GapOverview extends Partial<GapBlock> {
  days: number;
  group_by?: GapGroupBy;
  groups?: ({ key: string; label: string } & GapBlock)[];
}

export interface GapCaseItem {
  attempt_id: string;
  skill: string;
  mode: string | null;
  test_title: string | null;
  task_type: string;
  ai_evaluation_id: string;
  expert_evaluation_id: string;
  ai_band: number;
  expert_band: number;
  diff: number;
  ai_overall: number | null;
  expert_overall: number | null;
  model: string;
  prompt_versions: PromptVersions;
  prompt_label: string;
  has_expert_reason: boolean;
  expert_scored_at: string;
}

export interface GapCaseFilters {
  days?: number;
  skill?: string;
  criterion?: string;
  min_abs?: number;
  direction?: string;
  page?: number;
  limit?: number;
}

export interface CriterionComment {
  task_no: number;
  code: string | null;
  band: number | null;
  comment: string | null;
}

export interface GapAnnotation {
  source: "ai" | "expert";
  type: string | null;
  category: string | null;
  start_pos: number | null;
  end_pos: number | null;
  original_text: string | null;
  corrected_text: string | null;
  explanation: string | null;
}

export interface GapCaseDetail {
  attempt: { id: string; skill: string; mode: string | null; test_title: string | null; submitted_at: string | null };
  ai_evaluations: { id: string; created_at: string; overall_band: number | null; is_official: boolean }[];
  ai: {
    evaluation_id: string;
    overall_band: number | null;
    criteria: CriterionComment[];
    runs: {
      run_id: string;
      task_no: number | null;
      model: string | null;
      prompt_versions: PromptVersions;
      status: RunStatus;
      trace_url: string | null;
    }[];
  };
  expert: {
    evaluation_id: string;
    overall_band: number | null;
    scored_at: string;
    criteria: CriterionComment[];
    reason: string | null;
    feedback: string | null;
  };
  writing: { task_no: number; task_prompt: string | null; content: string | null; annotations: GapAnnotation[] }[];
  speaking: { part: number | string; question: string | null; transcript: string | null }[];
}

export interface AuditLogItem {
  id: string;
  created_at: string;
  actor_type: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
}

export interface AuditLogDetail extends AuditLogItem {
  before: unknown;
  after: unknown;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  actor?: string;
  action?: string;
  entity?: string;
  date_from?: string;
  date_to?: string;
}
