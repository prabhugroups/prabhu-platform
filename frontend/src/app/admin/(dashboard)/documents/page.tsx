import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "type", label: "Type (notice/legal)", type: "text", required: true },
  { name: "file", label: "File", type: "media", mediaModule: "documents" },
  { name: "date", label: "Date", type: "date" },
];

export default async function DocumentsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/documents");
  return <ResourceManager title="Documents" basePath="/admin/documents" fields={FIELDS} items={items} />;
}
