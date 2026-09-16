import "server-only";

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

/** Reads for the public site — never require a browser-facing API key;
 * FastAPI is only reachable server-side. Cached for 60s: content changes
 * via the CMS don't need to be instant, and this is a simple content site. */
export function publicGet<T>(tenantSlug: string, path: string): Promise<T> {
  return request<T>(path, {
    headers: { "X-Tenant-Slug": tenantSlug },
    next: { revalidate: 60 },
  });
}

export function publicPost<T>(tenantSlug: string, path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "X-Tenant-Slug": tenantSlug, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

interface AdminOpts {
  token: string;
  tenantId?: number; // only needed for a super_admin acting "as" a tenant
}

export function adminGet<T>(opts: AdminOpts, path: string): Promise<T> {
  return request<T>(path, {
    headers: adminHeaders(opts),
    cache: "no-store",
  });
}

export function adminMutate<T>(
  opts: AdminOpts,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  return request<T>(path, {
    method,
    headers: { ...adminHeaders(opts), ...(body ? { "Content-Type": "application/json" } : {}) },
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
