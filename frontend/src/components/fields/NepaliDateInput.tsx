"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import NepaliDate from "nepali-datetime";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const NEPALI_MONTHS = [
  "Baishakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

const NEPALI_DAYS = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];

function isValidNepaliDate(value: string): boolean {
  try {
    new NepaliDate(value);
    return true;
  } catch {
    return false;
  }
}

function formatNepaliDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseNepaliDate(value: string): { year: number; month: number; day: number } | null {
  if (!value) return null;
  try {
    const d = new NepaliDate(value);
    return { year: d.getYear(), month: d.getMonth(), day: d.getDate() };
  } catch {
    return null;
  }
}

/** BS calendar date picker — ported from prabhucablecar-web's
 * fields/NepaliDatePicker.tsx, adapted to plain controlled input state
 * (name + value) instead of Formik. */
export function NepaliDateInput({
  name,
  label,
  initialValue,
}: {
  name: string;
  label?: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const today = new NepaliDate();
  const [viewYear, setViewYear] = useState(today.getYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectDate(day: number) {
    const formatted = formatNepaliDate(viewYear, viewMonth, day);
    setValue(formatted);
    setError(null);
    setShowCalendar(false);
  }

  function handleBlur() {
    if (!value) return;
    if (!isValidNepaliDate(value)) {
      setError("Invalid Nepali date format. Use YYYY-MM-DD format.");
      return;
    }
    setError(null);
    const formatted = new NepaliDate(value).format("YYYY-MM-DD");
    setValue(formatted);
    const parsed = parseNepaliDate(formatted);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }

  function goToToday() {
    const now = new NepaliDate();
    setViewYear(now.getYear());
    setViewMonth(now.getMonth());
    setValue(now.format("YYYY-MM-DD"));
    setShowCalendar(false);
  }

  const selected = parseNepaliDate(value);
  const daysInMonth = NepaliDate.getDaysOfMonth(viewYear, viewMonth);
  const firstDay = new NepaliDate(viewYear, viewMonth, 1).getDay();
  const todayFormatted = today.format("YYYY-MM-DD");

  return (
    <div>
      {label && <Label className="mb-1.5">{label}</Label>}
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="YYYY-MM-DD (e.g., 2081-03-15)"
          className={cn(
            "border-input flex h-8 w-full min-w-0 rounded-lg border bg-transparent px-3 py-2 pr-12 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            error && "border-destructive focus-visible:ring-destructive/20",
          )}
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => setShowCalendar((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100"
        >
          <Calendar className="h-5 w-5 text-gray-500" />
        </button>

        {showCalendar && (
          <div
            ref={calendarRef}
            className="absolute z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">{value || "No date selected"}</span>
              <button type="button" onClick={() => setShowCalendar(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center text-lg font-semibold">{viewYear}</div>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => (viewMonth === 0 ? (setViewMonth(11), setViewYear((y) => y - 1)) : setViewMonth((m) => m - 1))}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center font-medium text-lg">{NEPALI_MONTHS[viewMonth]}</div>
              <button
                type="button"
                onClick={() => (viewMonth === 11 ? (setViewMonth(0), setViewYear((y) => y + 1)) : setViewMonth((m) => m + 1))}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1">
              {NEPALI_DAYS.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-medium text-gray-600">
                  {d}
                </div>
              ))}
            </div>
            <div className="mb-4 grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isSelected =
                  selected && selected.year === viewYear && selected.month === viewMonth && selected.day === day;
                const isToday = todayFormatted === formatNepaliDate(viewYear, viewMonth, day);
                return (
                  <div
                    key={day}
                    onClick={() => selectDate(day)}
                    className={`mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-center text-sm transition-colors hover:bg-blue-100 ${
                      isSelected ? "bg-blue-500 text-white hover:bg-blue-600" : isToday ? "bg-blue-100 font-semibold text-blue-600" : ""
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={goToToday}
                className="rounded px-3 py-1 text-sm font-medium text-blue-500 hover:bg-blue-50 hover:text-blue-700"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
