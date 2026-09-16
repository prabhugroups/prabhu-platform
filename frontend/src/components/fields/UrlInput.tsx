"use client";

import { useState } from "react";

function stripHttps(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

function ensureHttps(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** URL field that normalizes to a full https:// URL on blur while
 * displaying it without the scheme prefix while typing — ported from
 * prabhucablecar-web's fields/URLInput.tsx. */
export function UrlInput({
  name,
  label,
  initialValue,
  placeholder,
}: {
  name: string;
  label?: string;
  initialValue: string | null;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(stripHttps(initialValue ?? ""));
  const [submitValue, setSubmitValue] = useState(initialValue ?? "");

  function handleBlur() {
    const trimmed = display.trim();
    const normalized = trimmed ? ensureHttps(trimmed) : "";
    setSubmitValue(normalized);
    setDisplay(stripHttps(normalized));
  }

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
      <input type="hidden" name={name} value={submitValue} readOnly />
      <input
        type="text"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-4 py-[9px] focus:border-2 focus:border-primary/70 focus:outline-none"
      />
    </div>
  );
}
