import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "@/lib/session";

export async function requireTenantAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role === "super_admin") {
    // The tenant CMS is scoped to one tenant by design; a super_admin
    // manages tenants from /super-admin instead of impersonating one here.
    redirect("/super-admin/tenants");
  }
  return session;
}

export async function requireSuperAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session || session.role !== "super_admin") redirect("/admin/login");
  return session;
}
