import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, CalendarX2, MessageSquare, MapPin, Clock, Hourglass, Loader2, RotateCw,
} from "lucide-react";
import { Card, Skeleton } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { isApiError, toUserMessage } from "@/api/problemDetails";
import { useClientAppointment } from "@/features/clientAppointments/hooks";
import {
  formatAppointmentDate, formatAppointmentTime, formatDuration, formatLocation,
  presentStatus, statusTone,
} from "@/features/clientAppointments/presentation";

/**
 * One of the client's own appointments.
 *
 * Everything rendered here comes from `ClientAppointmentDto`, which is the
 * privacy boundary. Absent from it by design, and not to be reintroduced from
 * another endpoint: agreed amounts and settlement state, the talent's private
 * reporting address, instructions written for the talent, internal notes,
 * visibility reasons, and the staff assigned. The one free-text field shown —
 * `clientVisibleNotes` — is written knowing the client reads it.
 *
 * **A hidden appointment is indistinguishable from one that never existed.** The
 * backend answers 404 for both, and so does this page: it says the appointment
 * is unavailable and stops. Telling the client that management concealed it
 * would disclose precisely what concealing it withholds.
 */

const TONE = {
  confirmed: "border-rose-gold/40 text-rose-gold bg-rose-gold/10",
  active: "border-success/40 text-success bg-success/10",
  closed: "border-white/15 text-soft-ivory/70 bg-white/[0.03]",
  warning: "border-warning/40 text-warning bg-warning/10",
  neutral: "border-white/15 text-muted-grey bg-white/[0.03]",
};

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="w-4 h-4 text-muted-grey shrink-0 mt-0.5" strokeWidth={1.3} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</p>
        <p className="font-body text-body text-soft-ivory/90 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ClientAppointmentDetail() {
  const { id } = useParams();
  const query = useClientAppointment(id);

  if (query.isPending) {
    return (
      <div className="px-5 py-6 space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    // 404 is the deliberate "you may not see this" answer. It is presented
    // identically to a nonexistent appointment — no hint that one exists.
    const unavailable = isApiError(query.error) && query.error.status === 404;
    return (
      <div className="px-5 py-6 space-y-5">
        <Link
          to="/app/appointments"
          className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Appointments
        </Link>

        <Card className="p-6 space-y-4" role="alert">
          <div className="flex items-center gap-3">
            <CalendarX2 className="w-6 h-6 text-muted-grey shrink-0" strokeWidth={1.2} aria-hidden="true" />
            <h1 className="font-heading text-xl text-ivory">
              {unavailable ? "Appointment unavailable" : "Something went wrong"}
            </h1>
          </div>
          <p className="font-body text-body text-soft-ivory/75">
            {unavailable
              ? "We cannot show this appointment. If you were expecting to find something here, message Lustra and we will help."
              : toUserMessage(query.error)}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/app/messages"
              className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message Management
            </Link>
            {!unavailable && (
              <button
                onClick={() => query.refetch()}
                className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
              >
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const appointment = query.data;
  const talent = appointment.talent;
  const date = formatAppointmentDate(appointment.confirmedDate);
  const time = formatAppointmentTime(appointment.startTime, appointment.endTime);
  const duration = formatDuration(appointment.durationMinutes);
  const place = formatLocation(appointment);

  const timeline = [
    ["Reserved", appointment.createdAtUtc],
    ["Completed", appointment.completedAtUtc],
    ["Cancelled", appointment.cancelledAtUtc],
  ].filter(([, value]) => Boolean(value));

  const conversationLink = appointment.conversationId
    ? `/app/messages/${appointment.conversationId}`
    : "/app/messages";

  return (
    <div className="px-5 py-6 space-y-5">
      <Link
        to="/app/appointments"
        className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Appointments
      </Link>

      {/* Approved public imagery only — `coverImage` is the talent's public profile picture. */}
      <Card className="overflow-hidden">
        {talent.coverImage?.url ? (
          <img
            src={talent.coverImage.url}
            srcSet={talent.coverImage.srcSet ?? undefined}
            sizes="(max-width: 640px) 100vw, 640px"
            alt={talent.displayName}
            className="w-full aspect-[4/3] object-cover"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-deep-black/70 flex items-center justify-center">
            <span className="font-heading text-4xl text-rose-gold/50">
              {talent.displayName.charAt(0)}
            </span>
          </div>
        )}

        <div className="p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading font-light text-2xl text-ivory">{talent.displayName}</h1>
              <p className="font-body text-meta text-muted-grey mt-0.5">{appointment.reference}</p>
            </div>
            <span
              className={cn(
                "inline-block px-2.5 py-1 rounded-full border font-body text-meta tracking-wide-luxe uppercase whitespace-nowrap",
                TONE[statusTone(appointment.status)]
              )}
            >
              {presentStatus(appointment.status)}
            </span>
          </div>
          {talent.slug && (
            <Link
              to={`/app/talent/${talent.slug}`}
              className="font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
            >
              View profile
            </Link>
          )}
        </div>
      </Card>

      <Card className="px-5 divide-y divide-white/[0.06]">
        <Row
          icon={Clock}
          label="When"
          value={
            date || time
              ? `${[date, time].filter(Boolean).join(" · ")}${
                  appointment.timeZone ? ` (${appointment.timeZone})` : ""
                }`
              : "To be confirmed"
          }
        />
        <Row icon={Hourglass} label="Duration" value={duration} />
        <Row icon={MapPin} label="Where" value={place} />
        <Row icon={Clock} label="Engagement" value={appointment.engagementCategory} />
        {appointment.venueType && <Row icon={MapPin} label="Venue type" value={appointment.venueType} />}
      </Card>

      {/* Written by management knowing the client reads it. The only free text here. */}
      {appointment.clientVisibleNotes && (
        <Card className="p-5 space-y-2">
          <h2 className="font-heading text-lg text-ivory">Notes for you</h2>
          <p className="font-body text-body text-soft-ivory/85 whitespace-pre-line">
            {appointment.clientVisibleNotes}
          </p>
        </Card>
      )}

      {timeline.length > 0 && (
        <Card className="p-5 space-y-3">
          <h2 className="font-heading text-lg text-ivory">Timeline</h2>
          <ol className="space-y-2">
            {timeline.map(([label, value]) => (
              <li key={label} className="flex justify-between gap-4">
                <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                  {label}
                </span>
                <span className="font-body text-helper text-soft-ivory/85">
                  {new Date(value).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <h2 className="font-heading text-lg text-ivory">Need to change something?</h2>
        <p className="font-body text-body text-soft-ivory/75">
          Everything is arranged through Lustra. Message us and we will take care of it.
        </p>
        <Link
          to={conversationLink}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message Management
        </Link>
      </Card>

      {query.isFetching && (
        <p className="flex items-center gap-2 font-body text-meta text-muted-grey">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Updating…
        </p>
      )}
    </div>
  );
}
