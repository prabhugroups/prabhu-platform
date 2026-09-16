import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  { name: "image", label: "Image", type: "media", mediaModule: "popups", required: true },
  { name: "status", label: "Active", type: "checkbox" },
];

export default async function PopupsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/popups");
  return <ResourceManager title="Popups" basePath="/admin/popups" fields={FIELDS} items={items} />;
}
