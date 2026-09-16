import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "type", label: "Type", type: "text", required: true },
  { name: "file", label: "Image", type: "media", mediaModule: "portfolios" },
  { name: "sort_order", label: "Sort Order", type: "number" },
];

export default async function PortfolioAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/portfolios");
  return <ResourceManager title="Portfolio" basePath="/admin/portfolios" fields={FIELDS} items={items} />;
}
