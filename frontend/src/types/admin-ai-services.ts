// Kiểu dữ liệu trang Admin "Service AI" (spec 008): sức khoẻ, cấu hình model, API key, prompt.
// Shape theo code backend (admin_ai_services.py, effective_config.py, prompt_admin.py).

// ---------- Sức khoẻ ----------
export interface ServiceHealthRow {
  service: string;
  label: string;
  status: string; // ok | loaded | ready | not_configured | not_loaded | not_initialized | env_fallback | error | timeout | unavailable | unknown
  latency_ms: number | null;
  detail: string | null;
  error: string | null;
}

export interface ServiceHealthResponse {
  checked_at: string;
  services: ServiceHealthRow[];
}

// ---------- Cấu hình model ----------
export type ParamSource = "app" | "env" | "langfuse" | "default";

export interface EffectiveParam<T> {
  value: T | null;
  source: ParamSource;
}

export interface PerPromptParams {
  name: string;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  sources: { model: ParamSource; temperature: ParamSource; max_tokens: ParamSource };
}

export interface EffectiveStep {
  step: string;
  label: string;
  prompts: string[];
  model: EffectiveParam<string>;
  temperature: EffectiveParam<number>;
  max_tokens: EffectiveParam<number>;
  per_prompt?: PerPromptParams[];
  note?: string;
}

export interface StepOverride {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface RuntimeStepView {
  step: string;
  label: string;
  prompts: string[];
  effective: EffectiveStep | null; // null khi engine tắt
  override: StepOverride;
}

export type LlmGroupOverride = {
  timeout_seconds?: number;
  enable_thinking?: boolean;
};

export type JevGroupOverride = {
  model?: string;
  timeout_seconds?: number;
};

export interface LlmEffective {
  timeout_seconds: EffectiveParam<number>;
  enable_thinking: EffectiveParam<boolean>;
}

export interface JevEffective {
  model: EffectiveParam<string>;
  timeout_seconds: EffectiveParam<number>;
}

export interface RuntimeConfigView {
  steps: RuntimeStepView[];
  llm: { effective: LlmEffective | null; override: LlmGroupOverride };
  jev: { effective: JevEffective | null; override: JevGroupOverride };
  allowed_models: string[];
  updated_at: string | null;
  updated_by_email: string | null;
  warning?: string; // có khi engine tắt
}

/** Trường gửi lên PUT; null = bỏ ghi đè trường đó. */
export interface StepOverrideBody {
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
}

export interface LlmOverrideBody {
  timeout_seconds: number | null;
  enable_thinking: boolean | null;
}

export interface JevOverrideBody {
  model: string | null;
  timeout_seconds: number | null;
}

export interface SaveOverrideResult {
  override: Record<string, unknown>;
  test: { ok: boolean; latency_ms: number | null };
}

// ---------- API key ----------
export type KeySource = "app" | "env" | "none";

export interface ProviderKeyStatus {
  provider: string;
  label: string;
  configured: boolean;
  last4: string | null;
  source: KeySource;
  updated_at: string | null;
  updated_by_email: string | null;
  encryption_ready: boolean;
  env_known: boolean; // false: engine tắt nên chưa biết key trong .env
}

// ---------- Prompt ----------
export interface PromptVersionSummary {
  version: number;
  labels: string[];
  created_at: string | null;
  config: Record<string, unknown>;
  is_production: boolean;
}

export interface PromptOverview {
  name: string;
  step: string | null;
  production_version: number | null;
  versions: PromptVersionSummary[]; // 5 bản mới nhất + production
  required_variables: string[];
}

export interface PromptMessage {
  role: string;
  content: string;
}

export interface PromptDetail {
  name: string;
  version: number;
  labels: string[];
  type: string;
  prompt: PromptMessage[];
  config: Record<string, unknown>;
}

export interface CreatePromptVersionBody {
  name: string;
  prompt: PromptMessage[];
  config: Record<string, unknown>;
}
