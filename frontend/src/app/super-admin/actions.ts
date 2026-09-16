"use server";

import { revalidatePath } from "next/cache";
import { adminMutate } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/require-session";

export async function createTenant(data: {
  slug: string;
  name: string;
  shareholder_module_enabled: boolean;
  domains: { hostname: string; is_primary: boolean }[];
}) {
  const session = await requireSuperAdmin();
  await adminMutate({ token: session.token }, "POST", "/super/tenants", data);
  revalidatePath("/super-admin/tenants");
}

export async function updateTenant(
  id: number,
  data: Partial<{
    name: string;
    is_active: boolean;
    shareholder_module_enabled: boolean;
    primary_color: string;
    secondary_color: string;
    primary_light_color: string;
    footer_text: string;
  }>,
) {
  const session = await requireSuperAdmin();
  await adminMutate({ token: session.token }, "PATCH", `/super/tenants/${id}`, data);
  revalidatePath("/super-admin/tenants");
}

export async function addTenantDomain(tenantId: number, hostname: string, isPrimary: boolean) {
  const session = await requireSuperAdmin();
  await adminMutate({ token: session.token }, "POST", `/super/tenants/${tenantId}/domains`, {
    hostname,
    is_primary: isPrimary,
  });
  revalidatePath("/super-admin/tenants");
}

export async function removeTenantDomain(tenantId: number, domainId: number) {
  const session = await requireSuperAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/super/tenants/${tenantId}/domains/${domainId}`);
  revalidatePath("/super-admin/tenants");
}

export async function createAdminUser(data: {
  tenant_id: number | null;
  name: string;
  email: string;
  username: string;
  password: string;
  role: "super_admin" | "tenant_admin";
}) {
  const session = await requireSuperAdmin();
  await adminMutate({ token: session.token }, "POST", "/super/admin-users", data);
  revalidatePath("/super-admin/admin-users");
}

export async function deactivateAdminUser(id: number) {
  const session = await requireSuperAdmin();
  await adminMutate({ token: session.token }, "DELETE", `/super/admin-users/${id}`);
  revalidatePath("/super-admin/admin-users");
}
