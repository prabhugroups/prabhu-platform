import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { ResourceRow } from "@/lib/admin/field-types";
import { FaqsManager } from "./FaqsManager";

export default async function FaqsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ResourceRow[]>({ token: session.token }, "/admin/faqs");
  return <FaqsManager items={items} />;
}
