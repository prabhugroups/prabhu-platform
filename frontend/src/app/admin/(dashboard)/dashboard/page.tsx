import { adminGet } from "@/lib/api";
import { requireTenantAdmin } from "@/lib/require-session";

interface Summary {
  tenant: string;
  contacts: number;
  applications: number;
  pending_applications: number;
  documents: number;
  galleries: number;
  portfolios: number;
  team_members: number;
}

export default async function AdminDashboardPage() {
  const session = await requireTenantAdmin();
  const summary = await adminGet<Summary>({ token: session.token }, "/admin/dashboard/summary");

  const cards = [
    { label: "Contact Submissions", value: summary.contacts },
    { label: "Applications", value: summary.applications },
    { label: "Pending Applications", value: summary.pending_applications },
    { label: "Documents", value: summary.documents },
    { label: "Galleries", value: summary.galleries },
    { label: "Portfolio Items", value: summary.portfolios },
    { label: "Team Members", value: summary.team_members },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">{summary.tenant} — Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-white p-5">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
