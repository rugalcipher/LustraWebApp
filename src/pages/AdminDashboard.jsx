import React from "react";
import { Link } from "react-router-dom";
import {
  Users, ShieldCheck, BarChart3, Inbox, Calendar, Activity, ArrowRight,
  CalendarClock, FileText, MessageSquare, AlertTriangle, Loader2,
} from "lucide-react";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import StatCard from "@/components/lustra/StatCard";
import { useManagementDashboard } from "@/features/management/hooks";
import { useAuditLogs } from "@/features/admin/hooks";
import { toUserMessage } from "@/api/problemDetails";

/**
 * Executive overview.
 *
 * Every number and every row on this page comes from the API. It previously
 * shipped invented counters, a fabricated revenue figure, five made-up people
 * and a permanently unhealthy dependency badge. Those are worse than an empty
 * dashboard: an operator cannot tell a real figure from a decorative one, and a
 * decorative outage indicator trains people to ignore the real one.
 *
 * Where the API exposes no equivalent (revenue, dependency health), nothing is
 * rendered at all rather than something invented.
 */

/** Real counters from `GET /management/dashboard` (ManagementDashboardDto). */
const KPI_FIELDS = [
  { key: "totalClients", label: "Clients", icon: Users, accent: "rose" },
  { key: "activeTalent", label: "Active Talent", icon: ShieldCheck, accent: "ivory" },
  { key: "openInquiries", label: "Open Inquiries", icon: Inbox, accent: "warning" },
  { key: "upcomingBookings", label: "Upcoming Bookings", icon: CalendarClock, accent: "rose" },
];

/** Actionable queues — each links to the page that clears it. */
const QUEUE_FIELDS = [
  { key: "pendingProfileReviews", label: "Profile reviews", to: "/moderation" },
  { key: "pendingReviewModeration", label: "Review moderation", to: "/moderation" },
  { key: "proposalsAwaitingResponse", label: "Proposals awaiting response", to: "/inquiry-pipeline" },
  { key: "submittedReports", label: "Submitted reports", to: "/moderation" },
  { key: "openSafetyCases", label: "Open safety cases", to: "/moderation" },
  { key: "pendingOutboxMessages", label: "Pending notifications", to: "/admin/platform" },
];

const QUICK = [
  { to: "/admin/users", label: "Manage users", icon: Users },
  { to: "/management-conversations", label: "Conversations", icon: MessageSquare },
  { to: "/inquiry-pipeline", label: "Inquiry pipeline", icon: Inbox },
  { to: "/agency-calendar", label: "Agency calendar", icon: Calendar },
  { to: "/moderation", label: "Moderation queue", icon: ShieldCheck },
  { to: "/analytics", label: "Agency analytics", icon: BarChart3 },
  { to: "/admin/platform", label: "Platform taxonomy", icon: Activity },
  { to: "/admin/audit", label: "Audit log", icon: FileText },
];

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Shared shell for a panel that can be loading, failed, empty or populated. */
function PanelState({ query, empty, children }) {
  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted-grey" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span className="font-body text-body">Loading…</span>
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex items-start gap-2 py-6 text-destructive" role="alert">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span className="font-body text-body">{toUserMessage(query.error)}</span>
      </div>
    );
  }
  if (empty) {
    return <p className="font-body text-body text-muted-grey py-6">{empty}</p>;
  }
  return children;
}

export default function AdminDashboard() {
  const dashboard = useManagementDashboard();
  const audit = useAuditLogs({ page: 1 });

  const data = dashboard.data;
  const entries = audit.data?.items ?? [];

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 w-full">
      <div className="mb-6">
        <Eyebrow>Administrator</Eyebrow>
        <h1 className="font-heading font-light text-3xl lg:text-4xl text-ivory mt-1">Executive Overview</h1>
        <p className="font-body text-body text-muted-grey mt-2 max-w-2xl">
          Platform-wide health, user management, and operational oversight for Lustra.
        </p>
      </div>

      {dashboard.isError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-3"
        >
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <p className="font-body text-body text-destructive">{toUserMessage(dashboard.error)}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {KPI_FIELDS.map((k) => (
          <StatCard
            key={k.key}
            label={k.label}
            // Never invent a number: until the API answers, show a placeholder.
            value={dashboard.isSuccess ? (data?.[k.key] ?? 0) : "—"}
            icon={k.icon}
            accent={k.accent}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Eyebrow>Recent Activity</Eyebrow>
              <Link
                to="/admin/audit"
                className="inline-flex items-center gap-1 text-meta tracking-luxe uppercase text-rose-gold/80 hover:text-light-rose-gold"
              >
                Audit log <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
            <PanelState query={audit} empty={entries.length === 0 ? "No recorded activity yet." : null}>
              <div className="space-y-1">
                {entries.slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-gold/70 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-body text-ivory">
                        <span className="text-soft-ivory">{entry.actorDisplay ?? "System"}</span>{" "}
                        {entry.summary}
                      </p>
                      <p className="font-body text-meta text-muted-grey mt-0.5">
                        {entry.entityType} · {relativeTime(entry.createdAtUtc)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </PanelState>
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
                  <Icon className="w-4 h-4 text-rose-gold/80" strokeWidth={1.2} aria-hidden="true" />
                  <span className="font-body text-helper text-soft-ivory/80 leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <Eyebrow>Action Queues</Eyebrow>
          <PanelState query={dashboard}>
            <div className="mt-3 space-y-1">
              {QUEUE_FIELDS.map((q) => {
                const count = dashboard.isSuccess ? (data?.[q.key] ?? 0) : null;
                return (
                  <Link
                    key={q.key}
                    to={q.to}
                    className="flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-sm border-b border-white/[0.04] last:border-0 hover:bg-rose-gold/5 transition"
                  >
                    <span className="font-body text-body text-soft-ivory/85">{q.label}</span>
                    <span
                      className={`font-body text-body tabular-nums ${
                        count ? "text-rose-gold" : "text-muted-grey"
                      }`}
                    >
                      {count ?? "—"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </PanelState>
        </Card>
      </div>
    </div>
  );
}
