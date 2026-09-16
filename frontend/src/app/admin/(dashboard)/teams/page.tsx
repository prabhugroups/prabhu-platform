import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  {
    name: "type",
    label: "Type",
    type: "select",
    options: ["director", "management"],
    optionLabels: { director: "Board of Directors", management: "Management Team" },
    required: true,
  },
  { name: "image", label: "Photo", type: "media", mediaModule: "teams" },
  { name: "name", label: "Name", type: "text", required: true },
  { name: "role", label: "Role", type: "text" },
  { name: "company_name", label: "Company Name", type: "text" },
  { name: "sort_order", label: "Sort Order", type: "number" },
];

export default async function TeamsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/teams");
  return <ResourceManager title="Team" basePath="/admin/teams" fields={FIELDS} items={items} />;
}
