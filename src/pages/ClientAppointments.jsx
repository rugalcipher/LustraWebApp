import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Loader2, AlertTriangle, RotateCw, MapPin, Clock, MessageSquare } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useClientAppointments } from "@/features/clientAppointments/hooks";
import {
  formatAppointmentDate, formatAppointmentTime, formatLocation, presentStatus, statusTone,
} from "@/features/clientAppointments/presentation";

/**
 * The client's own appointments.
 *
 * Read-only by design. Lustra is concierge-led: there is no reschedule, no
 * cancel and no confirm here, because those are arranged by talking to
 * management. Every card therefore offers the one action that actually leads
 * somewhere — opening the conversation.
 *
 * Only the client-safe DTO is rendered. Nothing on this page reaches for a
 * management field, and the empty states describe an empty list rather than
 * implying something was withheld.
 */

const SCOPES = [
  { value: "Upcoming", label: "Upcoming" },
  { value: "Past", label: "Past" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "All", label: "All" },
];

const EMPTY_COPY = {
  Upcoming: "Nothing is scheduled yet. When Lustra reserves an appointment for you it appears here.",
  Past: "No past appointments yet.",
  Cancelled: "No cancelled appointments.",
  All: "You have no appointments yet. Message Lustra to arrange one.",
};

const TONE = {
  confirmed: "border-rose-gold/40 text-rose-gold bg-rose-gold/10",
  active: "border-success/40 text-success bg-success/10",
  closed: "border-white/15 text-soft-ivory/70 bg-white/[0.03]",
  warning: "border-warning/40 text-warning bg-warning/10",
  neutral: "border-white/15 text-muted-grey bg-white/[0.03]",
};

function StatusPill({ status }) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-1 rounded-full border font-body text-meta tracking-wide-luxe uppercase whitespace-nowrap",
        TONE[statusTone(status)]
      )}
    >
      {presentStatus(status)}
    </span>
  );
}

/**
 * The talent's approved public cover, or a lettered placeholder.
 *
 * A missing cover is normal — a talent may have no approved image yet — so it
 * must not render a broken frame. Nothing here ever falls back to another
 * talent's picture or to a private one: `talentCoverImage` is the only image on
 * the client DTO and it is already public.
 */
function TalentThumb({ image, name }) {
  if (!image?.url) {
    return (
      <div
        className="w-16 h-20 shrink-0 rounded-sm bg-deep-black/70 border border-white/[0.08] flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="font-heading text-lg text-rose-gold/60">{(name ?? "?").charAt(0)}</span>
      </div>
    );
  }
  return (
    <img
      src={image.url}
      srcSet={image.srcSet ?? undefined}
      sizes="64px"
      alt=""
      loading="lazy"
      className="w-16 h-20 shrink-0 rounded-sm object-cover border border-white/[0.08]"
    />
  );
}

function AppointmentCard({ appointment }) {
  const date = formatAppointmentDate(appointment.confirmedDate);
  const time = formatAppointmentTime(appointment.startTime, appointment.endTime);
  const place = formatLocation(appointment);

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        <TalentThumb image={appointment.talentCoverImage} name={appointment.talentDisplayName} />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-lg text-ivory truncate">
                {appointment.talentDisplayName}
              </h2>
              <p className="font-body text-meta text-muted-grey">{appointment.reference}</p>
            </div>
            <StatusPill status={appointment.status} />
          </div>

          {(date || time) && (
            <p className="flex items-center gap-1.5 font-body text-helper text-soft-ivory/85">
              <Clock className="w-3.5 h-3.5 text-muted-grey shrink-0" aria-hidden="true" />
              {[date, time].filter(Boolean).join(" · ")}
              {appointment.timeZone && (
                <span className="text-muted-grey"> ({appointment.timeZone})</span>
              )}
            </p>
          )}

          {place && (
            <p className="flex items-center gap-1.5 font-body text-helper text-soft-ivory/75">
              <MapPin className="w-3.5 h-3.5 text-muted-grey shrink-0" aria-hidden="true" />
              <span className="truncate">{place}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1.5">
            <Link
              to={`/app/appointments/${appointment.id}`}
              className="font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
            >
              View appointment
            </Link>
            <Link
              to="/app/messages"
              className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message Management
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ClientAppointments() {
  const [scope, setScope] = useState("Upcoming");
  const [page, setPage] = useState(1);

  const query = useClientAppointments({ scope, page });
  const rows = query.data?.items ?? [];
  const total = query.data?.totalCount ?? 0;
  const pageSize = query.data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="px-5 py-6 space-y-5">
      <div>
        <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">Your diary</p>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Appointments</h1>
        <p className="font-body text-helper text-muted-grey mt-1">
          Arranged for you by Lustra. To change anything, message us.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Appointment scope">
        {SCOPES.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={scope === option.value}
            onClick={() => {
              setScope(option.value);
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full border font-body text-meta tracking-wide-luxe uppercase transition",
              scope === option.value
                ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                : "border-white/10 text-muted-grey hover:text-soft-ivory hover:border-white/25"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {query.isPending && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {query.isError && (
        <Card className="p-5 space-y-3" role="alert">
          <p className="flex items-center gap-2 font-body text-body text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {toUserMessage(query.error)}
          </p>
          <button
            onClick={() => query.refetch()}
            className="inline-flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
        </Card>
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState icon={CalendarCheck} title="Nothing here yet" body={EMPTY_COPY[scope]} />
      )}

      {query.isSuccess && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}

      {query.isSuccess && pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="font-body text-meta text-muted-grey">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3 py-1.5 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {query.isFetching && !query.isPending && (
        <p className="flex items-center gap-2 font-body text-meta text-muted-grey">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Updating…
        </p>
      )}
    </div>
  );
}
