import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  { name: "type", label: "Type (director/management)", type: "text", required: true },
  { name: "image", label: "Photo", type: "media", mediaModule: "teams" },
  {
    name: "additional_info",
    label: 'Details (JSON, e.g. {"name":"Jane Doe","title":"Chairperson"})',
    type: "json",
  },
  { name: "sort_order", label: "Sort Order", type: "number" },
];

export default async function TeamsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/teams");
  return <ResourceManager title="Team Members" basePath="/admin/teams" fields={FIELDS} items={items} />;
}
