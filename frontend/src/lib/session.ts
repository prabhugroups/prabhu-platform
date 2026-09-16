import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";

// role/tenantId here are only a UI convenience (which nav to render) — they
// are never the security boundary. Every admin API call sends `token`
// (the signed JWT) and FastAPI re-derives role/tenant_id from it server-side
// on every request (see backend app/core/deps.py:get_tenant_scope); a
// tampered cookie can't grant access the JWT itself doesn't already grant.

export interface Session {
  token: string;
  role: "super_admin" | "tenant_admin";
  tenantId: number | null;
}

export async function setSessionCookie(token: string, role: string, tenantId: number | null) {
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify({ token, role, tenantId }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // matches backend JWT_EXPIRES_MINUTES default
    },
  );
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
