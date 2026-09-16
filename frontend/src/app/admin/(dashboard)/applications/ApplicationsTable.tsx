"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteApplication, updateApplicationStatus } from "./actions";

interface Application {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  share_type: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const STATUS_STYLE: Record<Application["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleStatusChange(id: number, status: Application["status"]) {
    startTransition(async () => {
      await updateApplicationStatus(id, status);
      router.refresh();
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this application?")) return;
    startTransition(async () => {
      await deleteApplication(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Share Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {applications.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No applications yet.
              </td>
            </tr>
          )}
          {applications.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3">{a.name}</td>
              <td className="px-4 py-3 text-gray-500">{[a.email, a.phone].filter(Boolean).join(" · ")}</td>
              <td className="px-4 py-3">{a.share_type ?? "—"}</td>
              <td className="px-4 py-3">
                <select
                  value={a.status}
                  disabled={pending}
                  onChange={(e) => handleStatusChange(a.id, e.target.value as Application["status"])}
                  className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_STYLE[a.status]}`}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={pending}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
