import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { formatRate } from "@/domain/talent";
import { formatBookingDate, formatBookingTime } from "@/services/bookingService";
import { presentProposalStatus, isAwaitingResponse, hasLapsed, proposalAmount } from "@/services/proposalService";
import {
  useProposal, useAcceptProposal, useDeclineProposal, useRequestProposalChange,
} from "@/features/proposals/hooks";

/**
 * One proposal from Lustra management.
 *
 * Accepting a proposal does NOT create a booking and takes no payment — management
 * confirms bookings separately. Every piece of copy on this page is written so a client
 * cannot come away believing they have just booked or paid for anything.
 */
export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: proposal, isPending, isError, error } = useProposal(id);

  const accept = useAcceptProposal();
  const decline = useDeclineProposal();
  const requestChange = useRequestProposalChange();
  const [panel, setPanel] = useState(null); // null | "decline" | "change"
  const [message, setMessage] = useState("");

  const busy = accept.isPending || decline.isPending || requestChange.isPending;

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
          {notFound ? "Proposal not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound ? "It may have been withdrawn." : toUserMessage(error)}
        </p>
        <LustraButton as={Link} to="/app/bookings" variant="outline" size="sm" className="mt-6">
          Back to Bookings
        </LustraButton>
      </div>
    );
  }

  const status = presentProposalStatus(proposal.status);
  const lapsed = hasLapsed(proposal);
  const canRespond = isAwaitingResponse(proposal.status) && !lapsed;

  const onAccept = async () => {
    try {
      await accept.mutateAsync(id);
      toast({
        title: "Proposal accepted",
        description: "Management will confirm your booking and be in touch.",
      });
    } catch (err) {
      toast({ title: "Couldn't accept", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const onSubmitPanel = async (event) => {
    event.preventDefault();
    const text = message.trim();
    try {
      if (panel === "decline") {
        await decline.mutateAsync({ proposalId: id, reason: text || null });
        toast({ title: "Proposal declined", description: "Management has been notified." });
      } else {
        await requestChange.mutateAsync({ proposalId: id, message: text });
        toast({ title: "Changes requested", description: "Management will revise the proposal." });
      }
      setPanel(null);
      setMessage("");
    } catch (err) {
      toast({ title: "Couldn't send", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="px-5 pt-6 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
      </button>

      <div className="mt-4">
        <Eyebrow>Proposal</Eyebrow>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">
          {proposal.talentDisplayName}
        </h1>
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          <span
            className={cn(
              "text-[0.55rem] tracking-luxe uppercase px-2.5 py-1 rounded-full border",
              lapsed
                ? "border-white/10 text-muted-grey"
                : status.tone === "closed"
                  ? "border-white/10 text-muted-grey"
                  : "border-rose-gold/40 text-rose-gold bg-rose-gold/5"
            )}
          >
            {lapsed ? "Expired" : status.label}
          </span>
          <span className="text-[0.55rem] text-muted-grey">{proposal.engagementCategory}</span>
        </div>
      </div>

      {/* An expiry that has passed but whose background job has not run yet would otherwise
          show an actionable proposal the server will reject. Say so up front. */}
      {lapsed && (
        <div className="mt-4 flex gap-2.5 p-3.5 rounded-lg border border-white/[0.06] bg-card-black/50">
          <AlertCircle className="w-4 h-4 text-muted-grey mt-0.5 shrink-0" strokeWidth={1.2} />
          <p className="font-body text-[0.7rem] text-muted-grey leading-relaxed">
            This proposal has passed its expiry. Message Management if you would still like to
            proceed.
          </p>
        </div>
      )}

      <div className="my-6">
        <StarDivider />
      </div>

      <Eyebrow>Proposed Engagement</Eyebrow>
      <div className="mt-3 space-y-3">
        <Row icon={Calendar} label="Date" value={formatBookingDate(proposal.proposedDate)} />
        {proposal.startTime && (
          <Row
            icon={Clock}
            label="Time"
            value={
              proposal.endTime
                ? `${formatBookingTime(proposal.startTime)} – ${formatBookingTime(proposal.endTime)}`
                : formatBookingTime(proposal.startTime)
            }
          />
        )}
        {proposal.durationMinutes && (
          <Row label="Duration" value={formatDuration(proposal.durationMinutes)} />
        )}
        {proposal.cityName && <Row icon={MapPin} label="City" value={proposal.cityName} />}
        {proposal.venueType && <Row label="Venue type" value={proposal.venueType} />}
        {proposal.venueName && <Row label="Venue" value={proposal.venueName} />}
        {proposal.generalLocation && <Row label="Location" value={proposal.generalLocation} />}
      </div>

      <div className="mt-7">
        <Eyebrow>Terms</Eyebrow>
        <div className="mt-3 space-y-3">
          <Row
            label="Engagement fee"
            value={formatRate(proposalAmount(proposal), proposal.currencyCode)}
          />
          {proposal.additionalCosts !== null && proposal.additionalCosts !== undefined && (
            <Row
              label="Additional costs"
              value={formatRate(proposal.additionalCosts, proposal.currencyCode)}
            />
          )}
          {proposal.expiresAtUtc && (
            <Row label="Valid until" value={new Date(proposal.expiresAtUtc).toLocaleString()} />
          )}
        </div>
        {proposal.cancellationTerms && (
          <div className="mt-4">
            <p className="text-[0.6rem] tracking-luxe uppercase text-muted-grey">
              Cancellation terms
            </p>
            <p className="font-body text-sm text-soft-ivory/85 mt-1.5 leading-relaxed whitespace-pre-line">
              {proposal.cancellationTerms}
            </p>
          </div>
        )}
      </div>

      {proposal.clientVisibleNotes && (
        <div className="mt-7">
          <Eyebrow>Notes from Management</Eyebrow>
          <p className="mt-2.5 font-body text-sm text-soft-ivory/85 leading-relaxed whitespace-pre-line">
            {proposal.clientVisibleNotes}
          </p>
        </div>
      )}

      <Link
        to={`/app/inquiries/${proposal.inquiryId}`}
        className="mt-6 inline-block text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
      >
        View original inquiry →
      </Link>

      {canRespond && !panel && (
        <div className="mt-8 space-y-2.5">
          <p className="font-body text-[0.65rem] text-muted-grey leading-relaxed">
            Accepting confirms these terms to Management. Your booking is confirmed by Lustra
            afterwards — no payment is taken here.
          </p>
          <LustraButton onClick={onAccept} className="w-full" disabled={busy}>
            {accept.isPending ? "Accepting…" : "Accept proposal"}
          </LustraButton>
          <div className="flex gap-2">
            <button
              onClick={() => setPanel("change")}
              disabled={busy}
              className="flex-1 py-3 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory hover:border-white/25 transition disabled:opacity-50"
            >
              Request changes
            </button>
            <button
              onClick={() => setPanel("decline")}
              disabled={busy}
              className="flex-1 py-3 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-error hover:border-error/30 transition disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {canRespond && panel && (
        <form
          onSubmit={onSubmitPanel}
          className="mt-8 p-4 rounded-lg border border-white/10 bg-card-black/50"
        >
          <p className="font-body text-sm text-soft-ivory/85">
            {panel === "decline"
              ? "Let Management know why, if you'd like to. This is optional."
              : "Tell Management what you'd like changed and they will revise the proposal."}
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            autoFocus
            placeholder="Your message…"
            className="w-full mt-3 bg-transparent border border-white/10 rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
          />
          <div className="flex gap-2 mt-3">
            <LustraButton
              type="submit"
              size="sm"
              className="flex-1"
              // A change request needs a message (the server requires one); a decline reason
              // is optional, so the button must not be disabled for an empty one.
              disabled={busy || (panel === "change" && message.trim().length === 0)}
            >
              {busy ? "Sending…" : panel === "decline" ? "Decline proposal" : "Send request"}
            </LustraButton>
            <button
              type="button"
              onClick={() => {
                setPanel(null);
                setMessage("");
              }}
              className="flex-1 py-2.5 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory transition"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {proposal.status === "Accepted" && (
        <div className="mt-8 p-4 rounded-lg border border-success/25 bg-success/[0.04]">
          <p className="font-body text-sm text-soft-ivory/90">You accepted this proposal.</p>
          <p className="font-body text-[0.7rem] text-muted-grey mt-1.5 leading-relaxed">
            Lustra management is preparing your booking confirmation. It will appear under
            Bookings once confirmed.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-[0.6rem] tracking-luxe uppercase text-muted-grey shrink-0 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" strokeWidth={1.2} />}
        {label}
      </span>
      <span className="text-sm text-soft-ivory/85 text-right font-body">{value}</span>
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
