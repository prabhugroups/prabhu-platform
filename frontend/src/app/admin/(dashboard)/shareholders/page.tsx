import { adminGet, ApiError } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";

const FIELDS: FieldConfig[] = [
  { name: "name_en", label: "Full Name (English)", type: "text", required: true },
  { name: "name_np", label: "Full Name (Nepali)", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "mobile", label: "Mobile", type: "text" },
  { name: "pan", label: "PAN Number", type: "text" },
  { name: "father_name", label: "Father's Name", type: "text" },
  { name: "grandfather_name", label: "Grandfather's Name", type: "text" },
  { name: "shareholder_number", label: "Shareholder Number", type: "text" },
  { name: "share_certificate_number", label: "Share Certificate Number", type: "text" },
  { name: "share_number", label: "Share Number", type: "text" },
  { name: "share_amount", label: "Share Amount", type: "number" },
];

async function fetchShareholders(token: string): Promise<ResourceRow[] | "module_disabled"> {
  try {
    return await adminGet<ResourceRow[]>({ token }, "/admin/shareholders");
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return "module_disabled";
    }
    throw e;
  }
}

export default async function ShareholdersAdminPage() {
  const session = await requireTenantAdmin();
  const items = await fetchShareholders(session.token);

  if (items === "module_disabled") {
    return (
      <div>
        <h1 className="text-2xl font-bold">Shareholders</h1>
        <p className="mt-4 text-gray-500">
          The shareholder registry module isn&apos;t enabled for this tenant. Contact your Super Admin to
          enable it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Core registry fields shown here. Citizenship, bank/demat, address, and nominee records for each
        shareholder are managed via the API (see docs/ARCHITECTURE.md) and can be surfaced here as a
        follow-up.
      </p>
      <ResourceManager title="Shareholders" basePath="/admin/shareholders" fields={FIELDS} items={items} />
    </div>
  );
}
