"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/lib/types";

export function MobileNav({ items }: { items: (NavItem & { children: NavItem[] })[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b bg-white shadow-lg">
          <nav className="flex flex-col gap-1 p-4">
            {items.map((item) => (
              <div key={item.id}>
                <Link
                  href={item.url}
                  onClick={() => setOpen(false)}
                  className="block rounded px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  {item.label}
                </Link>
                {item.children.map((child) => (
                  <Link
                    key={child.id}
                    href={child.url}
                    onClick={() => setOpen(false)}
                    className="block rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
