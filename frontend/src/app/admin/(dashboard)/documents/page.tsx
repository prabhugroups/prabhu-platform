import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/lib/document-categories";

const FIELDS: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", required: true },
  {
    name: "type",
    label: "Category",
    type: "select",
    options: [...DOCUMENT_CATEGORIES],
    optionLabels: DOCUMENT_CATEGORY_LABELS,
    required: true,
  },
  { name: "file", label: "File", type: "media", mediaModule: "documents" },
  { name: "date", label: "Date (B.S.)", type: "nepali-date" },
];

export default async function DocumentsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/documents");
  return <ResourceManager title="Documents & Notice" basePath="/admin/documents" fields={FIELDS} items={items} />;
}
