import apiClient from "@/lib/api-client";

export interface AdminTutorConfig {
  enabled: boolean;
  enabled_skills: ("listening" | "reading")[];
  hourly_quota: number;
  max_history_turns: number;
  max_input_chars: number;
  quick_chip_cache_ttl_sec: number;
  primary_provider: "qwen" | "groq" | "gemini" | "openai_compatible";
  primary_model: string;
  primary_base_url: string;
  enable_thinking: boolean;
  failover_enabled: boolean;
  failover_provider: "qwen" | "groq" | "gemini" | "openai_compatible";
  failover_model: string;
  failover_base_url: string;
  temperature: number;
  max_output_tokens: number;
  timeout_seconds: number;
  anti_spoiler_mode: "strict" | "balanced" | "off";
  allow_answer_unlock: boolean;
  min_attempts_before_unlock: number;
  default_hint_tier: number;
  max_response_words: number;
  enable_reading_highlight: boolean;
  enable_band_adaptive_tone: boolean;
  bot_name: string;
  default_language: "vi" | "en";
  welcome_message_vi: string;
  welcome_message_en: string;
  mascot_animation_enabled: boolean;
  mascot_speed: number;
  quick_chips_listening_vi: string[];
  quick_chips_listening_en: string[];
  quick_chips_reading_vi: string[];
  quick_chips_reading_en: string[];
  custom_system_instructions: string;
}

export interface AdminTutorProviderInfo {
  provider: string;
  key_source: "admin_override" | "env" | "missing";
  has_override: boolean;
  env_configured: boolean;
  masked_key: string;
  default_base_url: string;
  default_model?: string;
}

export interface AdminTutorModelBreakdown {
  provider_model: string;
  turns: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface AdminTutorTraceItem {
  trace_id: string;
  message_id: string;
  timestamp: string;
  skill: string;
  test_title: string;
  section_no?: number;
  target_question_no?: number | null;
  hint_tier: number;
  unlocked: boolean;
  cached: boolean;
  provider: string;
  model: string;
  failover_used: boolean;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cached_tokens_saved: number;
  token_source: "provider_usage" | "estimated" | "cache" | string;
  cost_usd: number;
  ttft_ms: number;
  elapsed_ms: number;
  tokens_per_sec: number;
  finish_reason: string;
  redacted: boolean;
  redaction_count: number;
  question_preview: string;
  answer_preview: string;
  feedback?: "up" | "down" | null;
}

export interface AdminTutorTelemetry {
  namespace: string;
  prompt_tokens_today: number;
  completion_tokens_today: number;
  total_tokens_today: number;
  cached_prompt_tokens_today: number;
  cached_tokens_saved_today: number;
  avg_tokens_per_turn: number;
  estimated_cost_usd_today: number;
  cost_saved_usd_today: number;
  avg_ttft_ms: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  avg_tokens_per_sec: number;
  stream_turns_today: number;
  redactions_today: number;
  redacted_turns_today: number;
  truncated_turns_today: number;
  thumbs_up_today: number;
  thumbs_down_today: number;
  csat_pct: number | null;
  skill_tokens: { reading: number; listening: number };
  tier_turns: { tier1: number; tier2: number; tier3: number; unlock: number };
  context_share_pct: { system: number; passage: number; questions: number; history: number; query: number };
  models_breakdown: AdminTutorModelBreakdown[];
  recent_traces: AdminTutorTraceItem[];
}

export interface AdminTutorStats {
  date: string;
  redis_connected: boolean;
  turns_today: number;
  unlocks_today: number;
  cache_hits_today: number;
  cache_hit_rate: number;
  errors_today: number;
  failovers_today: number;
  top_tests: { test_id: string; title: string; skill: string; count: number }[];
  telemetry?: AdminTutorTelemetry;
}

export interface AdminTutorOverview {
  config: AdminTutorConfig;
  defaults: AdminTutorConfig;
  stats: AdminTutorStats;
  providers: Record<string, AdminTutorProviderInfo>;
  ai_engine_reachable: boolean;
}

export interface AdminTutorPingResult {
  ok: boolean;
  latency_ms?: number;
  preview?: string;
  reply?: string;
  provider?: string;
  model?: string;
  error?: string;
}

export async function getAdminTutorOverview(): Promise<AdminTutorOverview> {
  const res = await apiClient.get<{ data: AdminTutorOverview }>("/api/v1/admin/tutor/overview");
  return res.data.data;
}

export async function saveAdminTutorConfig(config: AdminTutorConfig) {
  const res = await apiClient.put("/api/v1/admin/core/settings/ai_tutor_config", {
    value: config,
    description: "Cấu hình động 6 nhóm cho Trợ lý AI Luyện tập (Listening & Reading)",
  });
  return res.data.data;
}

export async function updateAdminTutorSecrets(secrets: Record<string, string | null>) {
  const res = await apiClient.put<{ data: { masked_overrides: Record<string, string> } }>(
    "/api/v1/admin/tutor/secrets",
    { secrets }
  );
  return res.data.data;
}

export async function pingAdminTutorModel(payload: {
  provider: string;
  model: string;
  base_url: string;
  api_key?: string;
  enable_thinking?: boolean;
}): Promise<AdminTutorPingResult> {
  const res = await apiClient.post<{ data: AdminTutorPingResult }>("/api/v1/admin/tutor/ping", payload);
  return res.data.data;
}

export async function flushAdminTutorCache(): Promise<{ removed: number }> {
  const res = await apiClient.post<{ data: { removed: number } }>("/api/v1/admin/tutor/flush-cache");
  return res.data.data;
}
