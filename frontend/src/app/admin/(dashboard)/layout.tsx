import { requireTenantAdmin } from "@/lib/require-session";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireTenantAdmin(); // redirects to /admin/login (or /super-admin) if not a signed-in tenant_admin

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
