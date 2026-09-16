import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { AboutPageData } from "@/lib/types";
import { AboutDataManager } from "./AboutDataManager";

export default async function AboutDataAdminPage() {
  const session = await requireTenantAdmin();
  const pages = await adminGet<AboutPageData[]>({ token: session.token }, "/admin/about-pages");
  return <AboutDataManager pages={pages} />;
}
