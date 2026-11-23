import { isAxiosError } from "axios";
import apiClient from "@/lib/api-client";
import type {
  CreatePromptVersionBody,
  JevOverrideBody,
  LlmOverrideBody,
  ProviderKeyStatus,
  PromptDetail,
  PromptOverview,
  RuntimeConfigView,
  SaveOverrideResult,
  ServiceHealthResponse,
  StepOverrideBody,
} from "@/types/admin-ai-services";

const BASE = "/api/v1/admin";

/** Lời lỗi tiếng Việt từ `detail` (chuỗi) hoặc danh sách lỗi pydantic; không lộ nội dung request. */
export function aiServiceErrorMessage(err: unknown, fallback = "Có lỗi xảy ra, thử lại sau"): string {
  if (!isAxiosError(err)) return fallback;
  const detail = err.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== "body").join(".") : "";
        return field ? `${field}: ${d.msg ?? "không hợp lệ"}` : (d.msg ?? "không hợp lệ");
      })
      .join("; ");
  }
  if (!err.response) return "Không kết nối được máy chủ";
  return fallback;
}

// ---------- Sức khoẻ ----------
export async function getServicesHealth(service = "all"): Promise<ServiceHealthResponse> {
  // Engine có thể mất tới ~20 s để kiểm hết
  const res = await apiClient.get(`${BASE}/ai-services/health`, { params: { service }, timeout: 40_000 });
  return res.data.data;
}

// ---------- Cấu hình model ----------
export async function getRuntimeConfig(): Promise<RuntimeConfigView> {
  const res = await apiClient.get(`${BASE}/ai-services/runtime-config`);
  return res.data.data;
}

// Gọi thử LLM có thể chậm: cho tối đa 90 s
const SAVE_TIMEOUT = 90_000;

export async function saveStepOverride(step: string, body: StepOverrideBody): Promise<SaveOverrideResult> {
  const res = await apiClient.put(`${BASE}/ai-services/runtime-config/steps/${encodeURIComponent(step)}`, body, {
    timeout: SAVE_TIMEOUT,
  });
  return res.data.data;
}

export async function saveLlmOverride(body: LlmOverrideBody): Promise<SaveOverrideResult> {
  const res = await apiClient.put(`${BASE}/ai-services/runtime-config/llm`, body, { timeout: SAVE_TIMEOUT });
  return res.data.data;
}

export async function saveJevOverride(body: JevOverrideBody): Promise<SaveOverrideResult> {
  const res = await apiClient.put(`${BASE}/ai-services/runtime-config/jev`, body, { timeout: SAVE_TIMEOUT });
  return res.data.data;
}

// ---------- API key ----------
export async function getProviderKeys(): Promise<ProviderKeyStatus[]> {
  const res = await apiClient.get(`${BASE}/ai-services/keys`);
  return res.data.data;
}

/** Gửi key mới; hàm không giữ lại key sau khi trả về. */
export async function replaceProviderKey(
  provider: string,
  apiKey: string,
): Promise<{ provider: string; last4: string; source: "app" }> {
  const res = await apiClient.put(
    `${BASE}/ai-services/keys/${encodeURIComponent(provider)}`,
    { api_key: apiKey },
    { timeout: SAVE_TIMEOUT },
  );
  return res.data.data;
}

export async function revertProviderKey(provider: string): Promise<{ provider: string; source: "env"; last4: string | null }> {
  const res = await apiClient.delete(`${BASE}/ai-services/keys/${encodeURIComponent(provider)}`, {
    timeout: SAVE_TIMEOUT,
  });
  return res.data.data;
}

// ---------- Prompt ----------
export async function getPrompts(): Promise<PromptOverview[]> {
  const res = await apiClient.get(`${BASE}/prompts`, { timeout: 60_000 });
  return res.data.data;
}

export async function getPromptDetail(name: string, version: number): Promise<PromptDetail> {
  const res = await apiClient.get(`${BASE}/prompts/detail`, { params: { name, version } });
  return res.data.data;
}

export async function createPromptVersion(body: CreatePromptVersionBody): Promise<{ name: string; version: number }> {
  const res = await apiClient.post(`${BASE}/prompts/versions`, body, { timeout: 60_000 });
  return res.data.data;
}

export async function setPromptProduction(
  name: string,
  version: number,
): Promise<{ name: string; previous_version: number | null; version: number }> {
  const res = await apiClient.put(`${BASE}/prompts/production`, { name, version }, { timeout: 60_000 });
  return res.data.data;
}
