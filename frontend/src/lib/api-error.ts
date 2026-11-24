/** Extracts a user-facing API error message without casting to `any`. */
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const maybeAxios = err as { response?: { data?: { detail?: unknown } }; message?: unknown };
    const detail = maybeAxios.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (typeof detail === "object" && detail !== null && "message" in detail) {
      const msg = (detail as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) {
        return msg;
      }
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown } | undefined;
      if (first && typeof first.msg === "string" && first.msg.trim()) {
        return first.msg;
      }
    }
    if (typeof maybeAxios.message === "string" && maybeAxios.message.trim()) {
      return maybeAxios.message;
    }
  }
  return fallback;
}
