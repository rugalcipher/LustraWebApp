import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { Loader2 } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import StatCard from "@/components/lustra/StatCard";
import { Card, Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { toUserMessage } from "@/api/problemDetails";
import {
  useExecutiveAnalytics,
  useClientAnalytics,
  useTalentAnalytics,
} from "@/features/management/hooks";

/**
 * Agency analytics — real aggregates from `/management/analytics/*`.
 *
 * Every figure here is computed by the API from the live database. This page previously
 * rendered a hard-coded fixture, which is worse than showing nothing: a plausible chart
 * invites decisions, and nobody stops to check whether a number is real before acting.
 *
 * The API returns aggregates only — no client identity, no talent contact detail and no
 * booking detail reaches this screen.
 */

const TooltipStyle = {
  contentStyle: {
    background: "#0B0B0D",
    border: "1px solid rgba(184,135,107,0.3)",
    borderRadius: "4px",
    fontSize: "0.7rem",
    fontFamily: "Jost, sans-serif",
  },
  labelStyle: { color: "#D9D5CE" },
  itemStyle: { color: "#F6F4EF" },
};

const AXIS = { stroke: "#8A7A70", fontSize: 10, fontFamily: "Jost, sans-serif" };

/** A month bucket ("2026-07") rendered for a chart axis. */
function monthLabel(period) {
  const [year, month] = String(period).split("-");
  if (!year || !month) return String(period);
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
  });
}

export default function AgencyAnalytics() {
  const executive = useExecutiveAnalytics();
  const clients = useClientAnalytics();
  const talent = useTalentAnalytics();

  const isPending = executive.isPending || clients.isPending || talent.isPending;
  const error = executive.error ?? clients.error ?? talent.error;

  if (isPending) {
    return (
      <div className="w-full">
        <InternalHeader eyebrow="Management" title="Analytics" subtitle="Live platform aggregates." />
        <div className="py-24 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <InternalHeader eyebrow="Management" title="Analytics" subtitle="Live platform aggregates." />
        <div className="px-5 lg:px-8 py-6">
          <Card className="p-6">
            <p className="font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
          </Card>
        </div>
      </div>
    );
  }

  const exec = executive.data;
  const registrations = (clients.data?.registrationsByMonth ?? []).map((b) => ({
    label: monthLabel(b.period),
    count: b.count,
  }));
  const byStatus = talent.data?.byStatus ?? [];
  const topByBookings = talent.data?.topByBookings ?? [];
  const conversion = Math.round((exec?.inquiryToBookingConversionRate ?? 0) * 100) / 100;

  return (
    <div className="w-full">
      <InternalHeader
        eyebrow="Management"
        title="Analytics"
        subtitle="Live platform aggregates. No client or talent personal data appears here."
      />

      <div className="px-5 lg:px-8 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Clients" value={exec?.totalClients ?? 0} />
          <StatCard label="Talent published" value={exec?.approvedTalent ?? 0} />
          <StatCard label="Engagements" value={exec?.totalBookings ?? 0} />
          <StatCard label="Completed" value={exec?.completedBookings ?? 0} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Conversion" value={`${conversion}%`} />
          <StatCard label="Average rating" value={(exec?.averageTalentRating ?? 0).toFixed(1)} />
          <StatCard label="Reviews" value={exec?.totalReviews ?? 0} />
          <StatCard
            label={`Confirmed value (${exec?.currencyCode ?? "ZAR"})`}
            value={(exec?.totalConfirmedValue ?? 0).toLocaleString()}
          />
        </div>

        <Card className="p-4">
          <Eyebrow>Client registrations by month</Eyebrow>
          {registrations.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No registrations yet" body="Client sign-ups will chart here." />
            </div>
          ) : (
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrations}>
                  <defs>
                    <linearGradient id="clientArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B8876B" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#B8876B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...TooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#B8876B"
                    strokeWidth={1.5}
                    fill="url(#clientArea)"
                    name="Registrations"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-4">
            <Eyebrow>Talent by status</Eyebrow>
            {byStatus.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No talent yet" body="Invited talent will appear here." />
              </div>
            ) : (
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStatus} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...TooltipStyle} />
                    <Bar dataKey="count" fill="#B8876B" radius={[2, 2, 0, 0]} name="Talent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <Eyebrow>Most engaged talent</Eyebrow>
            {topByBookings.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No engagements yet" body="Ranking appears once appointments exist." />
              </div>
            ) : (
              <div className="mt-3 space-y-1">
                {topByBookings.map((row) => (
                  <div
                    key={row.talentProfileId}
                    className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <p className="font-body text-sm text-ivory truncate">{row.displayName}</p>
                    <p className="font-heading text-base text-light-rose-gold shrink-0">{row.value}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
