import React, { useState } from "react";
import { ScrollText, Loader2, Search } from "lucide-react";
import { Card, Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { toUserMessage } from "@/api/problemDetails";
import { useAuditLogs } from "@/features/admin/hooks";

/**
 * Admin → Audit Log. Real entries from `/admin/audit-logs`.
 *
 * This page was an honest "awaiting backend integration" placeholder — it never showed
 * fabricated events, which was the right call at the time. The endpoint exists now, so
 * the placeholder was simply out of date and hiding a working audit trail.
 *
 * Entries are read-only by design: an audit record that can be edited from the console it
 * audits is not evidence of anything.
 */
export default function AdminAudit() {
  const [action, setAction] = useState("");
  const logs = useAuditLogs({ action: action || null });
  const rows = logs.data?.items ?? [];

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 w-full">
      <div className="mb-6">
        <Eyebrow>Administrator</Eyebrow>
        <h1 className="font-heading font-light text-3xl lg:text-4xl text-ivory mt-1">Audit Log</h1>
        <p className="font-body text-sm text-muted-grey mt-2 max-w-2xl">
          A record of administrative and moderation actions across the platform. Read-only.
        </p>
      </div>

      <div className="relative w-full sm:w-80 mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey"
          strokeWidth={1.2}
        />
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action…"
          aria-label="Filter audit entries by action"
          className="w-full bg-deep-black/60 border border-white/[0.08] rounded-sm pl-9 pr-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
        />
      </div>

      {logs.isPending ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : logs.isError ? (
        <Card className="p-6">
          <p className="font-body text-sm text-muted-grey">{toUserMessage(logs.error)}</p>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={action ? "No matching entries" : "No audit entries yet"}
          body={
            action
              ? "Try a different action name."
              : "Administrative and moderation actions are recorded here as they happen."
          }
        />
      ) : (
        <Card className="p-4">
          <div className="space-y-1">
            {rows.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.04] last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-body text-sm text-ivory">
                    <span className="text-rose-gold">{entry.action}</span>
                    <span className="text-muted-grey"> · {entry.entityType}</span>
                  </p>
                  <p className="font-body text-[0.7rem] text-soft-ivory/70 mt-0.5 leading-relaxed">
                    {entry.summary}
                  </p>
                  <p className="font-body text-[0.55rem] text-muted-grey/70 mt-1">
                    {entry.actorDisplay ?? "System"}
                    {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                  </p>
                </div>
                <p className="font-body text-[0.6rem] text-muted-grey shrink-0">
                  {new Date(entry.createdAtUtc).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
