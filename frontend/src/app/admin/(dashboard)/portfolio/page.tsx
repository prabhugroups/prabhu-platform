import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { ResourceRow } from "@/lib/admin/field-types";
import { PortfolioManager } from "./PortfolioManager";

export default async function PortfolioAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/portfolios");
  return <PortfolioManager items={items} />;
}
