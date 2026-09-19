import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import type { Tenant } from "@/lib/types";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTenantAdmin(); // redirects to /admin/login (or /super-admin) if not a signed-in tenant_admin
  const tenant = await adminGet<Tenant>({ token: session.token }, "/admin/tenant");

  // Same mechanism as app/(site)/layout.tsx — the admin CMS otherwise never
  // picks up the tenant's own branding and stays on the static globals.css
  // fallback color, even when Settings > Theme has customized it.
  const themeStyle = `:root {
    --color-primary: ${tenant.primary_color};
    --color-secondary: ${tenant.secondary_color};
    --color-primary-light: ${tenant.primary_light_color};
  }`;

  return (
    <div className="flex min-h-screen bg-muted">
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="w-full px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
