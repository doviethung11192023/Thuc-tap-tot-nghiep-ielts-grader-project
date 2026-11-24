// CSP có nonce cho mọi trang: lớp chặn XSS thứ hai sau bộ lọc HTML đề (src/lib/sanitize-html.ts).
// - script-src: chỉ script mang nonce của request này (Next tự gắn nonce cho script của nó) và script do chúng
//   nạp ('strict-dynamic'). Script bị chèn vào trang, handler nội tuyến (onerror=...) và URL javascript: đều bị chặn.
// - connect-src: chỉ Core API, Supabase (REST, Auth, Realtime) và R2 (upload bằng presigned URL). Lỡ có mã chạy
//   thì cũng không gửi được token ra server lạ.
// Nonce đòi mọi trang render động (xem app/layout.tsx). Tài liệu: node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function originOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");
  const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseRealtime = supabaseOrigin.replace(/^http/, "ws");      // https -> wss
  const connectSources = [
    "'self'", apiOrigin, supabaseOrigin, supabaseRealtime,
    "https://*.r2.cloudflarestorage.com",
    isDev ? "ws:" : "",                                                // hot reload của next dev
  ].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    // React dev dùng eval để dựng lại stack lỗi; bản production không cần
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Style nội tuyến vẫn cho: thuộc tính style của React, recharts, react-hot-toast và bảng đề. CSS không chạy được JS
    "style-src 'self' 'unsafe-inline'",
    // Ảnh đề và audio đề đến từ nhiều nơi (R2, link trong dataset); ảnh/audio không chạy được mã
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Next đọc CSP trong request header để lấy nonce và gắn vào script nó render
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Bỏ qua file tĩnh và request prefetch của next/link: không phải trang HTML nên không cần CSP
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
