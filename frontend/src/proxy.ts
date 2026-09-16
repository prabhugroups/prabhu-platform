import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.INTERNAL_API_URL;

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "").split(":")[0];
}

/** Resolves the tenant for every request from the incoming Host header and
 * forwards it as x-tenant-slug to server components / route handlers, which
 * then pass it to FastAPI as X-Tenant-Slug. FastAPI itself never trusts a
 * Host header — this is the one place that mapping happens (see
 * app/modules/tenants/router.py:resolve_tenant_by_domain on the backend).
 *
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (function
 * renamed to `proxy`); see node_modules/next/dist/docs/.../proxy.md. */
export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/media") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/super-admin") ||
    request.nextUrl.pathname === "/favicon.ico" ||
    request.nextUrl.pathname === "/tenant-not-found"
  ) {
    // The CMS lives outside the tenant-domain-resolution requirement: a
    // tenant_admin signs in from their own tenant's domain (fine either
    // way), but the Super Admin console is meant to live on its own
    // operator-only domain (see infra/traefik's SUPER_ADMIN_DOMAIN), which
    // is never itself a registered tenant domain and must not be redirected
    // to /tenant-not-found. Both sections use cookie-based sessions, not
    // the x-tenant-slug header, so skipping resolution here is safe.
    return NextResponse.next();
  }

  const host = normalizeHost(request.headers.get("host") ?? "");

  try {
    const res = await fetch(`${BASE_URL}/internal/tenants/by-domain/${host}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.redirect(new URL("/tenant-not-found", request.url));
    }
    const tenant = (await res.json()) as { slug: string };
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", tenant.slug);
    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.redirect(new URL("/tenant-not-found", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|media/).*)"],
};
