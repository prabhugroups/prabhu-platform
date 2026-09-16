import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { ContentSetting } from "@/lib/types";
import { SettingsManager } from "./SettingsManager";

export default async function SettingsAdminPage() {
  const session = await requireTenantAdmin();
  const items = await adminGet<ContentSetting[]>({ token: session.token }, "/admin/settings");
  return <SettingsManager items={items} />;
}
