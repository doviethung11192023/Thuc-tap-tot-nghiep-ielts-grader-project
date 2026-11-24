import type { NextConfig } from "next";

// Header bảo mật cho mọi trang. Content-Security-Policy (có nonce, sinh mỗi request) đặt trong src/proxy.ts.
const securityHeaders = [
  // Chống clickjacking: không cho trang khác nhúng app vào iframe (CSP frame-ancestors cũng chặn)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Speaking cần micro của chính app; camera, vị trí không dùng
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
