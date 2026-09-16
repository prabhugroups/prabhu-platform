import { adminGet } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/require-session";
import { TenantManager } from "./TenantManager";
import type { Tenant } from "@/lib/types";

interface TenantWithDomains extends Tenant {
  id: number;
  is_active: boolean;
  domains: { id: number; hostname: string; is_primary: boolean }[];
}

export default async function SuperAdminTenantsPage() {
  const session = await requireSuperAdmin();
  const tenants = await adminGet<TenantWithDomains[]>({ token: session.token }, "/super/tenants");
  return <TenantManager tenants={tenants} />;
}
