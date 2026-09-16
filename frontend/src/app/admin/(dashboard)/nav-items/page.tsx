import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  { name: "location", label: "Location", type: "select", options: ["header", "footer"], required: true },
  { name: "label", label: "Label", type: "text", required: true },
  { name: "url", label: "URL", type: "text", required: true },
  { name: "parent_id", label: "Parent Item ID (blank for top-level)", type: "number" },
  { name: "sort_order", label: "Sort Order", type: "number" },
  { name: "is_external", label: "Opens in new tab", type: "checkbox" },
];

export default async function NavItemsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/nav-items");
  return <ResourceManager title="Navigation" basePath="/admin/nav-items" fields={FIELDS} items={items} />;
}
