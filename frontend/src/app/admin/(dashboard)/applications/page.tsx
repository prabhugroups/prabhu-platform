import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";
import { ApplicationsTable } from "./ApplicationsTable";

interface Application {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  citizenship_file: string | null;
  bank_deposit_file: string | null;
  request_form_file: string | null;
  share_type: string | null;
  pan: string | null;
  nid: string | null;
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
