import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Loader2, Search, UserRound } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useManagementConversations } from "@/features/management/hooks";

/**
 * The management inbox — every client conversation, triaged.
 *
 * Lustra is concierge-led, so this list IS the pipeline: clients arrive by pressing
 * Message on a talent, and everything is arranged here. Rows show who is talking, who
 * they are asking about, who owns the thread, and whether it is waiting on a reply.
 *
 * Unread is per reader — a thread a colleague has opened still shows as unread for
 * everyone else, which is what makes the filter usable on a shift.
 */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "unassigned", label: "Unassigned" },
];

export default function ManagementConversations() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const query = useManagementConversations({
    unreadOnly: filter === "unread",
    unassignedOnly: filter === "unassigned",
    search: search.trim() || null,
  });

  const rows = query.data?.items ?? [];

  return (
    <div className="w-full">
      <InternalHeader
        eyebrow="Concierge Console"
        title="Conversations"
        subtitle="Every client conversation. Clients speak to management, never to talent directly."
      />

      <div className="px-5 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-grey"
              strokeWidth={1.4}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or talent…"
              aria-label="Search conversations"
              className="w-full bg-deep-black/60 border border-white/[0.08] rounded-sm pl-9 pr-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
            />
          </div>

          <div className="flex gap-1.5 shrink-0">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "px-3 py-2 rounded-sm text-[0.6rem] tracking-luxe uppercase border transition",
                  filter === option.id
                    ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                    : "border-white/10 text-muted-grey hover:text-ivory hover:border-white/25"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {query.isPending ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : query.isError ? (
          <Card className="p-6">
            <p className="font-body text-sm text-muted-grey">{toUserMessage(query.error)}</p>
          </Card>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No conversations"
            body={
              search.trim()
                ? "Nothing matches that search."
                : filter === "unread"
                  ? "Everything here has been read."
                  : filter === "unassigned"
                    ? "Every conversation has an owner."
                    : "Client conversations will appear here as they arrive."
            }
          />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <Link
                key={row.id}
                to={`/management-conversations/${row.id}`}
                className="block rounded-sm border border-white/[0.06] bg-card-black hover:border-rose-gold/30 transition px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-heading text-base text-ivory truncate">
                      {row.clientDisplayName ?? "Unknown client"}
                    </p>
                    <p className="font-body text-xs text-muted-grey truncate mt-0.5">
                      {row.talentDisplayName
                        ? `About ${row.talentDisplayName}`
                        : row.subject || "General enquiry"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {row.bookingId && (
                      <span
                        title="An appointment has been created"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-success/40 text-success text-[0.5rem] tracking-wide-luxe uppercase"
                      >
                        <CalendarCheck className="w-2.5 h-2.5" strokeWidth={1.5} /> Booked
                      </span>
                    )}
                    {row.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-gold text-noir text-[0.55rem] font-medium">
                        {row.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 mt-2">
                  <p className="font-body text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey/80 truncate">
                    {row.assignedToDisplayName
                      ? `Owned by ${row.assignedToDisplayName}`
                      : "Unassigned"}
                  </p>
                  <p className="font-body text-[0.55rem] text-muted-grey/70 shrink-0">
                    {row.lastMessageAtUtc
                      ? new Date(row.lastMessageAtUtc).toLocaleString()
                      : "No messages yet"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
