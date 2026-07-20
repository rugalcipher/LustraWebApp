import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Loader2, MapPin } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { formatBookingDate, formatBookingTime, presentBookingStatus } from "@/services/bookingService";
import { useMyTalentBookings } from "@/features/talent/hooks";

/**
 * MY SCHEDULE — the talent's own appointments.
 *
 * Operational only. The API sends the talent what they need in order to attend and
 * nothing else: no client identity, no money, no settlement state and no internal notes.
 * The full detail, including the confidential address, is one tap away.
 */

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

/** Today in the same YYYY-MM-DD shape the API returns, so string compare is safe. */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

const CLOSED = new Set(["Completed", "Cancelled", "NoShow", "Declined"]);

export default function TalentAppointments() {
  const [tab, setTab] = useState("upcoming");
  const query = useMyTalentBookings();

  const { upcoming, past } = useMemo(() => {
    const today = todayIso();
    const all = query.data ?? [];
    return {
      // An appointment counts as upcoming while it is still open AND not in the past.
      upcoming: all
        .filter((a) => !CLOSED.has(a.status) && (!a.confirmedDate || a.confirmedDate >= today))
        .sort((a, b) => (a.confirmedDate ?? "").localeCompare(b.confirmedDate ?? "")),
      past: all
        .filter((a) => CLOSED.has(a.status) || (a.confirmedDate && a.confirmedDate < today))
        .sort((a, b) => (b.confirmedDate ?? "").localeCompare(a.confirmedDate ?? "")),
    };
  }, [query.data]);

  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title="My Schedule"
        subtitle="Your appointments. Lustra management arranges every engagement on your behalf."
      />

      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <div className="flex gap-1.5">
          {TABS.map((option) => (
            <button
              key={option.id}
              onClick={() => setTab(option.id)}
              className={cn(
                "px-4 py-2 rounded-sm text-[0.6rem] tracking-luxe uppercase border transition",
                tab === option.id
                  ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                  : "border-white/10 text-muted-grey hover:text-ivory hover:border-white/25"
              )}
            >
              {option.label}
              {option.id === "upcoming" && upcoming.length > 0 ? ` (${upcoming.length})` : ""}
            </button>
          ))}
        </div>

        {query.isPending ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : query.isError ? (
          <Card className="p-6">
            <p className="font-body text-sm text-muted-grey">{toUserMessage(query.error)}</p>
          </Card>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={tab === "upcoming" ? "Nothing scheduled" : "No past appointments"}
            body={
              tab === "upcoming"
                ? "Lustra management will confirm your availability before anything is booked."
                : "Completed engagements will appear here."
            }
          />
        ) : (
          <Card className="p-4">
            <div className="space-y-1">
              {rows.map((appointment) => {
                const status = presentBookingStatus(appointment.status);
                return (
                  <Link
                    key={appointment.id}
                    to={`/talent-bookings/${appointment.id}`}
                    className="flex items-center justify-between gap-3 py-3 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-body text-sm text-ivory truncate">
                        {appointment.engagementCategory}
                      </p>
                      <p className="font-body text-[0.65rem] text-muted-grey mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.2} />
                        {[appointment.venueName, appointment.cityName].filter(Boolean).join(" · ") ||
                          "Location to be confirmed"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-heading text-base text-light-rose-gold">
                        {formatBookingDate(appointment.confirmedDate)}
                      </p>
                      <span className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey mt-1 block">
                        {appointment.startTime
                          ? `${formatBookingTime(appointment.startTime)} · ${status.label}`
                          : status.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
