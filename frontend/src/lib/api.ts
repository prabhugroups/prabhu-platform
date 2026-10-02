import "server-only";
import { headers } from "next/headers";

const BASE_URL = process.env.INTERNAL_API_URL;
if (!BASE_URL) {
  throw new Error("INTERNAL_API_URL is not set — required to reach the FastAPI backend");
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { headers?: Record<string, string> }): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  return (await res.json()) as T;
}

/** The visitor's IP as Traefik reported it (first X-Forwarded-For entry),
 * re-sent on every uncached backend call so FastAPI's per-IP limits — the
 * login lockout in particular — apply to that visitor rather than to this
 * one Next.js server that all traffic arrives from (see backend
 * app/core/rate_limit.py). Deliberately never added to cached reads: a
 * per-visitor header would split the fetch cache by visitor. */
export async function clientIpHeaders(): Promise<Record<string, string>> {
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
    return ip ? { "X-Forwarded-For": ip } : {};
  } catch {
    return {}; // outside a request scope (e.g. build time)
  }
}

/** Reads for the public site — never require a browser-facing API key;
 * FastAPI is only reachable server-side. Cached for 60s: content changes
 * via the CMS don't need to be instant, and this is a simple content site. */
export function publicGet<T>(tenantSlug: string, path: string): Promise<T> {
  return request<T>(path, {
    headers: { "X-Tenant-Slug": tenantSlug },
    next: { revalidate: 60 },
  });
}

export async function publicPost<T>(tenantSlug: string, path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { ...(await clientIpHeaders()), "X-Tenant-Slug": tenantSlug, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

interface AdminOpts {
  token: string;
  tenantId?: number; // only needed for a super_admin acting "as" a tenant
}

export async function adminGet<T>(opts: AdminOpts, path: string): Promise<T> {
  return request<T>(path, {
    headers: { ...(await clientIpHeaders()), ...adminHeaders(opts) },
    cache: "no-store",
  });
}

export async function adminMutate<T>(
  opts: AdminOpts,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  return request<T>(path, {
    method,
    headers: {
      ...(await clientIpHeaders()),
      ...adminHeaders(opts),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

function adminHeaders(opts: AdminOpts): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${opts.token}` };
  if (opts.tenantId !== undefined) headers["X-Tenant-Id"] = String(opts.tenantId);
  return headers;
}

export function mediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  // Same-origin /media/<path>: in production Traefik routes this one path
  // straight to FastAPI's StaticFiles mount (see infra/traefik); in local
  // dev, next.config.ts rewrites it to INTERNAL_API_URL instead.
  return `/media/${relativePath}`;
}
