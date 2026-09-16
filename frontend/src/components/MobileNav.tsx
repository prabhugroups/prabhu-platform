"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import type { SiteNavItem } from "@/lib/site-nav";

/** Full-screen slide-in mobile menu with accordion sub-dropdowns — ported
 * from prabhucablecar-web's Navbar.tsx mobile menu. */
export function MobileNav({
  items,
  showApplyOnline,
}: {
  items: SiteNavItem[];
  showApplyOnline: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  function handleItemClick(item: SiteNavItem) {
    if (item.dropdown) {
      setOpenDropdown(openDropdown === item.name ? null : item.name);
    } else {
      setOpen(false);
      router.push(item.path);
    }
  }

  return (
    <div className="lg:hidden">
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(true)}
        className="cursor-pointer text-primary"
      >
        <Menu size={24} />
      </button>

      <div
        className={`fixed inset-0 z-50 bg-white/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      >
        <div
          className={`fixed left-0 top-0 h-full w-full max-w-sm transform bg-white transition-transform duration-300 ease-in-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full w-[100vw] flex-col overflow-y-auto">
            <div className="flex items-center justify-end p-4">
              <button aria-label="Close menu" className="text-gray-500 hover:text-primary" onClick={() => setOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col items-center py-4">
              {items.map((item) => (
                <div key={item.name} className="w-full border-gray-100">
                  <div
                    className="flex cursor-pointer items-center justify-between px-6 py-4 text-primary"
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="font-medium">{item.name}</span>
                    {item.dropdown &&
                      (openDropdown === item.name ? (
                        <ChevronDown size={20} className="rotate-180 transform transition-transform duration-300" />
                      ) : (
                        <ChevronRight size={20} className="transition-transform duration-300" />
                      ))}
                  </div>

                  {item.dropdown && openDropdown === item.name && (
                    <div className="bg-gray-50 py-2 pl-8 pr-4">
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.name}
                          href={sub.path}
                          className="block py-3 text-gray-700 hover:text-primary"
                          onClick={() => setOpen(false)}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showApplyOnline && (
              <div className="mt-auto p-6">
                <button
                  className="w-full rounded-sm bg-primary py-3 font-medium text-white"
                  onClick={() => {
                    setOpen(false);
                    router.push("/request-share");
                  }}
                >
                  Apply Online
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
