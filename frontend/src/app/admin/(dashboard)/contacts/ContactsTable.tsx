"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteContact } from "./actions";

interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  created_at: string;
}

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: number) {
    if (!confirm("Delete this submission?")) return;
    startTransition(async () => {
      await deleteContact(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-3">
      {contacts.length === 0 && <p className="text-gray-500">No submissions yet.</p>}
      {contacts.map((c) => (
        <div key={c.id} className="rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">
                {c.name} {c.subject && <span className="font-normal text-gray-500">— {c.subject}</span>}
              </p>
              <p className="text-sm text-gray-500">
                {[c.email, c.phone].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              disabled={pending}
              className="rounded p-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
          {c.message && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{c.message}</p>}
          <p className="mt-2 text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
