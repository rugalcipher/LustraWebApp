import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Calendar, Clock, MapPin, Lock } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { formatRate } from "@/domain/talent";
import { presentBookingStatus, formatBookingDate, formatBookingTime } from "@/services/bookingService";
import { useMyTalentBooking } from "@/features/talent/hooks";

/**
 * One of the talent's bookings — the operational view.
 *
 * This is the ONLY surface that shows the private location, because the talent needs it to
 * turn up. It is labelled as confidential and is deliberately absent from the client's
 * view of the same booking. The API also withholds the client's identity here; do not add
 * a lookup that reintroduces it.
 */
export default function TalentBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isPending, isError, error } = useMyTalentBooking(id);

  if (isPending) {
    return (
      <div className="lustra-marble min-h-screen py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    const notFound = isApiError(error) && error.kind === "not_found";
    return (
      <div className="lustra-marble min-h-screen px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">
          {notFound ? "Booking not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound ? "It may have been removed." : toUserMessage(error)}
        </p>
        <Link
          to="/talent-portal"
          className="mt-6 inline-block text-[0.6rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
        >
          Back to portal
        </Link>
      </div>
    );
  }

  const status = presentBookingStatus(booking.status);

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title={booking.bookingReference}
        subtitle={booking.engagementCategory}
      />

      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
        </button>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Status</Eyebrow>
            <span
              className={cn(
                "text-[0.55rem] tracking-luxe uppercase px-2.5 py-1 rounded-full border",
                status.tone === "confirmed"
                  ? "border-success/40 text-success"
                  : status.tone === "closed"
                    ? "border-white/10 text-muted-grey"
                    : status.tone === "warning"
                      ? "border-warning/40 text-warning"
                      : "border-rose-gold/40 text-rose-gold"
              )}
            >
              {status.label}
            </span>
          </div>

          <div className="mt-4 space-y-3">
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
            <Row label="Time zone" value={booking.timeZone} />
            <Row label="Your fee" value={formatRate(booking.agreedAmount, booking.currencyCode)} />
          </div>
        </Card>

        <Card className="p-5">
          <Eyebrow>Location</Eyebrow>
          <div className="mt-3 space-y-3">
            {booking.cityName && <Row icon={MapPin} label="City" value={booking.cityName} />}
            {booking.venueType && <Row label="Venue type" value={booking.venueType} />}
            {booking.venueName && <Row label="Venue" value={booking.venueName} />}
            {booking.generalLocation && <Row label="Area" value={booking.generalLocation} />}
          </div>

          {booking.privateLocationDetails && (
            <div className="mt-4 pt-4 border-t border-rose-gold/20">
              <p className="inline-flex items-center gap-1.5 text-[0.55rem] tracking-wide-luxe uppercase text-rose-gold/90">
                <Lock className="w-3 h-3" strokeWidth={1.4} /> Confidential — for you only
              </p>
              <p className="font-body text-sm text-soft-ivory/90 mt-2 leading-relaxed whitespace-pre-line">
                {booking.privateLocationDetails}
              </p>
              <p className="font-body text-[0.6rem] text-muted-grey mt-2 leading-relaxed">
                Do not share these details. Contact Lustra if anything is unclear.
              </p>
            </div>
          )}
        </Card>

        {booking.clientVisibleNotes && (
          <Card className="p-5">
            <Eyebrow>Engagement Notes</Eyebrow>
            <p className="font-body text-sm text-soft-ivory/85 mt-3 leading-relaxed whitespace-pre-line">
              {booking.clientVisibleNotes}
            </p>
          </Card>
        )}
      </div>
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
