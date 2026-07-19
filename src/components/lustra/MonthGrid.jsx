import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const STATUS_BORDER = {
  available: "border-rose-gold/50 bg-rose-gold/10",
  blackout: "border-error/40 bg-error/10",
  event: "border-white/[0.06] bg-card-black/40",
  default: "border-white/[0.06] bg-card-black/40 hover:border-white/15",
};

/**
 * @param {{
 *   dayStatus?: (date: Date, iso: string) => string | undefined;
 *   dayContent?: (date: Date, iso: string) => import("react").ReactNode;
 *   onDayClick?: (date: Date, iso: string) => void;
 * }} props
 */
export default function MonthGrid({ dayStatus, dayContent, onDayClick }) {
  const [cursor, setCursor] = useState(() => new Date(2026, 6, 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const iso = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-heading text-xl text-ivory">
          {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-grey hover:text-rose-gold hover:border-rose-gold/40 transition"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.2} />
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-grey hover:text-rose-gold hover:border-rose-gold/40 transition"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.2} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[0.5rem] tracking-luxe uppercase text-muted-grey py-2">
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dIso = iso(date);
          const status = dayStatus?.(date, dIso);
          return (
            <button
              key={i}
              onClick={() => onDayClick?.(date, dIso)}
              className={cn(
                "min-h-[58px] rounded-sm border text-left p-1.5 transition flex flex-col gap-1 align-top",
                status ? STATUS_BORDER[status] : STATUS_BORDER.default,
                status === "available" && onDayClick ? "cursor-pointer" : onDayClick ? "cursor-pointer" : ""
              )}
            >
              <span
                className={cn(
                  "text-[0.65rem] font-body leading-none",
                  status === "available" ? "text-rose-gold" : status === "blackout" ? "text-error" : "text-soft-ivory/70"
                )}
              >
                {date.getDate()}
              </span>
              {dayContent?.(date, dIso)}
            </button>
          );
        })}
      </div>
    </div>
  );
}