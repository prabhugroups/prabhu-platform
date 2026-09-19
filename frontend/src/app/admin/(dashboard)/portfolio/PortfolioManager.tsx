"use client";

import { useMemo, useState } from "react";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { FieldConfig, ResourceRow } from "@/lib/admin/field-types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const FIELDS: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "type", label: "Type", type: "text", required: true },
  { name: "file", label: "Image", type: "media", mediaModule: "portfolios" },
  { name: "sort_order", label: "Sort Order", type: "number" },
];

/** Type-filter pills over the flat `portfolios` table's free-text `type`
 * column — mirrors the legacy CRM's portfolio type-filter pattern. New
 * types are created inline simply by typing a new value into the Type
 * field on a new portfolio item (matching legacy's own free-text type
 * column, which likewise had no separate types table). */
export function PortfolioManager({ items }: { items: ResourceRow[] }) {
  const types = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const t = item.type as string | null;
      if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [items]);

  const [selected, setSelected] = useState<string>("all");
  const filtered = selected === "all" ? items : items.filter((i) => i.type === selected);

  return (
    <div>
      <ToggleGroup
        type="single"
        variant="outline"
        value={selected}
        onValueChange={(v) => setSelected(v || "all")}
        className="flex-wrap"
      >
        <ToggleGroupItem value="all">All Types</ToggleGroupItem>
        {types.map((t) => (
          <ToggleGroupItem key={t} value={t}>
            {t}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="mt-6">
        <ResourceManager title="Portfolio" basePath="/admin/portfolios" fields={FIELDS} items={filtered} />
      </div>
    </div>
  );
}
