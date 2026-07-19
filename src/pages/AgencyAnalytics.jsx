import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import InternalHeader from "@/components/lustra/InternalHeader";
import StatCard from "@/components/lustra/StatCard";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { ANALYTICS } from "@/mocks/internal";

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

export default function AgencyAnalytics() {
  const conv = ANALYTICS.conversion;
  const rate = Math.round((conv[3].count / conv[0].count) * 100);
  const seasonal = ANALYTICS.seasonalDemand.flatMap((s) =>
    ["q1", "q2", "q3", "q4"].map((q) => ({ category: s.category, quarter: q.toUpperCase(), demand: s[q] }))
  );

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Internal Reports"
        title="Agency Analytics"
        subtitle="Booking volume, inquiry conversion, and seasonal talent demand."
      />
      <div className="w-full px-5 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Bookings (YTD)" value={288} accent="rose" hint="+18% vs prior year" />
          <StatCard label="Conversion" value={`${rate}%`} accent="ivory" hint="Inquiry → confirmed" />
          <StatCard label="Avg. Engagement" value="$3,420" accent="warning" hint="Settled value" />
        </div>

        <Card className="p-4">
          <Eyebrow>Booking Volume & Inquiries</Eyebrow>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ANALYTICS.monthlyVolume} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8C8882", fontSize: 9, fontFamily: "Jost" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8C8882", fontSize: 9, fontFamily: "Jost" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...TooltipStyle} cursor={{ fill: "rgba(184,135,107,0.06)" }} />
                <Bar dataKey="inquiries" fill="rgba(184,135,107,0.35)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="bookings" fill="#B8876B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="inline-flex items-center gap-1.5 text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
              <span className="w-2 h-2 rounded-full bg-rose-gold" /> Bookings
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">
              <span className="w-2 h-2 rounded-full bg-rose-gold/35" /> Inquiries
            </span>
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Inquiry Conversion Funnel</Eyebrow>
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conv}>
                <defs>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B8876B" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#B8876B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="stage" tick={{ fill: "#8C8882", fontSize: 9, fontFamily: "Jost" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8C8882", fontSize: 9, fontFamily: "Jost" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...TooltipStyle} cursor={{ stroke: "rgba(184,135,107,0.3)" }} />
                <Area type="monotone" dataKey="count" stroke="#D8AB91" strokeWidth={1.5} fill="url(#convGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow>Seasonal Talent Demand</Eyebrow>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonal} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="category" tick={{ fill: "#8C8882", fontSize: 8, fontFamily: "Jost" }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={48} />
                <YAxis tick={{ fill: "#8C8882", fontSize: 9, fontFamily: "Jost" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip {...TooltipStyle} cursor={{ fill: "rgba(184,135,107,0.06)" }} />
                <Bar dataKey="demand" fill="#B8876B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="font-body text-[0.6rem] text-muted-grey mt-3">
            Gala hosting and private performances peak in Q4; travel host demand concentrates across summer.
          </p>
        </Card>
      </div>
    </div>
  );
}