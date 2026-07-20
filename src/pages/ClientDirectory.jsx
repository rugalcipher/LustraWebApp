import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, Mail, MapPin, Phone, CalendarDays, MessagesSquare, Crown, Loader2 } from "lucide-react";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import {
  useManagementClients,
  useManagementClientConversations,
} from "@/features/management/hooks";

/**
 * Client Directory — a Management OPERATIONAL TOOL.
 *
 * It exists so staff can find the person they are talking to and open the conversation.
 * It is NOT a booking system: nothing here creates, confirms or schedules an engagement,
 * and the appointment record stays on the management calendar where only staff reach it.
 * The detail panel links out to conversations; that is the point of the page.
 *
 * Everything shown is a safe summary management is authorised to hold. None of it may be
 * forwarded to a talent — management is always the intermediary.
 */

const STATUS_FILTERS = ["All", "Verified", "Pending review"];

export default function ClientDirectory() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(/** @type {string|null} */ (null));

  // Search runs server-side; the status pill filters the page in hand, because
  // verification is not a server-side filter on this endpoint.
  const clients = useManagementClients({ search: query || null });
  const rows = (clients.data?.items ?? []).filter((c) =>
    status === "All" ? true : status === "Verified" ? c.isVerified : !c.isVerified
  );

  const selected = rows.find((c) => c.userId === selectedId) ?? null;

  return (
    <div className="min-h-full flex flex-col xl:flex-row">
      {/* Main list column */}
      <div className="flex-1 min-w-0 px-5 lg:px-8 py-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold/80">Management</p>
              <h1 className="font-heading font-light text-3xl text-ivory mt-1">Client Directory</h1>
              <p className="font-body text-sm text-muted-grey mt-1">
                {clients.isPending
                  ? "Loading…"
                  : `${rows.length} of ${clients.data?.totalCount ?? rows.length} clients`}
              </p>
            </div>
          </div>

          {/* Visible filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-grey" strokeWidth={1.2} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                aria-label="Search clients"
                className="w-full bg-deep-black/60 border border-white/[0.08] rounded-sm pl-9 pr-3 py-2.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-[0.6rem] tracking-wide-luxe uppercase font-body transition",
                    status === s
                      ? "border-rose-gold/50 text-rose-gold bg-rose-gold/10"
                      : "border-white/10 text-muted-grey hover:text-soft-ivory"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {clients.isPending ? (
            <div className="py-24 flex justify-center">
              <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
            </div>
          ) : clients.isError ? (
            <Card className="p-6">
              <p className="font-body text-sm text-muted-grey">{toUserMessage(clients.error)}</p>
            </Card>
          ) : rows.length === 0 ? (
            <EmptyState title="No clients found" body="Try a different search or filter." />
          ) : (
            <>
              {/* Desktop / tablet table — full width */}
              <Card className="hidden sm:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      {["Client", "City", "Conversations", "Status", "With Lustra since"].map((h) => (
                        <TableHead key={h} className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((c) => (
                      <TableRow
                        key={c.userId}
                        onClick={() => setSelectedId(c.userId)}
                        className={cn(
                          "cursor-pointer border-white/[0.04] hover:bg-white/[0.03] transition",
                          selectedId === c.userId && "bg-rose-gold/[0.06]"
                        )}
                      >
                        <TableCell>
                          <p className="font-body text-sm text-ivory">
                            {c.preferredName || c.displayName}
                            {c.hasActiveVip && (
                              <Crown className="inline-block w-3 h-3 ml-1.5 text-rose-gold" strokeWidth={1.5} />
                            )}
                          </p>
                          <p className="font-body text-[0.6rem] text-muted-grey">{c.email}</p>
                        </TableCell>
                        <TableCell className="font-body text-xs text-soft-ivory/80">
                          {c.preferredCityName ?? "—"}
                        </TableCell>
                        <TableCell className="font-heading text-base text-light-rose-gold">
                          {c.conversationCount}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full",
                              c.isVerified ? "text-success border-success/30" : "text-warning border-warning/30"
                            )}
                          >
                            {c.isVerified ? "Verified" : "Pending review"}
                          </span>
                        </TableCell>
                        <TableCell className="font-body text-[0.65rem] text-muted-grey">
                          {new Date(c.memberSinceUtc).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {rows.map((c) => (
                  <Card key={c.userId} className="p-3" onClick={() => setSelectedId(c.userId)}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-body text-sm text-ivory truncate">
                          {c.preferredName || c.displayName}
                        </p>
                        <p className="font-body text-[0.6rem] text-muted-grey mt-0.5 truncate">{c.email}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full",
                          c.isVerified ? "text-success border-success/30" : "text-warning border-warning/30"
                        )}
                      >
                        {c.isVerified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.04] font-body text-[0.6rem] text-muted-grey">
                      {c.preferredCityName ?? "No city"} · {c.conversationCount} conversation
                      {c.conversationCount === 1 ? "" : "s"}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail side panel (xl persistent) / drawer (below xl) */}
      {selected && <ClientPanel client={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function ClientPanel({ client, onClose }) {
  const conversations = useManagementClientConversations(client.userId);

  return (
    <>
      <div
        className="xl:hidden fixed inset-0 z-40 bg-noir/70 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={cn(
          "bg-deep-black/80 border-l border-white/[0.06] shrink-0",
          "xl:static xl:w-[360px] xl:block",
          "fixed inset-y-0 right-0 z-50 w-[85vw] max-w-sm overflow-y-auto xl:z-auto xl:w-[360px]"
        )}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="font-body text-[0.55rem] tracking-luxe uppercase text-rose-gold/80">Client</p>
              <h2 className="font-heading text-2xl text-ivory mt-1 truncate">
                {client.preferredName || client.displayName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-grey hover:text-rose-gold p-1 shrink-0"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <span
              className={cn(
                "inline-flex text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full",
                client.isVerified ? "text-success border-success/30" : "text-warning border-warning/30"
              )}
            >
              {client.isVerified ? "Verified" : "Pending review"}
            </span>
            {client.hasActiveVip && (
              <span className="inline-flex items-center gap-1 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border border-rose-gold/40 text-rose-gold rounded-full">
                <Crown className="w-2.5 h-2.5" strokeWidth={1.5} /> VIP
              </span>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {client.email && <DetailLine icon={Mail} label="Email" value={client.email} />}
            {client.phoneNumber && <DetailLine icon={Phone} label="Phone" value={client.phoneNumber} />}
            {client.preferredCityName && (
              <DetailLine icon={MapPin} label="City" value={client.preferredCityName} />
            )}
            <DetailLine
              icon={CalendarDays}
              label="Since"
              value={new Date(client.memberSinceUtc).toLocaleDateString()}
            />
          </div>

          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <p className="flex items-center gap-2 text-[0.55rem] tracking-luxe uppercase text-muted-grey">
              <MessagesSquare className="w-3.5 h-3.5" strokeWidth={1.3} /> Conversations
            </p>

            {conversations.isPending ? (
              <p className="mt-3 inline-flex items-center gap-2 font-body text-xs text-muted-grey">
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.4} /> Loading…
              </p>
            ) : (conversations.data ?? []).length === 0 ? (
              <p className="mt-3 font-body text-xs text-muted-grey">No conversations yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {conversations.data.map((c) => (
                  <Link
                    key={c.conversationId}
                    to={`/management-conversations/${c.conversationId}`}
                    className="block rounded-sm border border-white/[0.06] px-3 py-2.5 hover:border-rose-gold/30 transition"
                  >
                    <p className="font-body text-xs text-ivory truncate">
                      {c.talentDisplayName ? `About ${c.talentDisplayName}` : c.subject || "General enquiry"}
                    </p>
                    <p className="font-body text-[0.55rem] text-muted-grey mt-0.5">
                      {c.lastMessageAtUtc
                        ? new Date(c.lastMessageAtUtc).toLocaleDateString()
                        : "No messages"}
                      {c.bookingId ? " · Appointment created" : ""}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/** @param {{ icon: import("react").ComponentType<any>; label: string; value: import("react").ReactNode }} props */
function DetailLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-[0.55rem] tracking-luxe uppercase text-muted-grey shrink-0">
        <Icon className="w-3.5 h-3.5" strokeWidth={1.3} /> {label}
      </span>
      <span className="font-body text-sm text-soft-ivory/85 text-right truncate">{value}</span>
    </div>
  );
}
