import type { NextConfig } from "next";

// T066: mirrors the headers the API sets in `backend/src/middleware/security.ts`.
// `Content-Security-Policy` is deliberately absent until there is a deployment
// to validate it against, because a wrong directive set breaks Next.js (T216).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=15552000" }
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
