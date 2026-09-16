import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { HomeContentData, Spokesperson } from "@/lib/types";
import type { ResourceRow } from "@/lib/admin/field-types";
import { HomeDataManager } from "./HomeDataManager";

export default async function HomeDataAdminPage() {
  const session = await requireTenantAdmin();
  const opts = { token: session.token };

  const [about, spokesperson, stakeholders, associates] = await Promise.all([
    adminGet<HomeContentData | null>(opts, "/admin/home-content/about"),
    adminGet<Spokesperson | null>(opts, "/admin/home-content/spokesperson"),
    adminGet<ResourceRow[]>(opts, "/admin/home-content/stakeholders"),
    adminGet<ResourceRow[]>(opts, "/admin/home-content/associates"),
  ]);

  return (
    <HomeDataManager
      about={about}
      spokesperson={spokesperson}
      stakeholders={stakeholders}
      associates={associates}
    />
  );
}
