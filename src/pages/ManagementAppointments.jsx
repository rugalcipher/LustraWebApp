import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Loader2, AlertTriangle, RotateCw, CalendarRange, Eye, EyeOff } from "lucide-react";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useAppointments } from "@/features/appointments/hooks";
import {
  APPOINTMENT_STATUSES, presentAppointmentStatus, appointmentTone,
} from "@/services/appointmentService";

/**
 * The Management appointment register.
 *
 * Every row is a real booking from `GET /management/bookings`. The visibility
 * column is the operational point of the page: an appointment concealed from its
 * client is a deliberate state that someone has to be able to find again, so it
 * is both filterable and shown on every row rather than buried in a detail view.
 */

const PAGE_SIZE = 50;

const TONE = {
  confirmed: "border-rose-gold/40 text-rose-gold bg-rose-gold/10",
  active: "border-success/40 text-success bg-success/10",
  closed: "border-white/15 text-soft-ivory/70 bg-white/[0.03]",
  warning: "border-warning/40 text-warning bg-warning/10",
  neutral: "border-white/15 text-muted-grey bg-white/[0.03]",
};

const VISIBILITY_FILTERS = [
  { value: "", label: "Client visibility: any" },
  { value: "true", label: "Visible to client" },
  { value: "false", label: "Hidden from client" },
];

const inputCls =
  "bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm " +
  "text-ivory focus:outline-none focus:border-rose-gold/50 transition";

function money(amount, currency) {
  if (amount == null) return "—";
  return `${currency ?? ""} ${Number(amount).toLocaleString()}`.trim();
}

export default function ManagementAppointments() {
  const [status, setStatus] = useState("");
  const [visibility, setVisibility] = useState("");
  const [page, setPage] = useState(1);

  const filters = {
    status: status || null,
    isVisibleToClient: visibility === "" ? null : visibility === "true",
    page,
  };
  const query = useAppointments(filters);
  const rows = query.data?.items ?? [];
  const total = query.data?.totalCount ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const change = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">Operations</p>
          <h1 className="font-heading font-light text-3xl text-ivory mt-1">Appointments</h1>
          <p className="font-body text-helper text-muted-grey mt-1">
            {query.isPending
              ? "Loading…"
              : `${total} ${total === 1 ? "appointment" : "appointments"}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/calendar"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40"
          >
            <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" /> Calendar
          </Link>
          <Link
            to="/create-appointment"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-rose-gold/50 font-body text-meta tracking-luxe uppercase text-rose-gold hover:bg-rose-gold/10"
          >
            <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" /> Record appointment
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">Status</span>
          <select value={status} onChange={change(setStatus)} aria-label="Filter by status" className={inputCls}>
            <option value="">All statuses</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {presentAppointmentStatus(s)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
            Client visibility
          </span>
          <select
            value={visibility}
            onChange={change(setVisibility)}
            aria-label="Filter by client visibility"
            className={inputCls}
          >
            {VISIBILITY_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {query.isPending && (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading appointments…</span>
        </Card>
      )}

      {query.isError && (
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
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={CalendarRange}
          title="No appointments match"
          body="Nothing in the register for these filters."
        />
      )}

      {query.isSuccess && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Talent</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client visibility</TableHead>
                <TableHead>Recorded amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-white/[0.03]">
                  <TableCell>
                    <Link
                      to={`/admin/appointments/${row.id}`}
                      className="font-body text-helper text-rose-gold hover:underline"
                    >
                      {row.bookingReference}
                    </Link>
                  </TableCell>
                  <TableCell className="font-body text-helper text-ivory">
                    {row.talentDisplayName}
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80">
                    {row.confirmedDate
                      ? `${row.confirmedDate}${row.startTime ? ` · ${row.startTime.slice(0, 5)}` : ""}`
                      : "Unscheduled"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block px-2.5 py-1 rounded-full border font-body text-meta tracking-wide-luxe uppercase whitespace-nowrap",
                        TONE[appointmentTone(row.status)]
                      )}
                    >
                      {presentAppointmentStatus(row.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-body text-helper",
                        row.isVisibleToClient ? "text-soft-ivory/80" : "text-warning"
                      )}
                    >
                      {row.isVisibleToClient ? (
                        <>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Hidden
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80 tabular-nums">
                    {money(row.agreedAmount, row.currencyCode)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
    </div>
  );
}
