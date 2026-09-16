import { defineConfig } from "@playwright/test";

// Golden-path smoke tests against a running dev/prod server — this repo's
// unit-level coverage lives in the backend (see backend/tests/), which is
// where the tenant-isolation guarantees actually need proving. These tests
// assume the frontend is already running (see docs/RUNBOOK.md) and a
// `prabhusteel.com` tenant is seeded (see backend seed.py).
//
// Tenant resolution is by Host header (see src/proxy.ts), so tests navigate
// to the real tenant hostname rather than 127.0.0.1. Chromium's
// --host-resolver-rules flag maps that hostname to the local dev server
// without needing root to edit /etc/hosts (and unlike
// context.setExtraHTTPHeaders({Host: ...}), Chromium rejects a spoofed Host
// header there with net::ERR_INVALID_ARGUMENT — this is the supported way).
const DEV_PORT = process.env.DEV_PORT ?? "3010";
const TEST_TENANT_HOST = process.env.TEST_TENANT_HOST ?? "prabhusteel.com";
// A hostname that deliberately has no tenant_domains row, for the
// tenant-not-found test — also mapped locally so it resolves at all.
export const UNKNOWN_HOST = "not-a-registered-domain.example.com";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: `http://${TEST_TENANT_HOST}:${DEV_PORT}`,
    launchOptions: {
      args: [
        `--host-resolver-rules=MAP ${TEST_TENANT_HOST} 127.0.0.1,MAP ${UNKNOWN_HOST} 127.0.0.1`,
      ],
    },
  },
  reporter: "list",
});
