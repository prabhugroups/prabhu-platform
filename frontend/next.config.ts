import type { NextConfig } from "next";

const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8010";

// `(site)/layout.tsx` renders two server-controlled dangerouslySetInnerHTML
// blocks per request: a tenant theme <style> (colors from the tenant row,
// editable only by an authenticated admin) and an Organization JSON-LD
// <script> (also tenant-row-derived). A strict nonce-based CSP would cover
// both, but Next only applies nonces to dynamically-rendered pages — every
// route here would have to opt out of static rendering/ISR, which conflicts
// with the revalidate-based caching this app already relies on (see
// lib/api.ts's `publicGet`). Given the actual inputs are admin-authored, not
// public user input, 'unsafe-inline' for script/style is the deliberate
// trade-off here rather than a strict nonce CSP — everything else below
// (no external script/frame/object origins, no framing, no cross-origin
// form submission) still holds. Revisit if those two inline blocks are ever
// replaced with an external-stylesheet / nonce-based approach.
// Dev-only: Next's dev server (Fast Refresh, cross-environment stack-trace
// reconstruction) needs eval(). Production builds never hit this branch.
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline';"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval';";

const cspHeader = `
  default-src 'self';
  ${scriptSrc}
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // Local dev / fallback only — in production Traefik routes /media/*
      // straight to FastAPI's StaticFiles mount (see infra/traefik), so
      // Next.js rarely sees these requests there.
      {
        source: "/media/:path*",
        destination: `${internalApiUrl}/media/:path*`,
      },
    ];
  },
  // Belt-and-suspenders alongside Traefik's own security-headers middleware
  // (infra/traefik/dynamic/routers.yml.template) — that's the actual public
  // edge in production, but these fire unconditionally, including in local
  // `next dev`/`next start` where Traefik isn't in the loop at all (see
  // docs/TRAEFIK.md's "Local development" section).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), camera=(), microphone=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
