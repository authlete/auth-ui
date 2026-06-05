import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Clickjacking protection. Auth UIs must never be framable.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // MIME-sniffing protection.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak ticket/path on cross-origin sub-resource loads.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS — production only, but no harm in shipping it always.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /**
   * Keep server-only packages external from Next's bundler:
   *  - better-sqlite3: native module, not bundlable
   *  - better-auth + @better-auth/*: avoids Turbopack statically analyzing
   *    unused codepaths (e.g. the D1 SQLite dialect inside kysely-adapter
   *    which has a known DEFAULT_MIGRATION_TABLE import that breaks under
   *    static analysis but never runs at runtime when using better-sqlite3)
   */
  serverExternalPackages: [
    "better-sqlite3",
    "better-auth",
    "@better-auth/kysely-adapter",
    "@better-auth/core",
    "@better-auth/utils",
  ],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
