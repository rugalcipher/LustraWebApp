import React, { useState } from "react";
import { Search, X, Mail, MapPin, CalendarDays, StickyNote } from "lucide-react";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import { CLIENTS } from "@/mocks/internal";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS = {
  Verified: "text-success border-success/30",
  "Pending review": "text-warning border-warning/30",
};
const STATUS_FILTERS = ["All", "Verified", "Pending review"];

/**
 * Client Directory — desktop-first Management operational page. Split-pane: a
 * wide, dense table that uses the full workspace width, with a persistent
 * client detail panel on the right (xl+) or a slide-over drawer on smaller
 * screens. Filters stay visible. Degrades to stacked cards on mobile.
 */
export default function ClientDirectory() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(/** @type {string|null} */ (null));

  const filtered = CLIENTS.filter((c) => {
    const matchesQuery =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All" || c.status === status;
    return matchesQuery && matchesStatus;
  });
  const selected = CLIENTS.find((c) => c.id === selectedId) || null;

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
                {filtered.length} of {CLIENTS.length} verified members
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

          {filtered.length === 0 ? (
            <EmptyState title="No clients found" body="Try a different search or filter." />
          ) : (
            <>
              {/* Desktop / tablet table — full width */}
              <Card className="hidden sm:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      {["Client", "Tier", "Bookings", "Status", "Last active", "Notes"].map((h) => (
                        <TableHead key={h} className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "cursor-pointer border-white/[0.04] hover:bg-white/[0.03] transition",
                          selectedId === c.id && "bg-rose-gold/[0.06]"
                        )}
                      >
                        <TableCell>
                          <p className="font-body text-sm text-ivory">{c.name}</p>
                          <p className="font-body text-[0.6rem] text-muted-grey">{c.email}</p>
                        </TableCell>
                        <TableCell className="font-body text-xs text-soft-ivory/80">{c.tier}</TableCell>
                        <TableCell className="font-heading text-base text-light-rose-gold">{c.bookings}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", STATUS[c.status])}>
                            {c.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-body text-[0.65rem] text-muted-grey">{c.lastActive}</TableCell>
                        <TableCell className="font-body text-[0.65rem] text-muted-grey max-w-[220px] truncate">{c.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {filtered.map((c) => (
                  <Card key={c.id} className="p-3" onClick={() => setSelectedId(c.id)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-body text-sm text-ivory">{c.name}</p>
                        <p className="font-body text-[0.6rem] text-muted-grey mt-0.5">{c.email}</p>
                      </div>
                      <span className={cn("text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", STATUS[c.status])}>
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.04] font-body text-[0.6rem] text-muted-grey">
                      {c.tier} · {c.bookings} bookings · {c.lastActive}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail side panel (xl persistent) / drawer (below xl) */}
      {selected && (
        <>
          <div
            className="xl:hidden fixed inset-0 z-40 bg-noir/70 backdrop-blur-sm"
            onClick={() => setSelectedId(null)}
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
                <div>
                  <p className="font-body text-[0.55rem] tracking-luxe uppercase text-rose-gold/80">Client</p>
                  <h2 className="font-heading text-2xl text-ivory mt-1">{selected.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-muted-grey hover:text-rose-gold p-1"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <span className={cn("inline-flex mt-3 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", STATUS[selected.status])}>
                {selected.status}
              </span>

              <div className="mt-6 space-y-4">
                <DetailLine icon={Mail} label="Email" value={selected.email} />
                <DetailLine icon={CalendarDays} label="Last active" value={selected.lastActive} />
                <DetailLine icon={MapPin} label="Tier" value={selected.tier} />
                <DetailLine icon={CalendarDays} label="Bookings" value={`${selected.bookings} total`} />
                <div>
                  <p className="flex items-center gap-2 text-[0.55rem] tracking-luxe uppercase text-muted-grey">
                    <StickyNote className="w-3.5 h-3.5" strokeWidth={1.3} /> Notes
                  </p>
                  <p className="font-body text-sm text-soft-ivory/85 mt-2 leading-relaxed">{selected.notes}</p>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

/** @param {{ icon: import("react").ComponentType<any>; label: string; value: import("react").ReactNode }} props */
function DetailLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-[0.55rem] tracking-luxe uppercase text-muted-grey shrink-0">
        <Icon className="w-3.5 h-3.5" strokeWidth={1.3} /> {label}
      </span>
      <span className="font-body text-sm text-soft-ivory/85 text-right">{value}</span>
    </div>
  );
}
