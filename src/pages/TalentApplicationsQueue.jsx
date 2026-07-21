import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, AlertTriangle, RotateCw, Inbox, Images } from "lucide-react";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useTalentApplications } from "@/features/talentApplication/hooks";
import StatusPill, { PUBLISH_PREFERENCE_FILTERS, QUEUE_STATUS_FILTERS } from "@/features/talentApplication/StatusPill";

/**
 * Talent Applications — the Management review queue.
 *
 * Every row comes from `GET /management/talent-applications`. Drafts are not
 * shown because the API does not return them: an application a stranger has
 * started but not submitted is not yet a request for Management's attention,
 * and treating one as submitted would put an unfinished record in front of a
 * reviewer. Nothing here is fabricated — an empty queue renders as empty.
 *
 * Counts come from the server's `totalCount`, never from the length of the page
 * in hand.
 */

const PAGE_SIZE = 25;

const inputCls =
  "w-full bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm " +
  "text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition";

export default function TalentApplicationsQueue() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [publishOnApproval, setPublishOnApproval] = useState("");
  const [fromUtc, setFromUtc] = useState("");
  const [toUtc, setToUtc] = useState("");
  const [page, setPage] = useState(1);

  const filters = {
    search: search || null,
    status: status || null,
    publishOnApproval: publishOnApproval === "" ? null : publishOnApproval === "yes",
    fromUtc: fromUtc ? new Date(fromUtc).toISOString() : null,
    toUtc: toUtc ? new Date(toUtc).toISOString() : null,
    page,
    pageSize: PAGE_SIZE,
  };

  const query = useTalentApplications(filters);
  const rows = query.data?.items ?? [];
  const total = query.data?.totalCount ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetTo = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5">
      <div>
        <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">Management</p>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Talent Applications</h1>
        <p className="font-body text-helper text-muted-grey mt-1">
          {query.isPending
            ? "Loading…"
            : `${total} ${total === 1 ? "application" : "applications"} awaiting or under review`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey"
            strokeWidth={1.2}
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => resetTo(setSearch)(e.target.value)}
            placeholder="Name, display name, email, phone…"
            aria-label="Search applications"
            className={cn(inputCls, "pl-9")}
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">Status</span>
          <select
            value={status}
            onChange={(e) => resetTo(setStatus)(e.target.value)}
            aria-label="Filter by status"
            className={inputCls}
          >
            {QUEUE_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
            Publish preference
          </span>
          <select
            value={publishOnApproval}
            onChange={(e) => resetTo(setPublishOnApproval)(e.target.value)}
            aria-label="Filter by publish preference"
            className={inputCls}
          >
            {PUBLISH_PREFERENCE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">From</span>
          <input
            type="date"
            value={fromUtc}
            onChange={(e) => resetTo(setFromUtc)(e.target.value)}
            aria-label="Submitted from"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">To</span>
          <input
            type="date"
            value={toUtc}
            onChange={(e) => resetTo(setToUtc)(e.target.value)}
            aria-label="Submitted to"
            className={inputCls}
          />
        </label>
      </div>

      {query.isPending && (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
          <span className="font-body text-helper text-muted-grey">Loading applications…</span>
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
          icon={Inbox}
          title="No applications match"
          body="Nothing in the queue for these filters. New applications appear here as soon as an applicant submits one."
        />
      )}

      {query.isSuccess && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Publish preference</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-white/[0.03]">
                  <TableCell>
                    <Link
                      to={`/admin/talent-applications/${row.id}`}
                      className="font-body text-helper text-rose-gold hover:underline"
                    >
                      {row.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-body text-helper text-ivory block">
                      {row.requestedDisplayName}
                    </span>
                    <span className="font-body text-meta text-muted-grey block">
                      {row.legalFullName} · {row.email}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80">
                    {row.cityName || row.cityFreeText || "—"}
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80 tabular-nums">
                    {row.age}
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Images className="w-3.5 h-3.5 text-muted-grey" aria-hidden="true" />
                      {row.photographCount}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80">
                    {/* The applicant's wish, not a decision. */}
                    {row.publishOnApproval ? "Asked to publish" : "No preference to publish"}
                  </TableCell>
                  <TableCell className="font-body text-helper text-soft-ivory/80">
                    {row.submittedAtUtc ? new Date(row.submittedAtUtc).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={row.status} />
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
              className="px-3 py-1.5 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 disabled:opacity-40 hover:border-rose-gold/40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-3 py-1.5 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 disabled:opacity-40 hover:border-rose-gold/40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
