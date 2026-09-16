"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { mediaUrl } from "@/lib/media-url-client";
import { deleteApplication, updateApplicationStatus } from "./actions";

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

const STATUS_STYLE: Record<Application["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [zipping, setZipping] = useState<number | null>(null);
  const [shareTypeFilter, setShareTypeFilter] = useState<string | "all">("all");

  const shareTypes = useMemo(() => {
    const set = new Set<string>();
    for (const a of applications) if (a.share_type) set.add(a.share_type);
    return Array.from(set).sort();
  }, [applications]);

  const filtered =
    shareTypeFilter === "all" ? applications : applications.filter((a) => a.share_type === shareTypeFilter);

  async function handleExportZip(app: Application) {
    const files: { label: string; path: string | null }[] = [
      { label: "citizenship", path: app.citizenship_file },
      { label: "bank-deposit", path: app.bank_deposit_file },
      { label: "request-form", path: app.request_form_file },
    ];
    const available = files.filter((f): f is { label: string; path: string } => Boolean(f.path));
    if (available.length === 0) {
      alert("No documents uploaded for this application.");
      return;
    }
    setZipping(app.id);
    try {
      const zip = new JSZip();
      for (const f of available) {
        const url = mediaUrl(f.path);
        if (!url) continue;
        const res = await fetch(url);
        const blob = await res.blob();
        const extension = f.path.split(".").pop() ?? "bin";
        zip.file(`${f.label}.${extension}`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${app.name.replace(/\s+/g, "-")}-documents.zip`);
    } finally {
      setZipping(null);
    }
  }

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
    <div className="mt-6">
      {shareTypes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShareTypeFilter("all")}
            className={shareTypeFilter === "all" ? "active-button" : "inactive-button"}
          >
            All Share Types
          </button>
          {shareTypes.map((t) => (
            <button
              key={t}
              onClick={() => setShareTypeFilter(t)}
              className={shareTypeFilter === t ? "active-button" : "inactive-button"}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border bg-white">
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
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No applications yet.
              </td>
            </tr>
          )}
          {filtered.map((a) => (
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
                  onClick={() => handleExportZip(a)}
                  disabled={zipping === a.id}
                  title="Download documents as ZIP"
                  className="mr-2 rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                >
                  <Download size={15} />
                </button>
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
    </div>
  );
}
