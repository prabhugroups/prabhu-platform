"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/types";

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<number | null>(faqs[0]?.id ?? null);

  return (
    <div className="divide-y rounded-lg border bg-white">
      {faqs.map((faq) => {
        const open = openId === faq.id;
        return (
          <div key={faq.id}>
            <button
              onClick={() => setOpenId(open ? null : faq.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left font-medium"
            >
              {faq.question}
              <ChevronDown className={`shrink-0 transition ${open ? "rotate-180" : ""}`} size={18} />
            </button>
            {open && <div className="px-5 pb-4 text-gray-600 whitespace-pre-line">{faq.answer}</div>}
          </div>
        );
      })}
    </div>
  );
}
