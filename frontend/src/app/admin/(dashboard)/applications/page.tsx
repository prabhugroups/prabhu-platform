import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ApplicationsTable } from "./ApplicationsTable";

interface Application {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  share_type: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default async function ApplicationsAdminPage() {
  const session = await requireTenantAdmin();
  const applications = await adminGet<Application[]>({ token: session.token }, "/admin/applications");
  return (
    <div>
      <h1 className="text-2xl font-bold">Applications</h1>
      <ApplicationsTable applications={applications} />
    </div>
  );
}
