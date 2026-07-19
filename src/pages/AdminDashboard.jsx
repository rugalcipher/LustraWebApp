import React from "react";
import { Link } from "react-router-dom";
import {
  Users, ShieldCheck, BarChart3, Inbox, Calendar, DollarSign, Activity, ArrowRight,
} from "lucide-react";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import StatCard from "@/components/lustra/StatCard";
import { cn } from "@/lib/utils";

const KPIS = [
  { label: "Total Users", value: 412, icon: Users, accent: "rose", hint: "+24 this month" },
  { label: "Active Talent", value: 86, icon: ShieldCheck, accent: "ivory", hint: "4 pending review" },
  { label: "Open Inquiries", value: 23, icon: Inbox, accent: "warning", hint: "5 high priority" },
  { label: "Revenue (MTD)", value: "$184k", icon: DollarSign, accent: "rose", hint: "+12% MoM" },
];

const ACTIVITY = [
  { id: 1, who: "V. Castellan", action: "approved talent profile", target: "Clara Voss", time: "12m ago", type: "approve" },
  { id: 2, who: "Director", action: "updated platform settings", target: "Engagement categories", time: "1h ago", type: "settings" },
  { id: 3, who: "System", action: "flagged inquiry submission", target: "T. Bianchi", time: "2h ago", type: "flag" },
  { id: 4, who: "V. Castellan", action: "confirmed booking", target: "Isabelle · Jul 22", time: "3h ago", type: "booking" },
  { id: 5, who: "Director", action: "invited management staff", target: "concierge@lustra.app", time: "5h ago", type: "invite" },
];

const ACTIVITY_COLOR = {
  approve: "text-success",
  settings: "text-muted-grey",
  flag: "text-error",
  booking: "text-rose-gold",
  invite: "text-warning",
};

const QUICK = [
  { to: "/admin/users", label: "Manage users", icon: Users },
  { to: "/admin/platform", label: "Platform taxonomy", icon: Activity },
  { to: "/moderation", label: "Moderation queue", icon: ShieldCheck },
  { to: "/analytics", label: "Agency analytics", icon: BarChart3 },
  { to: "/management-dashboard", label: "Operations console", icon: Inbox },
  { to: "/agency-calendar", label: "Agency calendar", icon: Calendar },
];

export default function AdminDashboard() {
  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 w-full">
      <div className="mb-6">
        <Eyebrow>Administrator</Eyebrow>
        <h1 className="font-heading font-light text-3xl lg:text-4xl text-ivory mt-1">Executive Overview</h1>
        <p className="font-body text-sm text-muted-grey mt-2 max-w-2xl">
          Platform-wide health, user management, and operational oversight for Lustra.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {KPIS.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} accent={k.accent} hint={k.hint} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Recent Activity</Eyebrow>
            <Link to="/admin/audit" className="inline-flex items-center gap-1 text-[0.6rem] tracking-luxe uppercase text-rose-gold/80 hover:text-light-rose-gold">
              Audit log <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {ACTIVITY.map((a) => (
              <div key={a.id} className="flex items-start gap-2 py-2.5 border-b border-white/[0.04] last:border-0">
                <span className={cn("w-1.5 h-1.5 rounded-full bg-current mt-1.5 shrink-0", ACTIVITY_COLOR[a.type])} />
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm text-ivory">
                    <span className="text-soft-ivory">{a.who}</span> {a.action}{" "}
                    <span className="text-rose-gold/90">{a.target}</span>
                  </p>
                  <p className="font-body text-[0.6rem] text-muted-grey mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Quick Actions</Eyebrow>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {QUICK.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col gap-2 p-3 rounded-sm border border-white/[0.06] bg-deep-black/40 hover:border-rose-gold/40 hover:bg-rose-gold/5 transition"
              >
                <Icon className="w-4 h-4 text-rose-gold/80" strokeWidth={1.2} />
                <span className="font-body text-[0.65rem] text-soft-ivory/80 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

        <Card className="p-4">
          <Eyebrow>System Status</Eyebrow>
          <div className="grid grid-cols-3 xl:grid-cols-1 gap-3 mt-3">
          {[
            { label: "API", value: "Operational", ok: true },
            { label: "Messaging", value: "Operational", ok: true },
            { label: "Media CDN", value: "Degraded", ok: false },
          ].map((s) => (
            <div key={s.label} className="text-center py-3 border border-white/[0.06] rounded-sm">
              <p className="font-body text-[0.55rem] tracking-luxe uppercase text-muted-grey">{s.label}</p>
              <p className={cn("font-body text-xs mt-1 flex items-center justify-center gap-1.5", s.ok ? "text-success" : "text-warning")}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> {s.value}
              </p>
            </div>
          ))}
          </div>
        </Card>
      </div>
    </div>
  );
}