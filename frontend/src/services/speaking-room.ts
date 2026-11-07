import apiClient from "@/lib/api-client";

export interface ConfirmedAnswer {
  response_id: string;
  question_id: string;
  duration_ms: number | null;
}

export interface SpeakingUploadTicket {
  response_id: string;
  upload_url: string;
  content_type: string;
  max_bytes: number;
}

const attemptPath = (attemptId: string) => `/api/v1/test-practice/attempts/${attemptId}`;

export async function getVoiceConsentAt(): Promise<string | null> {
  const res = await apiClient.get<{ voice_consent_at: string | null }>("/api/v1/users/me");
  return res.data.voice_consent_at;
}

export async function giveVoiceConsent(): Promise<void> {
  await apiClient.post("/api/v1/users/me/voice-consent");
}

export async function getConfirmedAnswers(attemptId: string): Promise<ConfirmedAnswer[]> {
  const res = await apiClient.get<{ data: { confirmed_answers?: ConfirmedAnswer[] } }>(`${attemptPath(attemptId)}/content`);
  return res.data.data.confirmed_answers ?? [];
}

export async function requestSpeakingUpload(attemptId: string, questionId: string, contentType: string) {
  const res = await apiClient.post<{ data: SpeakingUploadTicket }>(`${attemptPath(attemptId)}/speaking-uploads`, {
    question_id: questionId,
    content_type: contentType,
  });
  return res.data.data;
}

export async function confirmSpeakingUpload(attemptId: string, responseId: string, durationMs: number) {
  await apiClient.post(`${attemptPath(attemptId)}/speaking-uploads/${responseId}/confirm`, {
    duration_ms: Math.round(durationMs),
  });
}

/** PUT thẳng lên R2. Content-Type nằm trong chữ ký nên phải khớp đúng giá trị server trả về. */
export async function putAudioToStorage(ticket: SpeakingUploadTicket, blob: Blob): Promise<void> {
  const res = await fetch(ticket.upload_url, {
    method: "PUT",
    headers: { "Content-Type": ticket.content_type },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
}
