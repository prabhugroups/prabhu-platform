import { requireSuperAdmin } from "@/lib/require-session";
import { SuperAdminSidebar } from "./SuperAdminSidebar";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="flex min-h-screen bg-muted">
      <SuperAdminSidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="w-full px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
