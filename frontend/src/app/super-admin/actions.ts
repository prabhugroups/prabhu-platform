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
    font_family: string;
    footer_text: string;
    logo_file: string;
    favicon_file: string;
    default_og_image_file: string;
  }>,
) {
  const session = await requireSuperAdmin();
  await adminMutate({ token: session.token }, "PATCH", `/super/tenants/${id}`, data);
  revalidatePath("/super-admin/tenants");
}

const BASE_URL = process.env.INTERNAL_API_URL;

/** Branding-asset upload (logo/favicon/OG image) for a tenant a super_admin
 * is editing — mirrors lib/admin/generic-actions.ts's uploadMedia, but that
 * one always resolves tenant scope from the caller's own tenant_admin
 * session, which doesn't apply here. */
export async function uploadTenantMedia(tenantId: number, formData: FormData): Promise<string> {
  const session = await requireSuperAdmin();
  const res = await fetch(`${BASE_URL}/admin/media/upload?module=branding`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}`, "X-Tenant-Id": String(tenantId) },
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${await res.text()}`);
  }
  const data = (await res.json()) as { path: string };
  return data.path;
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
