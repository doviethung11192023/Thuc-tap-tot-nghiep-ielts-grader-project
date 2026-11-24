// Chặn open redirect: tham số URL (`next`, `returnUrl`) chỉ được trỏ vào trang trong app.
// "//evil.com" và "/\evil.com" trình duyệt hiểu là domain khác; "javascript:..." chạy mã.
export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  try {
    // Phân giải thử trên một origin giả: nếu origin đổi thì đường dẫn đang trỏ ra ngoài
    const resolved = new URL(raw, "http://app.local");
    if (resolved.origin !== "http://app.local") return fallback;
    // "/..//evil.com" chuẩn hoá thành pathname "//evil.com": vẫn cùng origin nhưng ai đọc lại pathname
    // để điều hướng tiếp sẽ ra domain khác. Từ chối, và trả bản đã chuẩn hoá thay cho chuỗi gốc.
    if (resolved.pathname.startsWith("//")) return fallback;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}
