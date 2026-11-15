export interface SpeakingAnnotation {
  id: string;
  category: string;
  title?: string | null;
  original_text?: string | null;
  corrected_text?: string | null;
  explanation: string;
  start_ms?: number | null;
  end_ms?: number | null;
}

export interface SpeakingAnswerDetail {
  response_id: string;
  part: number;
  question: string;
  transcript: string | null;
  duration_ms?: number | null;
  metrics?: Record<string, number> | null;
  audio_url: string | null;
  annotations?: SpeakingAnnotation[];
}

export interface PartFeedbackAnswer {
  question: string;
  relevance?: string;
  development?: string;
  strengths?: { point: string; evidence: string }[];
  issues?: { point: string; evidence: string; recommendation?: string }[];
  useful_language?: string[];
  upgraded_answer?: string;
}

export interface PartFeedback {
  part_summary?: string;
  answers?: PartFeedbackAnswer[];
}

export interface SpeakingCriterionScore {
  code: string;
  name: string;
  band: number;
  comment?: string | null;
}

export interface SpeakingSummaryPayload {
  grading_done?: boolean;
  criteria?: SpeakingCriterionScore[];
  feedback?: string | null;
  overall?: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
  } | null;
}

export interface SpeakingDetail {
  attempt_id?: string;
  test_id?: string;
  title: string;
  status?: string;
  overall_band?: number | null;
  evaluator_type?: string | null;
  expert_review_status?: string | null;
  submitted_at?: string | null;
  speaking?: SpeakingSummaryPayload | null;
  answers: SpeakingAnswerDetail[];
  parts: Record<string, PartFeedback | null> | null;
}

export const CRITERION_SHORT_LABELS: Record<string, string> = {
  FC: 'Fluency & Coherence',
  LR: 'Lexical Resource',
  GRA: 'Grammatical Range & Accuracy',
  P: 'Pronunciation',
};

export const QUESTION_METRIC_META: {
  key: string;
  label: string;
  format: (v: number) => string;
}[] = [
  { key: 'words_per_minute', label: 'Tốc độ nói', format: (v) => `${Math.round(v)} wpm` },
  { key: 'pause_ratio', label: 'Tỉ lệ ngắt quãng', format: (v) => `${Math.round(v * 100)}%` },
  { key: 'long_pause_count', label: 'Ngừng dài', format: (v) => `${Math.round(v)} lần` },
  { key: 'filler_count', label: 'Từ đệm', format: (v) => `${Math.round(v)} lần` },
];

export function formatMs(ms?: number | null): string {
  const safeMs = Number.isFinite(ms) ? Math.max(0, ms ?? 0) : 0;
  const sec = Math.floor(safeMs / 1000);
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

export function formatSec(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Ưu tiên khớp nhận xét theo nội dung câu hỏi chuẩn hóa để tránh lệch nếu có câu bị bỏ qua,
 * fallback về index nếu không tìm thấy khớp chính xác.
 */
export function matchPartFeedbackAnswer(
  partFeedback: PartFeedback | null | undefined,
  question: string,
  index: number
): PartFeedbackAnswer | undefined {
  const list = partFeedback?.answers;
  if (!list || list.length === 0) return undefined;
  const target = normalizeText(question);
  const byQuestion = list.find((item) => item.question && normalizeText(item.question) === target);
  return byQuestion ?? list[index];
}
