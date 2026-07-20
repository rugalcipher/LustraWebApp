import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, MessageSquare, FileText, CalendarCheck, Clock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { formatRate } from "@/domain/talent";
import { presentStatus, isCancellable } from "@/services/inquiryService";
import { presentProposalStatus, isAwaitingResponse, proposalAmount } from "@/services/proposalService";
import { presentBookingStatus, formatBookingDate } from "@/services/bookingService";
import { useInquiry, useCancelInquiry } from "@/features/inquiries/hooks";
import { useProposalsForInquiry } from "@/features/proposals/hooks";
import { useBookingForInquiry } from "@/features/bookings/hooks";

/**
 * One inquiry, showing only what is actually persisted.
 *
 * Conversations, proposals and bookings arrive in later stages. Until they do, this
 * page states plainly that they have not happened — it never fabricates a message
 * thread, a proposal or a timeline event.
 */
export default function InquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: inquiry, isPending, isError, error } = useInquiry(id);
  const cancelInquiry = useCancelInquiry();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const cancel = async () => {
    try {
      await cancelInquiry.mutateAsync({ inquiryId: id, reason: null });
      setConfirmingCancel(false);
      toast({ title: "Inquiry cancelled", description: "Management has been notified." });
    } catch (err) {
      toast({ title: "Couldn't cancel", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (isPending) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    const notFound = isApiError(error) && error.kind === "not_found";
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">
          {notFound ? "Inquiry not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound ? "It may have been removed." : toUserMessage(error)}
        </p>
        <LustraButton as={Link} to="/app/inquiries" variant="outline" size="sm" className="mt-6">
          Back to Inquiries
        </LustraButton>
      </div>
    );
  }

  const status = presentStatus(inquiry.status);

  return (
    <div className="px-5 pt-6 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
      </button>

      <div className="mt-4">
        <Eyebrow>Inquiry</Eyebrow>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">{inquiry.talentDisplayName}</h1>
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          <span
            className={cn(
              "text-[0.55rem] tracking-luxe uppercase px-2.5 py-1 rounded-full border",
              status.tone === "closed"
                ? "border-white/10 text-muted-grey"
                : "border-rose-gold/40 text-rose-gold bg-rose-gold/5"
            )}
          >
            {status.label}
          </span>
          <span className="text-[0.55rem] text-muted-grey flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" strokeWidth={1.2} />
            Sent {new Date(inquiry.createdAtUtc).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="my-6">
        <StarDivider />
      </div>

      {/* What the client actually requested */}
      <Eyebrow>Your Request</Eyebrow>
      <div className="mt-3 space-y-3">
        <Row label="Engagement" value={inquiry.engagementCategory} />
        <Row
          label="Preferred date"
          value={inquiry.preferredDate ? new Date(inquiry.preferredDate).toLocaleDateString() : "Flexible"}
        />
        {inquiry.preferredStartTime && (
          <Row label="Preferred time" value={inquiry.preferredStartTime.slice(0, 5)} />
        )}
        {inquiry.estimatedDurationMinutes && (
          <Row label="Duration" value={formatDuration(inquiry.estimatedDurationMinutes)} />
        )}
        {inquiry.cityName && <Row label="City" value={inquiry.cityName} />}
        {inquiry.venueType && <Row label="Venue" value={inquiry.venueType} />}
        {inquiry.attendeeCount !== null && <Row label="Attendees" value={inquiry.attendeeCount} />}
        <Row label="Travel" value={inquiry.travelRequired ? "Required" : "Not required"} />
      </div>

      {inquiry.clientMessage && (
        <div className="mt-6">
          <Eyebrow>Your Message</Eyebrow>
          <p className="mt-2.5 font-body text-sm text-soft-ivory/85 leading-relaxed whitespace-pre-line">
            {inquiry.clientMessage}
          </p>
        </div>
      )}

      {/* Progress — real status history only */}
      {inquiry.history.length > 0 && (
        <div className="mt-7">
          <Eyebrow>Progress</Eyebrow>
          <div className="mt-3 space-y-2.5">
            {inquiry.history.map((entry, index) => (
              <div key={`${entry.toStatus}-${entry.createdAtUtc}-${index}`} className="flex gap-3">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-gold/60 shrink-0" />
                <div>
                  <p className="font-body text-sm text-soft-ivory/85">
                    {presentStatus(entry.toStatus).label}
                  </p>
                  <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-0.5">
                    {new Date(entry.createdAtUtc).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The conversation is opened by the server with the inquiry, so it always
          exists and is reachable. Proposals and bookings genuinely have not happened
          yet, and say so rather than showing a fabricated timeline. */}
      <div className="mt-7 space-y-2.5">
        {inquiry.conversationId ? (
          <Link
            to={`/app/messages/${inquiry.conversationId}`}
            className="flex gap-3 p-3.5 rounded-lg border border-rose-gold/25 bg-card-black/60 hover:border-rose-gold/50 transition"
          >
            <MessageSquare className="w-4 h-4 text-rose-gold/80 mt-0.5 shrink-0" strokeWidth={1.2} />
            <div className="flex-1 min-w-0">
              <p className="font-body text-[0.7rem] tracking-wide-luxe uppercase text-rose-gold/90">
                Concierge conversation
              </p>
              <p className="font-body text-[0.7rem] text-muted-grey mt-1 leading-relaxed">
                Open your private conversation with Lustra management about this inquiry.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-grey self-center shrink-0" strokeWidth={1.2} />
          </Link>
        ) : (
          <PendingNotice
            icon={MessageSquare}
            title="Management conversation"
            body="Management has not opened a conversation yet. You'll be notified when they do."
          />
        )}
        <ProposalRow inquiryId={inquiry.id} />
        <BookingRow inquiryId={inquiry.id} />
      </div>

      {isCancellable(inquiry.status) && (
        <div className="mt-8">
          {confirmingCancel ? (
            <div className="p-4 rounded-lg border border-error/30 bg-error/5">
              <p className="font-body text-sm text-soft-ivory/85">
                Cancel this inquiry? Management will be notified and it will stop progressing.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={cancel}
                  disabled={cancelInquiry.isPending}
                  className="flex-1 py-2.5 rounded-sm border border-error/40 text-error font-body text-[0.6rem] tracking-luxe uppercase hover:bg-error/10 transition disabled:opacity-50"
                >
                  {cancelInquiry.isPending ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  onClick={() => setConfirmingCancel(false)}
                  className="flex-1 py-2.5 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory transition"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="w-full py-3 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-error hover:border-error/30 transition"
            >
              Cancel inquiry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The proposals raised against this inquiry.
 *
 * Shows the real ones when they exist and says plainly when none do. The list comes from
 * the client's own proposals, so it can never surface another client's.
 */
function ProposalRow({ inquiryId }) {
  const { proposals } = useProposalsForInquiry(inquiryId);

  if (proposals.length === 0) {
    return (
      <PendingNotice
        icon={FileText}
        title="Proposal"
        body="No proposal has been issued for this inquiry yet."
      />
    );
  }

  return (
    <>
      {proposals.map((proposal) => {
        const status = presentProposalStatus(proposal.status);
        const awaiting = isAwaitingResponse(proposal.status);
        return (
          <Link
            key={proposal.id}
            to={`/app/proposals/${proposal.id}`}
            className={cn(
              "flex gap-3 p-3.5 rounded-lg border bg-card-black/60 transition",
              awaiting
                ? "border-rose-gold/25 hover:border-rose-gold/50"
                : "border-white/[0.06] hover:border-white/20"
            )}
          >
            <FileText
              className={cn("w-4 h-4 mt-0.5 shrink-0", awaiting ? "text-rose-gold/80" : "text-muted-grey/60")}
              strokeWidth={1.2}
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "font-body text-[0.7rem] tracking-wide-luxe uppercase",
                  awaiting ? "text-rose-gold/90" : "text-soft-ivory/60"
                )}
              >
                Proposal — {status.label}
              </p>
              <p className="font-body text-[0.7rem] text-muted-grey mt-1 leading-relaxed">
                {formatRate(proposalAmount(proposal), proposal.currencyCode)}
                {proposal.proposedDate ? ` · ${formatBookingDate(proposal.proposedDate)}` : ""}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-grey self-center shrink-0" strokeWidth={1.2} />
          </Link>
        );
      })}
    </>
  );
}

/** The booking this inquiry became, once management has confirmed one. */
function BookingRow({ inquiryId }) {
  const { booking } = useBookingForInquiry(inquiryId);

  if (!booking) {
    return (
      <PendingNotice
        icon={CalendarCheck}
        title="Booking"
        body="Booking confirmation is pending Management review."
      />
    );
  }

  const status = presentBookingStatus(booking.status);

  return (
    <Link
      to={`/app/bookings/${booking.id}`}
      className="flex gap-3 p-3.5 rounded-lg border border-success/25 bg-card-black/60 hover:border-success/50 transition"
    >
      <CalendarCheck className="w-4 h-4 text-success/80 mt-0.5 shrink-0" strokeWidth={1.2} />
      <div className="flex-1 min-w-0">
        <p className="font-body text-[0.7rem] tracking-wide-luxe uppercase text-success/90">
          Booking — {status.label}
        </p>
        <p className="font-body text-[0.7rem] text-muted-grey mt-1 leading-relaxed">
          {booking.bookingReference} · {formatBookingDate(booking.confirmedDate)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-grey self-center shrink-0" strokeWidth={1.2} />
    </Link>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-[0.6rem] tracking-luxe uppercase text-muted-grey shrink-0">{label}</span>
      <span className="text-sm text-soft-ivory/85 text-right font-body">{value}</span>
    </div>
  );
}

/** A truthful "not yet" state — never a fabricated event. */
function PendingNotice({ icon: Icon, title, body }) {
  return (
    <div className="flex gap-3 p-3.5 rounded-lg border border-white/[0.05] bg-card-black/40">
      <Icon className="w-4 h-4 text-muted-grey/60 mt-0.5 shrink-0" strokeWidth={1.2} />
      <div>
        <p className="font-body text-[0.7rem] tracking-wide-luxe uppercase text-soft-ivory/60">{title}</p>
        <p className="font-body text-[0.7rem] text-muted-grey mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours}h ${remainder}m`;
}
