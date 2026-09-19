"use client";

import { useMemo, useState } from "react";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const FIELDS: FieldConfig[] = [
  { name: "category", label: "Category", type: "text", required: true },
  { name: "question", label: "Question", type: "text", required: true },
  { name: "answer", label: "Answer", type: "textarea", required: true },
  { name: "sort_order", label: "Sort Order", type: "number" },
];

/** Two-level browsing (category pills -> FAQs in that category) over the
 * flat `faqs` table's free-text `category` column — mirrors the legacy
 * CRM's FAQ Categories + FAQs pattern without needing a separate
 * categories table, since `category` was never a managed lookup there
 * either (see backend app/modules/faqs). */
export function FaqsManager({ items }: { items: ResourceRow[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const cat = item.category as string | null;
      if (cat) set.add(cat);
    }
    return Array.from(set).sort();
  }, [items]);

  const [selected, setSelected] = useState<string>("all");

  const filtered = selected === "all" ? items : items.filter((i) => i.category === selected);

  return (
    <div>
      <ToggleGroup
        type="single"
        variant="outline"
        value={selected}
        onValueChange={(v) => setSelected(v || "all")}
        className="flex-wrap"
      >
        <ToggleGroupItem value="all">All Categories</ToggleGroupItem>
        {categories.map((cat) => (
          <ToggleGroupItem key={cat} value={cat}>
            {cat}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="mt-6">
        <ResourceManager title="FAQs" basePath="/admin/faqs" fields={FIELDS} items={filtered} />
      </div>
    </div>
  );
}
