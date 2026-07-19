import React, { useState } from "react";
import InternalHeader from "@/components/lustra/InternalHeader";
import MonthGrid from "@/components/lustra/MonthGrid";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { CONFIRMED_BOOKINGS } from "@/mocks/internal";

const byDate = CONFIRMED_BOOKINGS.reduce((acc, b) => {
  (acc[b.date] = acc[b.date] || []).push(b);
  return acc;
}, {});

export default function AgencyCalendar() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Management"
        title="Agency Calendar"
        subtitle="All confirmed talent bookings and event dates at a glance."
      />
      <div className="w-full px-5 lg:px-8 py-6 space-y-5">
        <Card className="p-4">
          <MonthGrid
            dayStatus={(date, iso) => (byDate[iso] ? "event" : null)}
            dayContent={(_date, iso) => {
              const list = byDate[iso];
              if (!list) return null;
              return (
                <div className="space-y-0.5 mt-0.5">
                  {list.slice(0, 2).map((b) => (
                    <div
                      key={b.id}
                      className="text-[0.5rem] font-body text-rose-gold truncate bg-rose-gold/15 border border-rose-gold/20 rounded-sm px-1 py-0.5 leading-tight"
                      onClick={(e) => { e.stopPropagation(); setSelected(b); }}
                    >
                      {b.talent}
                    </div>
                  ))}
                  {list.length > 2 && <p className="text-[0.5rem] text-muted-grey">+{list.length - 2} more</p>}
                </div>
              );
            }}
          />
        </Card>

        <Card className="p-4">
          <Eyebrow>Confirmed Engagements</Eyebrow>
          <div className="space-y-2 mt-3">
            {CONFIRMED_BOOKINGS.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0 text-left hover:bg-white/[0.02] -mx-2 px-2 rounded-sm transition"
              >
                <div>
                  <p className="font-body text-sm text-ivory">
                    {b.talent} <span className="text-muted-grey">· {b.client}</span>
                  </p>
                  <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">
                    {b.engagement} · {b.city}
                  </p>
                </div>
                <span className="font-heading text-base text-light-rose-gold shrink-0">
                  {new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {selected && (
          <div
            className="fixed inset-0 z-50 bg-noir/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
              <Eyebrow>{new Date(selected.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Eyebrow>
              <p className="font-heading text-2xl text-ivory mt-1">{selected.talent}</p>
              <p className="font-body text-sm text-muted-grey mt-1">{selected.engagement}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-grey">Client</span><span className="text-ivory">{selected.client}</span></div>
                <div className="flex justify-between"><span className="text-muted-grey">City</span><span className="text-ivory">{selected.city}</span></div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="mt-5 w-full text-[0.6rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 rounded-sm py-2.5 hover:bg-rose-gold/10 transition"
              >
                Close
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}