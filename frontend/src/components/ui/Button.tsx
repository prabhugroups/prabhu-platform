import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

/** Pill CTA with a white circular arrow icon that rotates on hover — ported
 * from prabhucablecar-web's ui/Button.tsx. */
export function Button({
  children,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex-center w-fit cursor-pointer gap-2 rounded-full bg-primary py-2 px-3 font-normal group md:py-3 md:font-bold"
    >
      <span className="text-xs text-white md:text-base">{children}</span>
      <div className="flex-center rounded-full bg-white p-1">
        <ArrowUpRight
          size={16}
          className="transform transition-transform duration-200 group-hover:rotate-45"
        />
      </div>
    </button>
  );
}
