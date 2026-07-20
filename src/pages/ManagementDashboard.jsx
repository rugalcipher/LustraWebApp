import React from "react";
import { Link } from "react-router-dom";
import {
  Inbox, FileText, Calendar, UserCheck, Star, ShieldAlert, Crown, Loader2, Users, Send,
} from "lucide-react";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { useManagementDashboard } from "@/features/management/hooks";

/**
 * Management Dashboard — desktop-first, full-width workspace.
 *
 * Every number is a real server-side count. A zero renders as zero rather than hiding the
 * tile: an empty moderation queue is information, and a tile that vanishes when empty
 * trains the team to stop looking for it.
 */
export default function ManagementDashboard() {
  const { data, isPending, isError, error } = useManagementDashboard();

  if (isPending) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">Couldn't load the console</p>
        <p className="mt-3 font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      </div>
    );
  }

  const pipeline = [
    { label: "Open inquiries", value: data.openInquiries, icon: Inbox, to: "/inquiry-pipeline" },
    { label: "Awaiting client", value: data.proposalsAwaitingResponse, icon: FileText, to: "/proposal-builder" },
    { label: "Upcoming bookings", value: data.upcomingBookings, icon: Calendar, to: "/agency-calendar" },
  ];

  const review = [
    { label: "Profile reviews", value: data.pendingProfileReviews, icon: UserCheck, to: "/moderation" },
    { label: "Review moderation", value: data.pendingReviewModeration, icon: Star, to: "/moderation" },
    { label: "Safety reports", value: data.submittedReports, icon: ShieldAlert, to: "/moderation", urgent: true },
    { label: "Open safety cases", value: data.openSafetyCases, icon: ShieldAlert, to: "/moderation", urgent: true },
  ];

  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 space-y-7 w-full">
      <div>
        <Eyebrow>Concierge Console</Eyebrow>
        <h1 className="font-heading font-light text-3xl lg:text-4xl text-ivory mt-1">
          Today's Operations
        </h1>
        <p className="font-body text-sm text-muted-grey mt-2 max-w-2xl">
          Live queues across inquiries, bookings and moderation.
        </p>
      </div>

      <section>
        <Eyebrow>Pipeline</Eyebrow>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {pipeline.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>
      </section>

      <section>
        <Eyebrow>Needs Review</Eyebrow>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {review.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>
      </section>

      <section>
        <Eyebrow>Platform</Eyebrow>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          <StatTile label="Active talent" value={data.activeTalent} icon={Users} to="/media-library" />
          <StatTile label="Total clients" value={data.totalClients} icon={Crown} to="/management-clients" />
          {/* Surfaced deliberately: a growing outbox means external notifications are NOT
              being delivered, and silence here would look like everything is fine. */}
          <StatTile
            label="Pending notifications"
            value={data.pendingOutboxMessages}
            icon={Send}
            urgent={data.pendingOutboxMessages > 50}
          />
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, to, urgent }) {
  const flagged = Boolean(urgent) && value > 0;

  const body = (
    <Card
      className={cn(
        "p-4 h-full transition",
        to && "hover:border-rose-gold/30",
        flagged && "border-warning/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon
          className={cn("w-4 h-4 shrink-0", flagged ? "text-warning" : "text-muted-grey")}
          strokeWidth={1.2}
        />
        <span
          className={cn(
            "font-heading text-3xl leading-none",
            value === 0 ? "text-muted-grey/60" : flagged ? "text-warning" : "text-ivory"
          )}
        >
          {value}
        </span>
      </div>
      <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-3">{label}</p>
    </Card>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
