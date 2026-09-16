import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { PageSeo } from "@/lib/types";
import { SeoManager } from "./SeoManager";

export default async function SeoAdminPage() {
  const session = await requireTenantAdmin();
  const pages = await adminGet<PageSeo[]>({ token: session.token }, "/admin/page-seo");
  return <SeoManager pages={pages} />;
}
