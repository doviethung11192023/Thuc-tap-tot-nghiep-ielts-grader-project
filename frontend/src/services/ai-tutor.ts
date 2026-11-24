import apiClient from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

export interface TutorPublicConfig {
  enabled: boolean;
  bot_name: string;
  default_language: "vi" | "en";
  welcome_message_vi: string;
  welcome_message_en: string;
  mascot_animation_enabled: boolean;
  mascot_speed: number;
  allow_answer_unlock: boolean;
  min_attempts_before_unlock: number;
  default_hint_tier?: number;
  max_input_chars: number;
  enable_reading_highlight: boolean;
  anti_spoiler_mode: "strict" | "balanced" | "off";
  quick_chips_vi: string[];
  quick_chips_en: string[];
}

export interface TutorQuota {
  limit: number;
  used: number;
  remaining: number;
}

export interface TutorQuestionGroup {
  id: string;
  section_no: number;
  label: string;
  question_numbers: number[];
  question_type: string;
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  group_label?: string;
  target_question_no?: number | null;
  unlocked?: boolean;
  provider?: string;
  model?: string;
  cached?: boolean;
  feedback?: "up" | "down" | null;
  created_at?: string;
}

export interface TutorSessionData {
  attempt_id: string;
  skill: "listening" | "reading";
  test_title: string;
  config: TutorPublicConfig;
  quota: TutorQuota;
  question_groups: TutorQuestionGroup[];
  messages: TutorMessage[];
}

export interface TutorStreamPayload {
  attempt_id: string;
  section_no: number;
  question_group_id?: string | null;
  target_question_no?: number | null;
  message: string;
  language: "vi" | "en";
  hint_tier?: number;
  unlock_answer?: boolean;
  is_quick_chip?: boolean;
  user_answers?: Record<string, string | string[]>;
}

export interface TutorStreamDoneMeta {
  message_id: string;
  quota: TutorQuota;
  provider?: string;
  model?: string;
  failover_used?: boolean;
  cached?: boolean;
  unlocked?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function getAccessToken(): Promise<string> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("supabase_access_token");
    if (cached) return cached;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export async function getTutorSession(attemptId: string): Promise<TutorSessionData> {
  const res = await apiClient.get<{ data: TutorSessionData }>(
    `/api/v1/test-practice/tutor/session/${attemptId}`
  );
  return res.data.data;
}

export async function resetTutorSession(attemptId: string): Promise<void> {
  await apiClient.delete(`/api/v1/test-practice/tutor/session/${attemptId}`);
}

export async function sendTutorFeedback(
  attemptId: string,
  messageId: string,
  rating: "up" | "down"
): Promise<void> {
  await apiClient.post("/api/v1/test-practice/tutor/feedback", {
    attempt_id: attemptId,
    message_id: messageId,
    rating,
  });
}

export async function streamTutorMessage(
  payload: TutorStreamPayload,
  callbacks: {
    onDelta: (text: string) => void;
    onDone: (meta: TutorStreamDoneMeta) => void;
    onError: (detail: string) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const token = await getAccessToken();
  const resp = await fetch(`${API_BASE}/api/v1/test-practice/tutor/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!resp.ok || !resp.body) {
    let detail = `Không thể kết nối Trợ lý AI (HTTP ${resp.status})`;
    try {
      const errJson = await resp.json();
      if (typeof errJson?.detail === "string") detail = errJson.detail;
    } catch {
      // ignore non-json error body
    }
    callbacks.onError(detail);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let currentEvent = "message";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        currentEvent = "message";
        continue;
      }
      if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (currentEvent === "delta" && data.text) callbacks.onDelta(String(data.text));
          else if (currentEvent === "done") callbacks.onDone(data as TutorStreamDoneMeta);
          else if (currentEvent === "error") callbacks.onError(String(data.detail || "Lỗi AI Tutor"));
        } catch {
          // ignore malformed event chunk
        }
      }
    }
  }
}
