import React, { useState } from "react";
import InternalHeader from "@/components/lustra/InternalHeader";
import MonthGrid from "@/components/lustra/MonthGrid";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";

export default function TalentAvailability() {
  const [mode, setMode] = useState("available");
  const [available, setAvailable] = useState(new Set(["2026-07-22", "2026-07-23", "2026-07-28", "2026-07-29", "2026-07-30"]));
  const [blackout, setBlackout] = useState(new Set(["2026-07-15", "2026-07-16", "2026-08-10"]));

  const toggle = (date, iso) => {
    if (mode === "available") {
      setBlackout((b) => { const n = new Set(b); n.delete(iso); return n; });
      setAvailable((prev) => {
        const n = new Set(prev);
        n.has(iso) ? n.delete(iso) : n.add(iso);
        return n;
      });
    } else {
      setAvailable((a) => { const n = new Set(a); n.delete(iso); return n; });
      setBlackout((prev) => {
        const n = new Set(prev);
        n.has(iso) ? n.delete(iso) : n.add(iso);
        return n;
      });
    }
  };

  const dayStatus = (_date, iso) => {
    if (blackout.has(iso)) return "blackout";
    if (available.has(iso)) return "available";
    return null;
  };

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title="Availability Calendar"
        subtitle="Mark available dates and blackout periods for management review."
      />
      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <div className="flex items-center gap-2">
          {[
            { id: "available", label: "Available", cls: "border-rose-gold/50 text-rose-gold bg-rose-gold/10" },
            { id: "blackout", label: "Blackout", cls: "border-error/40 text-error bg-error/10" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 py-2.5 rounded-sm border text-[0.6rem] tracking-luxe uppercase font-body transition",
                mode === m.id ? m.cls : "border-white/10 text-muted-grey hover:text-soft-ivory"
              )}
            >
              {m.label} mode
            </button>
          ))}
        </div>

        <Card className="p-4">
          <MonthGrid dayStatus={dayStatus} onDayClick={toggle} />
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
            <span className="inline-flex items-center gap-1.5 text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-gold/30 border border-rose-gold/50" /> Available ({available.size})
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
              <span className="w-2.5 h-2.5 rounded-sm bg-error/20 border border-error/40" /> Blackout ({blackout.size})
            </span>
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Management Review</Eyebrow>
          <p className="font-body text-sm text-soft-ivory/80 mt-2 leading-relaxed">
            Your availability syncs live to the concierge console. Inquiries are only matched against dates you've marked available.
          </p>
        </Card>
      </div>
    </div>
  );
}