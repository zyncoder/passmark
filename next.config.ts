import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co").host;
  } catch {
    return "*.supabase.co";
  }
})();

// Build a single CSP string. Connect-src must include Supabase for auth/REST/Storage.
// Camera access (`getUserMedia`) doesn't need CSP allowance — it needs the page
// to be served over HTTPS or localhost.
const csp = [
  `default-src 'self'`,
  // Next inlines small client bundles + uses `unsafe-eval` only in dev.
  `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: https://${supabaseHost}`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
  `worker-src 'self' blob:`,
  `media-src 'self' blob: mediastream:`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
