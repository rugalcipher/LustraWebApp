import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { getTalent } from "@/mocks/talent";

const BOOKINGS = [
  {
    id: "b1",
    talentId: "t1",
    engagement: "Art Gallery Visit",
    date: "2026-07-25",
    start: "7:00 PM",
    end: "10:00 PM",
    city: "Manhattan, NYC",
    venue: "Private Gallery · Chelsea",
    amount: 1800,
    status: "Confirmed",
    settlement: "Confirmed Externally",
    manager: "V. Castellan",
  },
  {
    id: "b2",
    talentId: "t4",
    engagement: "Gala Hosting",
    date: "2026-08-02",
    start: "8:00 PM",
    end: "11:30 PM",
    city: "London",
    venue: "The Connaught · Mayfair",
    amount: 2200,
    status: "Proposal Sent",
    settlement: "Instructions Issued",
    manager: "V. Castellan",
  },
  {
    id: "b3",
    talentId: "t2",
    engagement: "Brand Event",
    date: "2026-06-14",
    start: "6:00 PM",
    end: "9:00 PM",
    city: "Paris",
    venue: "Maison Showroom · 8th Arr.",
    amount: 1800,
    status: "Completed",
    settlement: "Confirmed Externally",
    manager: "V. Castellan",
  },
];

const TABS = ["Upcoming", "Completed", "Cancelled"];

export default function Bookings() {
  const [tab, setTab] = useState("Upcoming");

  const filtered = BOOKINGS.filter((b) => {
    if (tab === "Upcoming") return ["Proposal Sent", "Confirmed", "Scheduled"].includes(b.status);
    if (tab === "Completed") return b.status === "Completed";
    return b.status === "Cancelled";
  });

  return (
    <div className="px-5 pt-6">
      <Eyebrow>Your Engagements</Eyebrow>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Bookings</h1>

      {/* Tabs */}
      <div className="flex gap-1 mt-5 border-b border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "pb-3 px-3 text-[0.6rem] tracking-luxe uppercase transition relative font-body",
              tab === t ? "text-rose-gold" : "text-muted-grey hover:text-soft-ivory"
            )}
          >
            {t}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-px bg-rose-gold" />}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings here yet"
          body="Your confirmed and proposed engagements will appear in this calendar."
          action={
            <Link to="/app/discover" className="text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition">
              Discover Talent
            </Link>
          }
        />
      ) : (
        <div className="space-y-3 mt-5">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }) {
  const talent = getTalent(booking.talentId);
  const statusColor = {
    Confirmed: "text-success border-success/30",
    Scheduled: "text-success border-success/30",
    Completed: "text-muted-grey border-muted-grey/30",
    "Proposal Sent": "text-warning border-warning/30",
    Cancelled: "text-error border-error/30",
  };

  return (
    <Link
      to="/app/messages"
      className="block bg-card-black/70 border border-white/[0.06] rounded-lg overflow-hidden hover:border-rose-gold/30 transition group"
    >
      <div className="flex gap-3 p-4">
        {talent && (
          <img src={talent.cover} alt={talent.name} className="w-16 h-16 rounded-md object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading text-lg text-ivory leading-none">{talent?.name}</p>
              <p className="text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey mt-1">{booking.engagement}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-grey group-hover:text-rose-gold transition mt-1" strokeWidth={1.2} />
          </div>

          <div className="grid grid-cols-2 gap-y-1.5 mt-3 text-[0.65rem] font-body text-soft-ivory/75">
            <span className="flex items-center gap-1 text-muted-grey"><Calendar className="w-3 h-3" strokeWidth={1.2} /> {booking.date}</span>
            <span className="flex items-center gap-1 text-muted-grey"><Clock className="w-3 h-3" strokeWidth={1.2} /> {booking.start}</span>
            <span className="flex items-center gap-1 text-muted-grey"><MapPin className="w-3 h-3" strokeWidth={1.2} /> {booking.city}</span>
            <span className="text-light-rose-gold text-right">${booking.amount.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
            <span className={cn("text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", statusColor[booking.status])}>
              {booking.status}
            </span>
            <span className="text-[0.55rem] text-muted-grey">Settlement: {booking.settlement}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}