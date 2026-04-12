import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The recommendation engine reads a committed cassette at runtime via
  // `path.resolve(process.cwd(), "tests/recommendations/cassettes/...")`.
  // Because the path is built dynamically, Next's Output File Tracing can't
  // detect it, so we explicitly whitelist the cassette for every route that
  // runs `produce_recommendations` on the server.
  outputFileTracingIncludes: {
    "/api/recommendations": [
      "./tests/recommendations/cassettes/**/*.json",
    ],
    "/workbench": [
      "./tests/recommendations/cassettes/**/*.json",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
