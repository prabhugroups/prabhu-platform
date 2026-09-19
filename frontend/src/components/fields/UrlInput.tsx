"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      {label && <Label className="mb-1.5">{label}</Label>}
      <input type="hidden" name={name} value={submitValue} readOnly />
      <Input
        type="text"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
    </div>
  );
}
