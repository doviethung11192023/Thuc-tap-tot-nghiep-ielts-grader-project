"use client";

const RELOAD_GUARD_KEY = "moonlab_chunk_reload_ts";
const RELOAD_COOLDOWN_MS = 15_000;

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const text =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? `${err.name} ${err.message}`
        : typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
  const lower = text.toLowerCase();
  return (
    lower.includes("chunkloaderror") ||
    lower.includes("loading chunk") ||
    lower.includes("failed to fetch dynamically imported module") ||
    lower.includes("importing a module script failed") ||
    lower.includes("failed to load chunk")
  );
}

/**
 * Tự động tải lại trang đúng 1 lần trong cửa sổ 15 giây khi hash JS bị lệch sau lần build mới.
 * Tránh màn hình lỗi đen mặc định của Next.js và chống vòng lặp reload vô hạn.
 */
export function tryAutoRecoverChunkError(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || "0");
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
