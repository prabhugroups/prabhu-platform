import { publicGet, mediaUrl } from "@/lib/api";
import { getTenantSlug } from "@/lib/get-tenant";
import type { DocumentItem } from "@/lib/types";
import { FileText } from "lucide-react";

export async function DocumentsList({ title, type }: { title: string; type: string }) {
  const slug = await getTenantSlug();
  const documents = await publicGet<DocumentItem[]>(slug, "/documents");
  const filtered = documents.filter((d) => d.type === type);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">{title}</h1>

      {filtered.length === 0 && <p className="mt-6 text-gray-500">Nothing published yet.</p>}

      <ul className="mt-8 divide-y rounded-lg border bg-white">
        {filtered.map((doc) => {
          const href = mediaUrl(doc.file);
          return (
            <li key={doc.id}>
              <a
                href={href ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50"
              >
                <FileText className="shrink-0 text-primary" size={20} />
                <span className="flex-1">
                  <span className="block font-medium">{doc.title}</span>
                  {doc.date && <span className="text-sm text-gray-500">{doc.date}</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
