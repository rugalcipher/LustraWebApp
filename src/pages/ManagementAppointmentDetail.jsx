import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, RotateCw, Eye, EyeOff, Lock, UserRoundCog,
  Play, CheckCircle2, UserX, CalendarClock, Ban, MessagesSquare,
} from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import ConfirmAction from "@/features/talentApplication/ConfirmAction";
import VisibilityHistory from "@/features/appointments/VisibilityHistory";
import TalentPicker from "@/features/talentAdmin/TalentPicker";
import {
  useAppointment, useAppointmentTransition, useCancelAppointment, useRescheduleAppointment,
  useSetAppointmentClientVisibility, useReassignAppointmentTalent, useAddAppointmentNote,
  useUpdateAppointmentAddress,
} from "@/features/appointments/hooks";
import { presentAppointmentStatus, appointmentTone, allowedActions } from "@/services/appointmentService";
import { formatMinor } from "@/services/talentGradeService";
import AddressAutocomplete from "@/components/address/AddressAutocomplete";
import { EMPTY_ADDRESS_INPUT, isAddressEmpty, toAddressInput, formatAddressLine } from "@/domain/address";

/**
 * One appointment, for Management.
 *
 * This is the full operational record — private location, recorded amounts,
 * talent instructions and internal notes. None of it reaches the client: their
 * view is `ClientAppointmentDto`, a separate shape served by a separate
 * endpoint, and nothing on this page writes to it.
 *
 * Client visibility is treated as consequential in both directions. Revealing an
 * appointment notifies the client; concealing one deliberately does not, because
 * announcing a disappearance would disclose exactly what concealing it
 * withholds. Both therefore go through a confirmation and record a reason for
 * other staff.
 */

const TONE = {
  confirmed: "border-rose-gold/40 text-rose-gold bg-rose-gold/10",
  active: "border-success/40 text-success bg-success/10",
  closed: "border-white/15 text-soft-ivory/70 bg-white/[0.03]",
  warning: "border-warning/40 text-warning bg-warning/10",
  neutral: "border-white/15 text-muted-grey bg-white/[0.03]",
};

const inputCls =
  "w-full bg-deep-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body " +
  "text-ivory focus:outline-none focus:border-rose-gold/50";

function Rows({ entries }) {
  return (
    <dl className="divide-y divide-white/[0.06]">
      {entries
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{label}</dt>
            <dd className="font-body text-helper text-soft-ivory/85 text-right break-words">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/**
 * The management-only financial breakdown for a priced booking.
 *
 * Shows the full picture — client rate and total, talent payout, and the gross margin
 * between them — that only management may see. The client's and talent's own views each
 * carry a single slice of this and never the margin, enforced by separate server-side
 * projections; this card is the one place all three figures sit together.
 */
function FinancialsCard({ financials: f }) {
  const currency = f.currencyCode;
  return (
    <Card className="p-5 space-y-3 border-rose-gold/20">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-ivory">Financials</h2>
        {f.pricingOverridden && (
          <span className="font-body text-meta tracking-luxe uppercase px-2 py-0.5 rounded-full border border-warning/40 text-warning">
            Overridden
          </span>
        )}
      </div>
      <p className="font-body text-meta tracking-wide-luxe uppercase text-rose-gold/90">
        Management only — the client sees the total, the talent sees the payout
      </p>
      <Rows
        entries={[
          ["Client rate / hr", formatMinor(f.clientHourlyRateMinor, currency)],
          ["Client total", formatMinor(f.clientTotalMinor, currency)],
          ["Talent payout / hr", formatMinor(f.talentHourlyPayoutMinor, currency)],
          ["Talent total payout", formatMinor(f.talentTotalPayoutMinor, currency)],
          ["Pricing", f.gradeName ? `${f.pricingMode} · ${f.gradeName}` : f.pricingMode],
        ]}
      />
      <div className="flex items-baseline justify-between gap-4 pt-2 border-t border-white/10">
        <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
          Gross margin
        </span>
        <span className="font-heading text-lg text-success whitespace-nowrap">
          {formatMinor(f.grossMarginMinor, currency)}
        </span>
      </div>
      {f.pricingOverridden && f.pricingOverrideReason && (
        <p className="font-body text-helper text-soft-ivory/70 leading-relaxed">
          <span className="text-muted-grey">Override reason: </span>
          {f.pricingOverrideReason}
        </p>
      )}
    </Card>
  );
}

/**
 * The appointment's structured address snapshot — display, edit and clear.
 *
 * Editing here is a deliberate management change to THIS appointment's snapshot. It never
 * touches any client saved address the snapshot was copied from, and it clears the snapshot's
 * source link — exactly the backend's `PUT .../address` contract. Exact coordinates in the
 * snapshot are staff/assigned-talent only and never reach the client's view.
 */
function AddressSnapshotEditor({ appointment, conversationId }) {
  const snapshot = appointment.addressSnapshot;
  const update = useUpdateAppointmentAddress(conversationId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDRESS_INPUT);

  const startEdit = () => {
    setForm(snapshot ? { ...snapshot } : EMPTY_ADDRESS_INPUT);
    setEditing(true);
  };

  const save = async () => {
    try {
      await update.mutateAsync({
        bookingId: appointment.id,
        address: isAddressEmpty(form) ? null : toAddressInput(form),
      });
      setEditing(false);
      toast({ title: "Address updated" });
    } catch (err) {
      toast({ title: "Couldn't update the address", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="pt-2 border-t border-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">Structured address</p>
        {!editing && (
          <button
            onClick={startEdit}
            className="font-body text-meta tracking-luxe uppercase text-rose-gold/80 hover:text-rose-gold"
          >
            {snapshot ? "Edit" : "Add"}
          </button>
        )}
      </div>

      {!editing ? (
        <p className="font-body text-helper text-soft-ivory/85 mt-1 break-words">
          {formatAddressLine(snapshot) || "Not set"}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <AddressAutocomplete value={form} onChange={setForm} idPrefix="mgmt-appt-addr" label="Search the address" />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={update.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-rose-gold/15 border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/25 disabled:opacity-50"
            >
              {update.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save address
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-sm border border-white/15 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 hover:text-ivory"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagementAppointmentDetail() {
  const { id } = useParams();
  const query = useAppointment(id);

  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [note, setNote] = useState("");
  const [reassignTo, setReassignTo] = useState(null);
  const [schedule, setSchedule] = useState({ confirmedDate: "", startTime: "", endTime: "" });

  const transition = useAppointmentTransition();
  const cancel = useCancelAppointment();
  const reschedule = useRescheduleAppointment();
  const setVisibility = useSetAppointmentClientVisibility(id);
  const reassign = useReassignAppointmentTalent(id);
  const addNote = useAddAppointmentNote(id);

  const busy =
    transition.isPending || cancel.isPending || reschedule.isPending ||
    setVisibility.isPending || reassign.isPending;

  const close = () => {
    setDialog(null);
    setActionError("");
  };

  async function confirm(reason) {
    try {
      setActionError("");
      if (dialog === "show") await setVisibility.mutateAsync({ visible: true, internalReason: reason });
      else if (dialog === "hide") await setVisibility.mutateAsync({ visible: false, internalReason: reason });
      else if (dialog === "cancel") await cancel.mutateAsync({ bookingId: id, reason });
      else if (dialog === "start") await transition.mutateAsync({ bookingId: id, action: "start" });
      else if (dialog === "complete") await transition.mutateAsync({ bookingId: id, action: "complete" });
      else if (dialog === "no-show") await transition.mutateAsync({ bookingId: id, action: "no-show" });
      else if (dialog === "reassign") {
        await reassign.mutateAsync({ talentProfileId: reassignTo, reason });
        setReassignTo(null);
      } else if (dialog === "reschedule") {
        await reschedule.mutateAsync({
          bookingId: id,
          confirmedDate: schedule.confirmedDate || null,
          startTime: schedule.startTime || null,
          endTime: schedule.endTime || null,
        });
      }
      close();
    } catch (error) {
      setActionError(toUserMessage(error));
    }
  }

  if (query.isPending) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading appointment…</span>
        </Card>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="px-5 lg:px-8 py-6">
        <Card className="p-6 space-y-3" role="alert">
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
      </div>
    );
  }

  const appointment = query.data;
  const actions = allowedActions(appointment.status);
  const visible = appointment.isVisibleToClient;

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <Link
        to="/admin/appointments"
        className="inline-flex items-center gap-1.5 font-body text-meta tracking-luxe uppercase text-muted-grey hover:text-rose-gold"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Appointments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">
            {appointment.bookingReference}
          </p>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">
            {appointment.talentDisplayName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block px-2.5 py-1 rounded-full border font-body text-meta tracking-wide-luxe uppercase",
              TONE[appointmentTone(appointment.status)]
            )}
          >
            {presentAppointmentStatus(appointment.status)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-body text-meta tracking-wide-luxe uppercase",
              visible
                ? "border-success/40 text-success bg-success/10"
                : "border-warning/40 text-warning bg-warning/10"
            )}
          >
            {visible ? (
              <>
                <Eye className="w-3 h-3" aria-hidden="true" /> Visible to client
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" aria-hidden="true" /> Hidden from client
              </>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5">
        <div className="space-y-5 min-w-0">
          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Schedule and place</h2>
            <Rows
              entries={[
                ["Date", appointment.confirmedDate ?? "Unscheduled"],
                [
                  "Time",
                  appointment.startTime
                    ? `${appointment.startTime.slice(0, 5)}${
                        appointment.endTime ? ` – ${appointment.endTime.slice(0, 5)}` : ""
                      }`
                    : null,
                ],
                ["Duration", appointment.durationMinutes ? `${appointment.durationMinutes} minutes` : null],
                ["Time zone", appointment.timeZone],
                ["Engagement", appointment.engagementCategory],
                ["Venue", appointment.venueName],
                ["General location", appointment.generalLocation],
              ]}
            />
          </Card>

          {/* Staff-only. The client's own view carries none of this. */}
          <Card className="p-5 space-y-3 border-warning/20">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-warning" aria-hidden="true" />
              <h2 className="font-heading text-lg text-ivory">Internal</h2>
            </div>
            <p className="font-body text-meta tracking-wide-luxe uppercase text-warning">
              Management only — never shown to the client
            </p>
            <Rows
              entries={[
                ["Private location", appointment.privateLocationDetails],
                [
                  "Recorded amount",
                  appointment.agreedAmount != null
                    ? `${appointment.currencyCode} ${Number(appointment.agreedAmount).toLocaleString()}`
                    : null,
                ],
                [
                  "Additional costs",
                  appointment.additionalCosts != null
                    ? `${appointment.currencyCode} ${Number(appointment.additionalCosts).toLocaleString()}`
                    : null,
                ],
                ["Settlement", appointment.settlementStatus],
                ["Talent instructions", appointment.talentInstructions],
              ]}
            />

            <AddressSnapshotEditor appointment={appointment} conversationId={appointment.conversationId} />

            {appointment.internalNotes?.length > 0 && (
              <ul className="space-y-2 pt-1">
                {appointment.internalNotes.map((n) => (
                  <li key={n.id} className="rounded-sm border border-white/10 p-3">
                    <p className="font-body text-body text-soft-ivory/85 whitespace-pre-line">{n.note}</p>
                    <p className="font-body text-meta text-muted-grey mt-1">
                      {new Date(n.createdAtUtc).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                try {
                  await addNote.mutateAsync(note.trim());
                  setNote("");
                } catch (error) {
                  setActionError(toUserMessage(error));
                }
              }}
              className="space-y-2"
            >
              <label htmlFor="internal-note" className="sr-only">
                Add an internal note
              </label>
              <textarea
                id="internal-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an internal note…"
                className={inputCls}
              />
              <button
                type="submit"
                disabled={addNote.isPending || !note.trim()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-rose-gold/40 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10 disabled:opacity-40"
              >
                {addNote.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                Add note
              </button>
            </form>
          </Card>

          {/*
            The full financial breakdown — MANAGEMENT ONLY. This shape is served on the
            management booking DTO alone; the client's and talent's views each carry only
            their own slice and never the margin. The immutable snapshot was captured when the
            booking was priced, so a later grade change does not move these figures.
          */}
          {appointment.financials && (
            <FinancialsCard financials={appointment.financials} />
          )}

          {appointment.clientVisibleNotes && (
            <Card className="p-5 space-y-2">
              <h2 className="font-heading text-lg text-ivory">Notes the client sees</h2>
              <p className="font-body text-body text-soft-ivory/85 whitespace-pre-line">
                {appointment.clientVisibleNotes}
              </p>
            </Card>
          )}

          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Client visibility history</h2>
            <VisibilityHistory appointmentId={id} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Client visibility</h2>
            <p className="font-body text-meta text-muted-grey">
              {visible
                ? "The client can see this appointment in their diary."
                : "The client cannot see this appointment. They are not told it exists."}
            </p>
            {visible ? (
              <button
                onClick={() => setDialog("hide")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-warning/40 font-body text-meta tracking-luxe uppercase text-warning hover:bg-warning/10 disabled:opacity-40"
              >
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Hide from client
              </button>
            ) : (
              <button
                onClick={() => setDialog("show")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-success/40 font-body text-meta tracking-luxe uppercase text-success hover:bg-success/10 disabled:opacity-40"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Show to client
              </button>
            )}
          </Card>

          <Card className="p-5 space-y-2">
            <h2 className="font-heading text-lg text-ivory">Actions</h2>

            {actions.includes("reschedule") && (
              <button
                onClick={() => setDialog("reschedule")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40 disabled:opacity-40"
              >
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" /> Reschedule
              </button>
            )}
            <button
              onClick={() => setDialog("reassign")}
              disabled={busy}
              className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40 disabled:opacity-40"
            >
              <UserRoundCog className="w-3.5 h-3.5" aria-hidden="true" /> Reassign talent
            </button>
            {actions.includes("start") && (
              <button
                onClick={() => setDialog("start")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" /> Start
              </button>
            )}
            {actions.includes("complete") && (
              <button
                onClick={() => setDialog("complete")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-success/40 font-body text-meta tracking-luxe uppercase text-success hover:bg-success/10 disabled:opacity-40"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Complete
              </button>
            )}
            {actions.includes("no-show") && (
              <button
                onClick={() => setDialog("no-show")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-warning/40 font-body text-meta tracking-luxe uppercase text-warning hover:bg-warning/10 disabled:opacity-40"
              >
                <UserX className="w-3.5 h-3.5" aria-hidden="true" /> No-show
              </button>
            )}
            {actions.includes("cancel") && (
              <button
                onClick={() => setDialog("cancel")}
                disabled={busy}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-destructive/40 font-body text-meta tracking-luxe uppercase text-destructive hover:bg-destructive/10 disabled:opacity-40"
              >
                <Ban className="w-3.5 h-3.5" aria-hidden="true" /> Cancel
              </button>
            )}

            {appointment.bookingConversationId && (
              <Link
                to={`/management-conversations/${appointment.bookingConversationId}`}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-rose-gold/40 bg-rose-gold/10 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/20"
              >
                <MessagesSquare className="w-3.5 h-3.5" aria-hidden="true" /> Booking conversation
              </Link>
            )}

            {appointment.conversationId && (
              <Link
                to={`/management-conversations/${appointment.conversationId}`}
                className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/12 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
              >
                <MessagesSquare className="w-3.5 h-3.5" aria-hidden="true" /> Inquiry conversation
              </Link>
            )}

            {actionError && !dialog && (
              <p className="font-body text-meta text-destructive" role="alert">
                {actionError}
              </p>
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-heading text-lg text-ivory">Status history</h2>
            <ol className="space-y-2">
              {(appointment.history ?? []).map((h, index) => (
                <li key={`${h.toStatus}-${index}`} className="flex justify-between gap-4">
                  <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                    {presentAppointmentStatus(h.toStatus)}
                  </span>
                  <span className="font-body text-helper text-soft-ivory/85">
                    {new Date(h.createdAtUtc).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <ConfirmAction
        open={dialog === "show"}
        title="Show to client"
        description="The client will see this appointment in their diary and will be notified that it is there."
        confirmLabel="Show to client"
        reason
        reasonLabel="Internal reason"
        reasonHint="Recorded on the visibility history for other staff. The client never sees it."
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "hide"}
        title="Hide from client"
        description="The client will no longer see this appointment. They are deliberately NOT notified — announcing its disappearance would disclose what hiding it withholds."
        confirmLabel="Hide from client"
        tone="destructive"
        reason
        reasonLabel="Internal reason"
        reasonHint="Recorded on the visibility history for other staff. The client never sees it."
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "reassign"}
        title="Reassign talent"
        description="Moves this appointment to a different talent. The reason is recorded against the appointment."
        confirmLabel="Reassign"
        reason
        reasonLabel="Reason"
        onConfirm={confirm}
        onCancel={close}
        busy={busy || !reassignTo}
        error={actionError}
      >
        {/* Searched, not typed. A pasted GUID cannot be checked by eye, and one
            wrong digit reassigns the appointment to a different person. */}
        <TalentPicker
          label="New talent"
          value={reassignTo}
          onChange={setReassignTo}
          excludeProfileId={appointment.talentProfileId}
          required
        />
      </ConfirmAction>

      <ConfirmAction
        open={dialog === "reschedule"}
        title="Reschedule appointment"
        description="Moves the appointment. The talent's schedule and any conflicts are re-checked by the server."
        confirmLabel="Reschedule"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      >
        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1.5">
            <span className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
              Date
            </span>
            <input
              type="date"
              value={schedule.confirmedDate}
              onChange={(e) => setSchedule((s) => ({ ...s, confirmedDate: e.target.value }))}
              className={inputCls}
            />
          </label>
          <label className="space-y-1.5">
            <span className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
              From
            </span>
            <input
              type="time"
              value={schedule.startTime}
              onChange={(e) => setSchedule((s) => ({ ...s, startTime: e.target.value }))}
              className={inputCls}
            />
          </label>
          <label className="space-y-1.5">
            <span className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
              To
            </span>
            <input
              type="time"
              value={schedule.endTime}
              onChange={(e) => setSchedule((s) => ({ ...s, endTime: e.target.value }))}
              className={inputCls}
            />
          </label>
        </div>
      </ConfirmAction>

      <ConfirmAction
        open={dialog === "cancel"}
        title="Cancel appointment"
        description="This cancels the appointment. The reason is recorded against it."
        confirmLabel="Cancel appointment"
        tone="destructive"
        reason
        reasonLabel="Reason"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "start"}
        title="Start appointment"
        description="Marks the appointment as in progress."
        confirmLabel="Start"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "complete"}
        title="Complete appointment"
        description="Marks the appointment as completed."
        confirmLabel="Complete"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />

      <ConfirmAction
        open={dialog === "no-show"}
        title="Mark as no-show"
        description="Records that the appointment did not take place because someone did not attend."
        confirmLabel="Mark no-show"
        tone="destructive"
        onConfirm={confirm}
        onCancel={close}
        busy={busy}
        error={actionError}
      />
    </div>
  );
}
