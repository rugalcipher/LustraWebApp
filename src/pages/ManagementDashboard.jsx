import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, FileText, MessageSquare, ArrowRight, CalendarCheck } from "lucide-react";
import StatCard from "@/components/lustra/StatCard";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { ACTIVE_INQUIRIES, PENDING_PROPOSALS, URGENT_MESSAGES, UPCOMING_BOOKINGS } from "@/mocks/internal";

const PRIORITY = {
  high: "text-error border-error/30",
  medium: "text-warning border-warning/30",
  low: "text-muted-grey border-muted-grey/30",
};

/**
 * Management Dashboard — desktop-first. Full-width workspace, KPI row, then a
 * multi-column operational grid (inquiries + proposals side by side, with a
 * right rail for urgent messages and upcoming bookings) that uses the available
 * width instead of a narrow phone column. Degrades to a single column < lg.
 */
export default function ManagementDashboard() {
  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 space-y-6 w-full">
      <div>
        <Eyebrow>Concierge Console</Eyebrow>
        <h1 className="font-heading font-light text-3xl lg:text-4xl text-ivory mt-1">Today's Operations</h1>
        <p className="font-body text-sm text-muted-grey mt-2 max-w-2xl">
          Inquiry flow, pending proposals, and messages requiring attention.
        </p>
      </div>

      {/* KPI row — uses full width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Inquiries" value={ACTIVE_INQUIRIES.length} icon={AlertCircle} accent="rose" hint="2 high priority" />
        <StatCard label="Pending Proposals" value={PENDING_PROPOSALS.length} icon={FileText} accent="ivory" hint="1 revision requested" />
        <StatCard label="Urgent Messages" value={URGENT_MESSAGES.filter((m) => m.unread).length} icon={MessageSquare} accent="warning" />
        <StatCard label="Upcoming Bookings" value={UPCOMING_BOOKINGS.length} icon={CalendarCheck} accent="rose" hint="Next: Jul 22" />
      </div>

      {/* Operational grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left / center — inquiries + proposals span two columns on desktop */}
        <div className="lg:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Eyebrow>Active Inquiries</Eyebrow>
              <Link to="/inquiry-pipeline" className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-light-rose-gold">
                Pipeline <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {ACTIVE_INQUIRIES.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-ivory truncate">
                      {i.client} <span className="text-muted-grey">· {i.talent}</span>
                    </p>
                    <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">{i.engagement} · {i.city} · {i.date}</p>
                  </div>
                  <span className={`shrink-0 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full ${PRIORITY[i.priority]}`}>
                    {i.priority}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Eyebrow>Pending Proposals</Eyebrow>
              <Link to="/proposal-builder" className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-light-rose-gold">
                Builder <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {PENDING_PROPOSALS.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-ivory truncate">
                      {p.client} <span className="text-muted-grey">· {p.talent}</span>
                    </p>
                    <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">{p.status} · sent {p.sent}</p>
                  </div>
                  <span className="shrink-0 font-heading text-lg text-light-rose-gold">${p.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Eyebrow>Urgent Messages</Eyebrow>
              <Link to="/app/messages" className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-light-rose-gold">
                Inbox <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {URGENT_MESSAGES.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-start gap-2 min-w-0">
                    {m.unread && <span className="w-1.5 h-1.5 rounded-full bg-rose-gold mt-1.5 shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-body text-sm text-ivory">{m.from}</p>
                      <p className="font-body text-[0.65rem] text-muted-grey mt-0.5 truncate">{m.preview}</p>
                    </div>
                  </div>
                  <span className="font-body text-[0.6rem] text-muted-grey shrink-0">{m.time}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Eyebrow>Upcoming Bookings</Eyebrow>
              <Link to="/agency-calendar" className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-light-rose-gold">
                Calendar <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {UPCOMING_BOOKINGS.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-ivory truncate">{b.client}</p>
                    <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">{b.engagement} · {b.city}</p>
                  </div>
                  <span className="font-body text-[0.6rem] text-soft-ivory/70 shrink-0">{b.date} · {b.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
