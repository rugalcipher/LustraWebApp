import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Calendar, Clock, MapPin, MessageSquare, Star, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarDivider } from "@/lib/lustra/Brand";
import { Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { formatRate } from "@/domain/talent";
import {
  presentBookingStatus, presentSettlement, isReviewable, canRequestChanges,
  formatBookingDate, formatBookingTime,
} from "@/services/bookingService";
import {
  useBooking, useSettlement, useMyReview, useCreateReview, useRequestBookingChange,
} from "@/features/bookings/hooks";
import { useInquiry } from "@/features/inquiries/hooks";

/**
 * One confirmed booking.
 *
 * The client CANNOT change a booking here — management confirms and amends bookings. What
 * this page offers is a *request*, and the copy says exactly that rather than presenting a
 * cancel button that would imply unilateral control.
 */
export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isPending, isError, error } = useBooking(id);

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
          {notFound ? "Booking not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound ? "It may have been removed." : toUserMessage(error)}
        </p>
        <LustraButton as={Link} to="/app/bookings" variant="outline" size="sm" className="mt-6">
          Back to Bookings
        </LustraButton>
      </div>
    );
  }

  const status = presentBookingStatus(booking.status);

  return (
    <div className="px-5 pt-6 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
      </button>

      <div className="mt-4">
        <Eyebrow>{booking.bookingReference}</Eyebrow>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">
          {booking.talentDisplayName}
        </h1>
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          <span
            className={cn(
              "text-[0.55rem] tracking-luxe uppercase px-2.5 py-1 rounded-full border",
              status.tone === "confirmed"
                ? "border-success/40 text-success"
                : status.tone === "closed"
                  ? "border-white/10 text-muted-grey"
                  : status.tone === "warning"
                    ? "border-warning/40 text-warning"
                    : "border-rose-gold/40 text-rose-gold bg-rose-gold/5"
            )}
          >
            {status.label}
          </span>
          <span className="text-[0.55rem] text-muted-grey">{booking.engagementCategory}</span>
        </div>
      </div>

      <div className="my-6">
        <StarDivider />
      </div>

      <Eyebrow>The Engagement</Eyebrow>
      <div className="mt-3 space-y-3">
        <Row icon={Calendar} label="Date" value={formatBookingDate(booking.confirmedDate)} />
        {booking.startTime && (
          <Row
            icon={Clock}
            label="Time"
            value={
              booking.endTime
                ? `${formatBookingTime(booking.startTime)} – ${formatBookingTime(booking.endTime)}`
                : formatBookingTime(booking.startTime)
            }
          />
        )}
        {booking.durationMinutes && (
          <Row label="Duration" value={formatDuration(booking.durationMinutes)} />
        )}
        {booking.cityName && <Row icon={MapPin} label="City" value={booking.cityName} />}
        {booking.venueType && <Row label="Venue type" value={booking.venueType} />}
        {booking.venueName && <Row label="Venue" value={booking.venueName} />}
        {booking.generalLocation && <Row label="Location" value={booking.generalLocation} />}
        <Row label="Time zone" value={booking.timeZone} />
      </div>

      <div className="mt-7">
        <Eyebrow>Agreed Terms</Eyebrow>
        <div className="mt-3 space-y-3">
          <Row label="Engagement fee" value={formatRate(booking.agreedAmount, booking.currencyCode)} />
          {booking.additionalCosts !== null && booking.additionalCosts !== undefined && (
            <Row
              label="Additional costs"
              value={formatRate(booking.additionalCosts, booking.currencyCode)}
            />
          )}
        </div>
      </div>

      {booking.clientVisibleNotes && (
        <div className="mt-7">
          <Eyebrow>Notes from Management</Eyebrow>
          <p className="mt-2.5 font-body text-sm text-soft-ivory/85 leading-relaxed whitespace-pre-line">
            {booking.clientVisibleNotes}
          </p>
        </div>
      )}

      <SettlementPanel bookingId={id} fallbackStatus={booking.settlementStatus} />

      <InquiryLink inquiryId={booking.inquiryId} />

      {isReviewable(booking.status) && <ReviewPanel bookingId={id} />}

      {canRequestChanges(booking.status) && <RequestPanel bookingId={id} />}
    </div>
  );
}

/**
 * Settlement.
 *
 * Everything here is a MANUALLY MAINTAINED external status. Lustra processes no payments,
 * so this panel reports what management recorded and never offers a way to pay.
 */
function SettlementPanel({ bookingId, fallbackStatus }) {
  const { data: settlement, isError } = useSettlement(bookingId);
  // The booking already carries the status, so a failed settlement call degrades to that
  // rather than leaving the client with no information at all.
  const status = settlement?.status ?? fallbackStatus;
  const presented = presentSettlement(status);

  return (
    <div className="mt-7">
      <Eyebrow>Settlement</Eyebrow>
      <div className="mt-3 p-4 rounded-lg border border-white/[0.06] bg-card-black/50">
        <p className="font-body text-sm text-soft-ivory/90">{presented.label}</p>
        <p className="font-body text-[0.7rem] text-muted-grey mt-1.5 leading-relaxed">
          {presented.detail}
        </p>
        {settlement?.clientVisibleNote && (
          <p className="font-body text-[0.7rem] text-soft-ivory/75 mt-3 pt-3 border-t border-white/[0.05] leading-relaxed whitespace-pre-line">
            {settlement.clientVisibleNote}
          </p>
        )}
        {isError && (
          <p className="font-body text-[0.6rem] text-muted-grey/70 mt-2">
            Full settlement detail is unavailable right now.
          </p>
        )}
      </div>
    </div>
  );
}

/** Link back to the inquiry this booking came from, and through to its conversation. */
function InquiryLink({ inquiryId }) {
  const { data: inquiry } = useInquiry(inquiryId);

  return (
    <div className="mt-4 space-y-2.5">
      {inquiry?.conversationId && (
        <Link
          to={`/app/messages/${inquiry.conversationId}`}
          className="flex gap-3 p-3.5 rounded-lg border border-rose-gold/25 bg-card-black/60 hover:border-rose-gold/50 transition"
        >
          <MessageSquare className="w-4 h-4 text-rose-gold/80 mt-0.5 shrink-0" strokeWidth={1.2} />
          <div className="flex-1 min-w-0">
            <p className="font-body text-[0.7rem] tracking-wide-luxe uppercase text-rose-gold/90">
              Concierge conversation
            </p>
            <p className="font-body text-[0.7rem] text-muted-grey mt-1">
              Discuss this booking with Lustra management.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-grey self-center shrink-0" strokeWidth={1.2} />
        </Link>
      )}
      <Link
        to={`/app/inquiries/${inquiryId}`}
        className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-white/[0.05] bg-card-black/40 hover:border-white/15 transition"
      >
        <span className="font-body text-[0.7rem] tracking-wide-luxe uppercase text-soft-ivory/70">
          View original inquiry
        </span>
        <ChevronRight className="w-4 h-4 text-muted-grey shrink-0" strokeWidth={1.2} />
      </Link>
    </div>
  );
}

/** Submit or display the client's review. Reviews are moderated before publication. */
function ReviewPanel({ bookingId }) {
  const { data: review, isPending } = useMyReview(bookingId);
  const createReview = useCreateReview(bookingId);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await createReview.mutateAsync({ rating, title: title.trim() || null, body: body.trim() });
      toast({
        title: "Review submitted",
        description: "It will appear publicly once Lustra has reviewed it.",
      });
    } catch (err) {
      toast({ title: "Couldn't submit", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (isPending) return null;

  if (review) {
    return (
      <div className="mt-7">
        <Eyebrow>Your Review</Eyebrow>
        <div className="mt-3 p-4 rounded-lg border border-white/[0.06] bg-card-black/50">
          <Stars value={review.rating} />
          {review.title && (
            <p className="font-heading text-base text-ivory mt-2.5">{review.title}</p>
          )}
          <p className="font-body text-sm text-soft-ivory/85 mt-2 leading-relaxed whitespace-pre-line">
            {review.body}
          </p>
          {/* The moderation status is stated plainly: a pending review is NOT yet public,
              and pretending otherwise would misrepresent what the client's words are doing. */}
          <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-3 pt-3 border-t border-white/[0.05]">
            {review.status === "Approved"
              ? "Published"
              : review.status === "Pending"
                ? "Awaiting moderation — not yet public"
                : "Not published"}
          </p>
          {review.talentResponse && (
            <div className="mt-3 pt-3 border-t border-white/[0.05]">
              <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">Response</p>
              <p className="font-body text-sm text-soft-ivory/80 mt-1.5 leading-relaxed">
                {review.talentResponse}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7">
      <Eyebrow>Leave a Review</Eyebrow>
      <div className="mt-3 p-4 rounded-lg border border-white/[0.06] bg-card-black/50 space-y-3.5">
        <Stars value={rating} onChange={setRating} />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={120}
          className="w-full bg-transparent border-b border-white/10 pb-2 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="How was the engagement?"
          rows={4}
          maxLength={2000}
          className="w-full bg-transparent border border-white/10 rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
        />
        <p className="font-body text-[0.6rem] text-muted-grey leading-relaxed">
          Reviews are read by Lustra before they are published.
        </p>
        <LustraButton
          type="submit"
          size="sm"
          className="w-full"
          disabled={rating < 1 || body.trim().length === 0 || createReview.isPending}
        >
          {createReview.isPending ? "Submitting…" : "Submit review"}
        </LustraButton>
      </div>
    </form>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1.5" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Star
            className={cn("w-5 h-5", filled ? "text-rose-gold fill-rose-gold" : "text-muted-grey/50")}
            strokeWidth={1.2}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => onChange(n)}
            className="transition hover:scale-110"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

/**
 * Ask management to change or cancel.
 *
 * This does not alter the booking. It records the request and posts it to the concierge
 * conversation, which is what the confirmation message tells the client.
 */
function RequestPanel({ bookingId }) {
  const request = useRequestBookingChange(bookingId);
  const [mode, setMode] = useState(null); // null | "change" | "cancellation"
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await request.mutateAsync({ message: message.trim(), cancellation: mode === "cancellation" });
      setMode(null);
      setMessage("");
      toast({
        title: "Request sent",
        description: "Management will respond in your conversation.",
      });
    } catch (err) {
      toast({ title: "Couldn't send", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (!mode) {
    return (
      <div className="mt-8 flex gap-2">
        <button
          onClick={() => setMode("change")}
          className="flex-1 py-3 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory hover:border-white/25 transition"
        >
          Request a change
        </button>
        <button
          onClick={() => setMode("cancellation")}
          className="flex-1 py-3 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-error hover:border-error/30 transition"
        >
          Request cancellation
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 p-4 rounded-lg border border-white/10 bg-card-black/50">
      <p className="font-body text-sm text-soft-ivory/85">
        {mode === "cancellation"
          ? "Tell Management why you'd like to cancel. They will confirm before anything changes."
          : "Tell Management what you'd like to change. They will confirm before anything changes."}
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={1000}
        autoFocus
        className="w-full mt-3 bg-transparent border border-white/10 rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
        placeholder="Your message…"
      />
      <div className="flex gap-2 mt-3">
        <LustraButton
          type="submit"
          size="sm"
          className="flex-1"
          disabled={message.trim().length === 0 || request.isPending}
        >
          {request.isPending ? "Sending…" : "Send request"}
        </LustraButton>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="flex-1 py-2.5 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory transition"
        >
          Cancel
        </button>
      </div>
    </form>
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
