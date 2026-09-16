import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { Popup } from "@/lib/types";
import { PopupsManager } from "./PopupsManager";

export default async function PopupsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<Popup[]>({ token: session.token }, "/admin/popups");
  return <PopupsManager popups={items} />;
}
