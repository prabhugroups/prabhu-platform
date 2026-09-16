import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { Tenant, TenantContact } from "@/lib/types";
import { SettingsManager } from "./SettingsManager";

export default async function SettingsAdminPage() {
  const session = await requireTenantAdmin();
  const opts = { token: session.token };

  const [tenant, contact] = await Promise.all([
    adminGet<Tenant>(opts, "/admin/tenant"),
    adminGet<TenantContact | null>(opts, "/admin/contact-info"),
  ]);

  return <SettingsManager tenant={tenant} contact={contact} />;
}
