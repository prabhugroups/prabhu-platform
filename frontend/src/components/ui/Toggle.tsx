"use client";

import { useState } from "react";

/** Switch-styled checkbox — a real `<input type="checkbox" name=...>` under
 * the hood so it submits via native FormData like ResourceManager's plain
 * "checkbox" field type does, just styled as a pill switch. Ported visually
 * from prabhucablecar-web's ui/Toggle.tsx (that version was controlled via
 * Formik `value`/`onChange`; this one is uncontrolled + form-name based to
 * match this platform's form pattern). */
export function Toggle({
  name,
  label,
  initialChecked = false,
}: {
  name: string;
  label?: string;
  initialChecked?: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);

  return (
    <label className="flex items-center gap-3">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <span className="relative inline-flex h-6 w-11 items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`h-6 w-11 rounded-full transition-colors duration-300 ease-in-out ${
            checked ? "bg-primary" : "bg-gray-200"
          }`}
        />
        <span
          className={`absolute left-1 h-4 w-4 rounded-full bg-white transition-transform duration-300 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}
