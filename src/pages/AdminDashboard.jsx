import React from "react";
import { Link } from "react-router-dom";
import {
  Users, UserCheck, UserPlus, Inbox, MessagesSquare, ShieldCheck, Image as ImageIcon,
  CalendarCheck, CalendarRange, AlertTriangle, Loader2, RotateCw, Activity, Ban, ShieldAlert,
} from "lucide-react";
import { Card, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import {
  useAdminDashboard, useAdminDashboardActivity, useSystemStatus,
} from "@/features/admin/hooks";

/**
 * The administrative overview.
 *
 * Every figure comes from `GET /admin/dashboard`, which computes it from the
 * database on request. **Nothing on this page is hardcoded, seeded or
 * approximated.** A zero renders as a zero: an empty platform reads as an empty
 * platform, which is the only way the numbers stay trustworthy once they are not
 * zero.
 *
 * Admins read this rather than `/management/dashboard`, which remains as
 * Management's narrower operational view and never carried populations, queue
 * depths, trends or measured dependency status.
 *
 * Two things this page is careful about:
 *
 *  - **Recorded Appointment Value is not revenue.** Lustra processes no
 *    payments. The figure is what staff typed onto bookings; nothing has been
 *    invoiced, collected or reconciled. It is labelled for what it is and shown
 *    per currency, because summing across currencies produces a number that is
 *    wrong in all of them.
 *  - **System status reports only what was measured.** Components appear because
 *    something checked them. There is no "Operational" default — a status nobody
 *    measured is worse than none, because it gets believed.
 */

const PEOPLE = [
  { field: "totalClients", label: "Clients", icon: Users },
  { field: "totalTalent", label: "Talent", icon: UserCheck },
  { field: "publishedTalent", label: "Published talent", icon: UserCheck },
  { field: "approvedUnpublishedTalent", label: "Approved, not published", icon: UserPlus },
  { field: "activeManagementStaff", label: "Management staff", icon: Users },
  { field: "suspendedAccounts", label: "Suspended accounts", icon: Ban },
];

/** Queues someone has to act on. Each links to where the acting happens. */
const QUEUES = [
  { field: "pendingTalentApplications", label: "Talent applications", icon: UserPlus, to: "/admin/talent-applications" },
  { field: "pendingProfileReviews", label: "Profile reviews", icon: ShieldCheck, to: "/moderation" },
  { field: "pendingMediaReviews", label: "Media reviews", icon: ImageIcon, to: "/moderation" },
  { field: "openInquiries", label: "Open inquiries", icon: Inbox, to: "/inquiry-pipeline" },
  { field: "unreadConversations", label: "Unread conversations", icon: MessagesSquare, to: "/management-conversations" },
  { field: "unassignedConversations", label: "Unassigned conversations", icon: MessagesSquare, to: "/management-conversations" },
  { field: "pendingReviewModeration", label: "Reviews to moderate", icon: ShieldCheck, to: "/moderation" },
  { field: "openSafetyCases", label: "Open safety cases", icon: ShieldAlert, to: "/moderation" },
];

const APPOINTMENTS = [
  { field: "upcomingAppointments", label: "Upcoming", icon: CalendarCheck },
  { field: "appointmentsToday", label: "Today", icon: CalendarCheck },
  { field: "cancelledAppointmentsInPeriod", label: "Cancelled in period", icon: CalendarRange },
];

const QUICK_LINKS = [
  { to: "/admin/talent-applications", label: "Talent Applications", icon: UserPlus },
  { to: "/admin/appointments", label: "Appointments", icon: CalendarCheck },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarRange },
  { to: "/management-conversations", label: "Conversations", icon: MessagesSquare },
  { to: "/moderation", label: "Moderation", icon: ShieldCheck },
];

/** Colour follows the measured word, and defaults to neutral for an unknown one. */
const STATUS_TONE = {
  healthy: "text-success",
  ok: "text-success",
  operational: "text-success",
  degraded: "text-warning",
  unhealthy: "text-destructive",
  down: "text-destructive",
};

function Panel({ query, children, emptyIcon, emptyTitle, emptyBody }) {
  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
        <span className="font-body text-helper text-muted-grey">Loading…</span>
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="space-y-3 py-2" role="alert">
        <p className="flex items-center gap-2 font-body text-helper text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {toUserMessage(query.error)}
        </p>
        <button
          onClick={() => query.refetch()}
          className="inline-flex items-center gap-2 font-body text-meta tracking-luxe uppercase text-rose-gold hover:underline"
        >
          <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }
  const empty = children == null || (Array.isArray(children) && children.length === 0);
  if (empty && emptyTitle) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} />;
  }
  return children;
}

function Counter({ icon: Icon, label, value, to }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <Icon className="w-4 h-4 text-rose-gold/70 shrink-0" strokeWidth={1.3} aria-hidden="true" />
        {/* A real zero is displayed as zero. Nothing here substitutes a dash. */}
        <span className="font-heading text-2xl text-ivory tabular-nums">{value ?? 0}</span>
      </div>
      <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey mt-1.5">
        {label}
      </p>
    </>
  );

  return to ? (
    <Link
      to={to}
      className="block rounded-sm border border-white/[0.08] bg-card-black/40 p-3.5 hover:border-rose-gold/40 transition"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-sm border border-white/[0.08] bg-card-black/40 p-3.5">{body}</div>
  );
}

/** A bar per month, scaled to the tallest point. Says so when there is nothing. */
function Trend({ title, points }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="space-y-2">
      <p className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">{title}</p>
      {points.length === 0 ? (
        <p className="font-body text-helper text-muted-grey">No activity in this period.</p>
      ) : (
        <div className="flex items-end gap-1 h-20" role="img" aria-label={`${title} by month`}>
          {points.map((point) => (
            <div key={point.period} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className="w-full bg-rose-gold/50 rounded-t-sm"
                style={{ height: `${(point.count / max) * 100}%` }}
                title={`${point.period}: ${point.count}`}
              />
              <span className="font-body text-[0.5rem] text-muted-grey truncate w-full text-center">
                {point.period.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const dashboard = useAdminDashboard();
  const activity = useAdminDashboardActivity(20);
  const system = useSystemStatus();
  const data = dashboard.data;

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6">
      <div>
        <p className="font-body text-meta tracking-luxe uppercase text-rose-gold/80">Administration</p>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">Overview</h1>
        {data && (
          <p className="font-body text-helper text-muted-grey mt-1">
            {new Date(data.fromUtc).toLocaleDateString()} – {new Date(data.toUtc).toLocaleDateString()}
            {" · generated "}
            {new Date(data.generatedAtUtc).toLocaleTimeString()}
          </p>
        )}
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Quick actions">
        {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/85 hover:border-rose-gold/40 hover:text-rose-gold transition"
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
          </Link>
        ))}
      </nav>

      <Card className="p-5 space-y-4">
        <h2 className="font-heading text-lg text-ivory">People</h2>
        <Panel query={dashboard}>
          {data ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {PEOPLE.map((kpi) => (
                <Counter key={kpi.field} icon={kpi.icon} label={kpi.label} value={data[kpi.field]} />
              ))}
            </div>
          ) : null}
        </Panel>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-heading text-lg text-ivory">Waiting on someone</h2>
        <Panel query={dashboard}>
          {data ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUEUES.map((kpi) => (
                <Counter
                  key={kpi.field}
                  icon={kpi.icon}
                  label={kpi.label}
                  value={data[kpi.field]}
                  to={kpi.to}
                />
              ))}
            </div>
          ) : null}
        </Panel>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5 space-y-4">
          <h2 className="font-heading text-lg text-ivory">Appointments</h2>
          <Panel query={dashboard}>
            {data ? (
              <div className="grid grid-cols-3 gap-3">
                {APPOINTMENTS.map((kpi) => (
                  <Counter key={kpi.field} icon={kpi.icon} label={kpi.label} value={data[kpi.field]} />
                ))}
              </div>
            ) : null}
          </Panel>
        </Card>

        {/*
          NOT revenue, and never to be labelled as one. Lustra processes no
          payments; this is the sum of amounts staff recorded on appointments.
        */}
        <Card className="p-5 space-y-3">
          <h2 className="font-heading text-lg text-ivory">Recorded Appointment Value</h2>
          <p className="font-body text-meta text-muted-grey">
            Amounts recorded on appointments by staff, per currency. Lustra processes no
            payments — nothing here has been invoiced, collected or reconciled.
          </p>
          <Panel query={dashboard}>
            {data ? (
              data.recordedAppointmentValue.length === 0 ? (
                <p className="font-body text-helper text-muted-grey">
                  No amounts recorded in this period.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.recordedAppointmentValue.map((entry) => (
                    <li
                      key={entry.currencyCode}
                      className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] pb-2 last:border-0"
                    >
                      <span className="font-body text-meta tracking-wide-luxe uppercase text-muted-grey">
                        {entry.currencyCode} · {entry.appointmentCount}{" "}
                        {entry.appointmentCount === 1 ? "appointment" : "appointments"}
                      </span>
                      <span className="font-heading text-xl text-ivory tabular-nums">
                        {entry.amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </Panel>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-heading text-lg text-ivory">Trends</h2>
        <Panel query={dashboard}>
          {data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Trend title="Registrations" points={data.registrationTrend} />
              <Trend title="Applications" points={data.applicationTrend} />
              <Trend title="Appointments" points={data.appointmentTrend} />
            </div>
          ) : null}
        </Panel>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5 space-y-3">
          <h2 className="font-heading text-lg text-ivory">Recent activity</h2>
          <Panel
            query={activity}
            emptyIcon={Activity}
            emptyTitle="No recorded activity"
            emptyBody="Actions taken in the console appear here as they happen."
          >
            {activity.data && activity.data.length > 0
              ? activity.data.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-body text-helper text-soft-ivory/90 break-words">
                        {entry.summary}
                      </p>
                      <p className="font-body text-meta text-muted-grey mt-0.5">
                        {entry.actorDisplay ?? "System"} · {entry.entityType}
                      </p>
                    </div>
                    <span className="font-body text-meta text-muted-grey whitespace-nowrap">
                      {new Date(entry.createdAtUtc).toLocaleString()}
                    </span>
                  </div>
                ))
              : null}
          </Panel>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-heading text-lg text-ivory">System status</h2>
          <p className="font-body text-meta text-muted-grey">
            Only components that were actually checked appear here.
          </p>
          <Panel
            query={system}
            emptyIcon={Activity}
            emptyTitle="Nothing measured"
            emptyBody="No dependency reported a measured status."
          >
            {system.data && system.data.components.length > 0
              ? system.data.components.map((component) => (
                  <div
                    key={component.name}
                    className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-body text-helper text-soft-ivory/90">{component.name}</p>
                      {component.detail && (
                        <p className="font-body text-meta text-muted-grey break-words">
                          {component.detail}
                        </p>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p
                        className={cn(
                          "font-body text-meta tracking-wide-luxe uppercase",
                          STATUS_TONE[(component.status ?? "").toLowerCase()] ?? "text-muted-grey"
                        )}
                      >
                        {component.status}
                      </p>
                      {component.latencyMs != null && (
                        <p className="font-body text-meta text-muted-grey tabular-nums">
                          {Math.round(component.latencyMs)} ms
                        </p>
                      )}
                    </div>
                  </div>
                ))
              : null}
          </Panel>
          {system.data && (
            <p className="font-body text-meta text-muted-grey">
              Checked {new Date(system.data.checkedAtUtc).toLocaleTimeString()}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
