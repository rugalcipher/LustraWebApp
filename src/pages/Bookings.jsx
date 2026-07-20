import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ChevronRight, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { toUserMessage } from "@/api/problemDetails";
import { formatRate } from "@/domain/talent";
import { presentBookingStatus, formatBookingDate as formatDate } from "@/services/bookingService";
import { presentProposalStatus, proposalAmount } from "@/services/proposalService";
import { useBookingsByTab } from "@/features/bookings/hooks";
import { useMyProposals } from "@/features/proposals/hooks";

/**
 * The client's engagements: proposals awaiting their response, then confirmed bookings.
 *
 * Proposals lead because they are the only thing here the client can ACT on. A booking is
 * confirmed by management, so this screen reports rather than negotiates.
 */
const TABS = ["Upcoming", "Completed", "Cancelled"];

export default function Bookings() {
  const [tab, setTab] = useState("Upcoming");
  const { tabs, isPending, isError, error } = useBookingsByTab();
  const { data: proposals } = useMyProposals();

  // Only proposals still open are worth surfacing here; resolved ones live on the
  // inquiry they belong to, and repeating them would read like duplicate bookings.
  const openProposals = (proposals ?? []).filter((p) => p.status === "Sent");
  const list = tabs[tab] ?? [];

  return (
    <div className="px-5 pt-6 pb-8">
      <Eyebrow>Your Engagements</Eyebrow>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Bookings</h1>

      {openProposals.length > 0 && (
        <div className="mt-6">
          <Eyebrow>Awaiting your response</Eyebrow>
          <div className="space-y-2.5 mt-3">
            {openProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 mt-6 border-b border-white/[0.06]">
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
            {tabs[t]?.length > 0 && (
              <span className="ml-1.5 text-muted-grey/70">{tabs[t].length}</span>
            )}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-px bg-rose-gold" />}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : isError ? (
        <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={tab === "Upcoming" ? "No bookings yet" : `Nothing ${tab.toLowerCase()}`}
          body={
            tab === "Upcoming"
              ? "Once Management confirms an engagement, it appears here with its full details."
              : `You have no ${tab.toLowerCase()} engagements.`
          }
          action={
            tab === "Upcoming" ? (
              <Link
                to="/app/discover"
                className="text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
              >
                Discover Talent
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3 mt-5">
          {list.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

const TONE_CLASS = {
  confirmed: "text-success border-success/30",
  active: "text-rose-gold border-rose-gold/30",
  warning: "text-warning border-warning/30",
  closed: "text-muted-grey border-muted-grey/30",
  action: "text-rose-gold border-rose-gold/40 bg-rose-gold/5",
};

function BookingCard({ booking }) {
  const status = presentBookingStatus(booking.status);

  return (
    <Link
      to={`/app/bookings/${booking.id}`}
      className="block bg-card-black/70 border border-white/[0.06] rounded-lg p-4 hover:border-rose-gold/30 transition group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading text-lg text-ivory leading-none truncate">
            {booking.talentDisplayName}
          </p>
          <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-1.5">
            {booking.bookingReference}
          </p>
        </div>
        <ChevronRight
          className="w-4 h-4 text-muted-grey group-hover:text-rose-gold transition mt-1 shrink-0"
          strokeWidth={1.2}
        />
      </div>

      <div className="grid grid-cols-2 gap-y-1.5 mt-3 text-[0.65rem] font-body text-soft-ivory/75">
        <span className="flex items-center gap-1 text-muted-grey">
          <Calendar className="w-3 h-3" strokeWidth={1.2} />
          {booking.confirmedDate ? formatDate(booking.confirmedDate) : "Date to confirm"}
        </span>
        {booking.startTime && (
          <span className="flex items-center gap-1 text-muted-grey">
            <Clock className="w-3 h-3" strokeWidth={1.2} /> {booking.startTime.slice(0, 5)}
          </span>
        )}
        <span className="text-light-rose-gold col-start-2 text-right">
          {formatRate(booking.agreedAmount, booking.currencyCode)}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.04]">
        <span
          className={cn(
            "text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full",
            TONE_CLASS[status.tone]
          )}
        >
          {status.label}
        </span>
      </div>
    </Link>
  );
}

function ProposalCard({ proposal }) {
  const status = presentProposalStatus(proposal.status);

  return (
    <Link
      to={`/app/proposals/${proposal.id}`}
      className="block bg-card-black/70 border border-rose-gold/25 rounded-lg p-4 hover:border-rose-gold/50 transition group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading text-lg text-ivory leading-none truncate">
            {proposal.talentDisplayName}
          </p>
          <p className="text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/90 mt-1.5 flex items-center gap-1">
            <FileText className="w-2.5 h-2.5" strokeWidth={1.2} /> {status.label}
          </p>
        </div>
        <ChevronRight
          className="w-4 h-4 text-rose-gold/70 group-hover:text-rose-gold transition mt-1 shrink-0"
          strokeWidth={1.2}
        />
      </div>

      <div className="flex items-center justify-between mt-3 text-[0.65rem] font-body">
        <span className="flex items-center gap-1 text-muted-grey">
          <Calendar className="w-3 h-3" strokeWidth={1.2} />
          {proposal.proposedDate ? formatDate(proposal.proposedDate) : "Date to confirm"}
        </span>
        <span className="text-light-rose-gold">
          {formatRate(proposalAmount(proposal), proposal.currencyCode)}
        </span>
      </div>

      {proposal.expiresAtUtc && (
        <p className="text-[0.55rem] text-muted-grey mt-2">
          Expires {new Date(proposal.expiresAtUtc).toLocaleString()}
        </p>
      )}
    </Link>
  );
}

