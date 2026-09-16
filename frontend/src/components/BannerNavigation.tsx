"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  name: string;
  path: string;
}

/** Pill sub-nav used under a page's title (About subpages etc.) — ported
 * from prabhucablecar-web's BannerNavigation.tsx. Not wired into any route
 * yet (that's Phase 2's About subpages); built now since it's cheap and
 * shared. */
export function BannerNavigation({
  title,
  items,
  className = "",
}: {
  title: string;
  items: NavigationItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={`mx-auto w-[98vw] rounded-xl bg-blue-50 py-8 ${className}`}>
      <div className="flex flex-col items-center gap-8 px-4">
        <h1>{title}</h1>
        <div className="flex flex-wrap justify-center gap-1 md:gap-2">
          {items.map((item) => {
            const isExactMatchOnly = item.path.split("/").length === 2;
            const isActive = isExactMatchOnly
              ? pathname === item.path
              : pathname === item.path || pathname?.startsWith(`${item.path}/`);

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`rounded-md px-4 py-2 text-sm font-medium transition duration-200 ${
                  isActive ? "bg-primary text-white" : "bg-white text-primary hover:bg-blue-100"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
