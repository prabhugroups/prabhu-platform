import { adminGet } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/require-session";
import { AdminUsersManager } from "./AdminUsersManager";

interface AdminUser {
  id: number;
  tenant_id: number | null;
  name: string;
  email: string;
  username: string;
  role: "super_admin" | "tenant_admin";
  is_active: boolean;
}

interface TenantOption {
  id: number;
  name: string;
}

export default async function SuperAdminUsersPage() {
  const session = await requireSuperAdmin();
  const [users, tenants] = await Promise.all([
    adminGet<AdminUser[]>({ token: session.token }, "/super/admin-users"),
    adminGet<TenantOption[]>({ token: session.token }, "/super/tenants"),
  ]);
  return <AdminUsersManager users={users} tenants={tenants} />;
}
