import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "link", label: "Link", type: "url" },
  { name: "file", label: "Image", type: "media", mediaModule: "banner", required: true },
  { name: "sort_order", label: "Sort Order", type: "number" },
];

export default async function BannersAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/banners");
  return <ResourceManager title="Banner" basePath="/admin/banners" fields={FIELDS} items={items} />;
}
