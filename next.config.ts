import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (PPR + `use cache`). Xem docs/performance-rules.md.
  cacheComponents: true,
  // React Compiler: tự memoize → KHÔNG cần viết tay useMemo/useCallback/memo.
  reactCompiler: true,
  experimental: {
    // DevTools › "Instant Navs" để soi shell tĩnh / điều hướng tức thì.
    instantNavigationDevToolsToggle: true,
  },
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
