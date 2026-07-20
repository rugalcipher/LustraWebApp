import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CalendarPlus, Loader2, Lock } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import MonthGrid from "@/components/lustra/MonthGrid";
import { Card, Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { usePrincipal } from "@/auth/PrincipalContext";
import { formatBookingDate, formatBookingTime } from "@/services/bookingService";
import {
  allowedActions,
  appointmentTone,
  presentAppointmentStatus,
  APPOINTMENT_STATUSES,
} from "@/services/appointmentService";
import {
  useAppointmentCalendar,
  useAppointmentConflicts,
  useAppointment,
  useAppointmentTransition,
  useCancelAppointment,
  useRescheduleAppointment,
} from "@/features/appointments/hooks";

/**
 * The internal appointment calendar.
 *
 * Every entry is an engagement Lustra management arranged and recorded. Nothing here is
 * client-facing: clients have no calendar, no appointment route and no notification that
 * one exists. The talent sees only their own entries, through the talent portal.
 *
 * Talent may reach this page too (they share the internal shell), so the schedule is
 * requested for the caller's own scope by the API — this page never assumes management.
 */

/** Six months either side is enough for planning without pulling the whole history. */
function defaultRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 6, 0);
  return { from: iso(from), to: iso(to) };
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function AgencyCalendar() {
  const [params, setParams] = useSearchParams();
  const { principal } = usePrincipal();
  const isStaff = principal.permissions?.includes("Bookings.Manage") ?? false;

  const [range] = useState(defaultRange);
  const [talentFilter, setTalentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const calendar = useAppointmentCalendar({
    from: range.from,
    to: range.to,
    talentProfileId: talentFilter || null,
  });
  const conflicts = useAppointmentConflicts();

  const selectedId = params.get("appointment");
  const select = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set("appointment", id);
    else next.delete("appointment");
    setParams(next, { replace: true });
  };

  const appointments = useMemo(() => {
    const all = calendar.data ?? [];
    return statusFilter ? all.filter((a) => a.status === statusFilter) : all;
  }, [calendar.data, statusFilter]);

  const byDate = useMemo(() => {
    const map = {};
    for (const appointment of appointments) {
      if (!appointment.confirmedDate) continue;
      (map[appointment.confirmedDate] ||= []).push(appointment);
    }
    return map;
  }, [appointments]);

  /** Talents present in the current window, for the filter. */
  const talents = useMemo(() => {
    const seen = new Map();
    for (const a of calendar.data ?? []) seen.set(a.talentProfileId, a.talentDisplayName);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [calendar.data]);

  const conflictIds = useMemo(() => {
    const ids = new Set();
    for (const c of conflicts.data ?? []) {
      ids.add(c.bookingId);
      ids.add(c.conflictingBookingId);
    }
    return ids;
  }, [conflicts.data]);

  const upcoming = useMemo(() => {
    const today = iso(new Date());
    return appointments
      .filter((a) => a.confirmedDate && a.confirmedDate >= today)
      .sort((a, b) => (a.confirmedDate ?? "").localeCompare(b.confirmedDate ?? ""));
  }, [appointments]);

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Management"
        title="Appointments"
        subtitle="Lustra's internal schedule. Not visible to clients."
      />

      <div className="w-full px-5 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={talentFilter}
            onChange={(e) => setTalentFilter(e.target.value)}
            aria-label="Filter by talent"
            className="bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm text-ivory focus:outline-none focus:border-rose-gold/50 transition"
          >
            <option value="" className="bg-noir">
              All talent
            </option>
            {talents.map(([id, name]) => (
              <option key={id} value={id} className="bg-noir">
                {name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm text-ivory focus:outline-none focus:border-rose-gold/50 transition"
          >
            <option value="" className="bg-noir">
              All statuses
            </option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-noir">
                {presentAppointmentStatus(status)}
              </option>
            ))}
          </select>

          {isStaff && (
            <Link
              to="/management-conversations"
              className="sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm border border-rose-gold/40 text-rose-gold text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition"
            >
              <CalendarPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
              New appointment
            </Link>
          )}
        </div>

        {conflictIds.size > 0 && (
          <Card className="p-4 border-warning/30">
            <p className="inline-flex items-center gap-2 font-body text-sm text-warning">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {conflicts.data.length} scheduling conflict
              {conflicts.data.length === 1 ? "" : "s"} detected — the same talent is double-booked.
            </p>
          </Card>
        )}

        {calendar.isPending ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : calendar.isError ? (
          <Card className="p-6">
            <p className="font-body text-sm text-muted-grey">{toUserMessage(calendar.error)}</p>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <MonthGrid
                dayStatus={(_date, day) => (byDate[day] ? "event" : null)}
                dayContent={(_date, day) => {
                  const list = byDate[day];
                  if (!list) return null;
                  return (
                    <div className="space-y-0.5 mt-0.5">
                      {list.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            select(a.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              e.preventDefault();
                              select(a.id);
                            }
                          }}
                          className={cn(
                            "text-[0.5rem] font-body truncate rounded-sm px-1 py-0.5 leading-tight border cursor-pointer",
                            conflictIds.has(a.id)
                              ? "text-warning bg-warning/15 border-warning/30"
                              : "text-rose-gold bg-rose-gold/15 border-rose-gold/20"
                          )}
                        >
                          {a.talentDisplayName}
                        </div>
                      ))}
                      {list.length > 2 && (
                        <p className="text-[0.5rem] text-muted-grey">+{list.length - 2} more</p>
                      )}
                    </div>
                  );
                }}
              />
            </Card>

            <Card className="p-4">
              <Eyebrow>Upcoming</Eyebrow>
              {upcoming.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title="Nothing scheduled"
                    body="Appointments appear here once management records them from a conversation."
                  />
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  {upcoming.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => select(a.id)}
                      className="w-full flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0 text-left hover:bg-white/[0.02] -mx-2 px-2 rounded-sm transition"
                    >
                      <div className="min-w-0">
                        <p className="font-body text-sm text-ivory truncate">
                          {a.talentDisplayName}
                          {conflictIds.has(a.id) && (
                            <span className="ml-2 text-[0.55rem] tracking-luxe uppercase text-warning">
                              Conflict
                            </span>
                          )}
                        </p>
                        <p className="font-body text-[0.65rem] text-muted-grey mt-0.5 truncate">
                          {a.bookingReference} · {presentAppointmentStatus(a.status)}
                          {a.startTime ? ` · ${formatBookingTime(a.startTime)}` : ""}
                        </p>
                      </div>
                      <span className="font-heading text-base text-light-rose-gold shrink-0">
                        {formatBookingDate(a.confirmedDate)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {selectedId && (
          <AppointmentDetail id={selectedId} isStaff={isStaff} onClose={() => select(null)} />
        )}
      </div>
    </div>
  );
}

/**
 * The full internal record, with the lifecycle actions management may take.
 *
 * Only the actions the backend will accept from the current status are offered — the
 * server is still the authority, this just avoids buttons that are certain to be refused.
 */
function AppointmentDetail({ id, isStaff, onClose }) {
  const query = useAppointment(id);
  const appointment = query.data;
  const conversationId = appointment?.conversationId ?? null;

  const transition = useAppointmentTransition(conversationId);
  const cancel = useCancelAppointment(conversationId);
  const reschedule = useRescheduleAppointment(conversationId);

  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState({ confirmedDate: "", startTime: "", endTime: "" });

  const run = async (fn, successTitle) => {
    try {
      await fn();
      toast({ title: successTitle });
      setMode(null);
    } catch (err) {
      toast({ title: "Couldn't update", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const actions = appointment ? allowedActions(appointment.status) : [];
  const busy = transition.isPending || cancel.isPending || reschedule.isPending;

  return (
    <div
      className="fixed inset-0 z-50 bg-noir/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {query.isPending ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : query.isError || !appointment ? (
          <p className="font-body text-sm text-muted-grey py-6">{toUserMessage(query.error)}</p>
        ) : (
          <>
            <Eyebrow>{formatBookingDate(appointment.confirmedDate)}</Eyebrow>
            <p className="font-heading text-2xl text-ivory mt-1">{appointment.talentDisplayName}</p>
            <p className="font-body text-sm text-muted-grey mt-1">
              {appointment.engagementCategory} · {appointment.bookingReference}
            </p>

            <span
              className={cn(
                "inline-block mt-3 px-2.5 py-1 rounded-full text-[0.55rem] tracking-wide-luxe uppercase border",
                appointmentTone(appointment.status) === "confirmed" && "border-rose-gold/40 text-rose-gold",
                appointmentTone(appointment.status) === "active" && "border-success/40 text-success",
                appointmentTone(appointment.status) === "closed" && "border-white/15 text-muted-grey",
                appointmentTone(appointment.status) === "warning" && "border-warning/40 text-warning",
                appointmentTone(appointment.status) === "neutral" && "border-white/15 text-muted-grey"
              )}
            >
              {presentAppointmentStatus(appointment.status)}
            </span>

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Time">
                {appointment.startTime
                  ? `${formatBookingTime(appointment.startTime)}${
                      appointment.endTime ? ` – ${formatBookingTime(appointment.endTime)}` : ""
                    }`
                  : "—"}
              </Row>
              <Row label="Venue">{appointment.venueName || "—"}</Row>
              <Row label="Area">{appointment.generalLocation || "—"}</Row>
            </div>

            {appointment.privateLocationDetails && (
              <div className="mt-4 pt-3 border-t border-rose-gold/20">
                <p className="inline-flex items-center gap-1.5 text-[0.5rem] tracking-wide-luxe uppercase text-rose-gold">
                  <Lock className="w-2.5 h-2.5" strokeWidth={1.4} /> Confidential address
                </p>
                <p className="font-body text-sm text-soft-ivory/90 mt-1">
                  {appointment.privateLocationDetails}
                </p>
              </div>
            )}

            {appointment.talentInstructions && (
              <div className="mt-4">
                <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey">
                  Talent instructions
                </p>
                <p className="font-body text-sm text-soft-ivory/90 mt-1 whitespace-pre-line">
                  {appointment.talentInstructions}
                </p>
              </div>
            )}

            {conversationId && (
              <Link
                to={`/management-conversations/${conversationId}`}
                className="mt-4 inline-block font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold hover:underline"
              >
                Open the conversation
              </Link>
            )}

            {isStaff && actions.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                {mode === "cancel" ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!reason.trim()) return;
                      run(
                        () => cancel.mutateAsync({ bookingId: id, reason: reason.trim() }),
                        "Appointment cancelled"
                      );
                    }}
                  >
                    <label className="block text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mb-1.5">
                      Reason (internal)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      className="w-full bg-deep-black/60 border border-white/[0.08] rounded-sm p-3 font-body text-sm text-ivory focus:outline-none focus:border-rose-gold/50 resize-none"
                    />
                    <p className="mt-1.5 text-[0.5rem] text-muted-grey">
                      Kept on the record. The talent is told the appointment is cancelled, not why.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <ActionButton type="submit" disabled={!reason.trim() || busy}>
                        Confirm cancellation
                      </ActionButton>
                      <ActionButton type="button" onClick={() => setMode(null)}>
                        Back
                      </ActionButton>
                    </div>
                  </form>
                ) : mode === "reschedule" ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(
                        () =>
                          reschedule.mutateAsync({
                            bookingId: id,
                            confirmedDate: when.confirmedDate || null,
                            startTime: when.startTime ? `${when.startTime}:00` : null,
                            endTime: when.endTime ? `${when.endTime}:00` : null,
                            durationMinutes: null,
                          }),
                        "Appointment rescheduled"
                      );
                    }}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="date"
                        value={when.confirmedDate}
                        onChange={(e) => setWhen((w) => ({ ...w, confirmedDate: e.target.value }))}
                        aria-label="New date"
                        className="col-span-3 bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2 font-body text-sm text-ivory focus:outline-none focus:border-rose-gold/50"
                      />
                      <input
                        type="time"
                        value={when.startTime}
                        onChange={(e) => setWhen((w) => ({ ...w, startTime: e.target.value }))}
                        aria-label="New start time"
                        className="col-span-1 bg-deep-black/60 border border-white/[0.08] rounded-sm px-2 py-2 font-body text-sm text-ivory focus:outline-none focus:border-rose-gold/50"
                      />
                      <input
                        type="time"
                        value={when.endTime}
                        onChange={(e) => setWhen((w) => ({ ...w, endTime: e.target.value }))}
                        aria-label="New end time"
                        className="col-span-1 bg-deep-black/60 border border-white/[0.08] rounded-sm px-2 py-2 font-body text-sm text-ivory focus:outline-none focus:border-rose-gold/50"
                      />
                    </div>
                    <p className="mt-1.5 text-[0.5rem] text-muted-grey">
                      The talent is notified of the new time. The client is not.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <ActionButton type="submit" disabled={!when.confirmedDate || busy}>
                        Save new time
                      </ActionButton>
                      <ActionButton type="button" onClick={() => setMode(null)}>
                        Back
                      </ActionButton>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {actions.includes("start") && (
                      <ActionButton
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => transition.mutateAsync({ bookingId: id, action: "start" }),
                            "Marked as started"
                          )
                        }
                      >
                        Mark started
                      </ActionButton>
                    )}
                    {actions.includes("complete") && (
                      <ActionButton
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => transition.mutateAsync({ bookingId: id, action: "complete" }),
                            "Marked as completed"
                          )
                        }
                      >
                        Mark completed
                      </ActionButton>
                    )}
                    {actions.includes("no-show") && (
                      <ActionButton
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => transition.mutateAsync({ bookingId: id, action: "no-show" }),
                            "Recorded as a no-show"
                          )
                        }
                      >
                        No-show
                      </ActionButton>
                    )}
                    {actions.includes("reschedule") && (
                      <ActionButton disabled={busy} onClick={() => setMode("reschedule")}>
                        Reschedule
                      </ActionButton>
                    )}
                    {actions.includes("cancel") && (
                      <ActionButton disabled={busy} onClick={() => setMode("cancel")}>
                        Cancel
                      </ActionButton>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-5 w-full text-[0.6rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 rounded-sm py-2.5 hover:bg-rose-gold/10 transition"
            >
              Close
            </button>
          </>
        )}
      </Card>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-grey shrink-0">{label}</span>
      <span className="text-ivory text-right">{children}</span>
    </div>
  );
}

function ActionButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="px-3 py-2 rounded-sm border border-white/15 text-muted-grey hover:text-ivory hover:border-white/30 text-[0.6rem] tracking-luxe uppercase transition disabled:opacity-40"
    >
      {children}
    </button>
  );
}
