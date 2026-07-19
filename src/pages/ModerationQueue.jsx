import React, { useState } from "react";
import { Check, X, UserPlus, Flag, ShieldCheck } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { TALENT_APPLICATIONS, INQUIRY_SUBMISSIONS } from "@/mocks/internal";
import { cn } from "@/lib/utils";

const STATUS = {
  pending: "text-warning border-warning/30",
  review: "text-rose-gold border-rose-gold/30",
  approved: "text-success border-success/30",
  rejected: "text-error border-error/30",
  cleared: "text-success border-success/30",
  flagged: "text-error border-error/30",
};

export default function ModerationQueue() {
  const [apps, setApps] = useState(TALENT_APPLICATIONS);
  const [subs, setSubs] = useState(INQUIRY_SUBMISSIONS);

  const decide = (id, status) => setApps((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
  const resolve = (id, status) => setSubs((p) => p.map((s) => (s.id === id ? { ...s, status } : s)));

  const openApps = apps.filter((a) => a.status === "pending" || a.status === "review");
  const openSubs = subs.filter((s) => s.status === "pending");

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Control Panel"
        title="Moderation Queue"
        subtitle="Review new talent applications and moderate client inquiry submissions."
      />
      <div className="w-full px-5 lg:px-8 py-6 space-y-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Talent Applications</Eyebrow>
            <span className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">{openApps.length} awaiting</span>
          </div>
          {apps.length === 0 ? (
            <EmptyState icon={UserPlus} title="Queue clear" body="No pending applications." />
          ) : (
            <div className="space-y-2">
              {apps.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-3 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-ivory">{a.name}</p>
                    <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">
                      {a.category} · {a.city} · {a.references} ref(s) · applied {a.applied}
                    </p>
                  </div>
                  {a.status === "pending" || a.status === "review" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => decide(a.id, "approved")}
                        className="w-8 h-8 flex items-center justify-center rounded-sm border border-success/30 text-success hover:bg-success/10 transition"
                        aria-label="Approve"
                      >
                        <Check className="w-4 h-4" strokeWidth={1.2} />
                      </button>
                      <button
                        onClick={() => decide(a.id, "rejected")}
                        className="w-8 h-8 flex items-center justify-center rounded-sm border border-error/30 text-error hover:bg-error/10 transition"
                        aria-label="Reject"
                      >
                        <X className="w-4 h-4" strokeWidth={1.2} />
                      </button>
                    </div>
                  ) : (
                    <span className={cn("text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", STATUS[a.status])}>
                      {a.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Client Inquiry Submissions</Eyebrow>
            <span className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey">{openSubs.length} flagged</span>
          </div>
          {subs.length === 0 ? (
            <EmptyState icon={Flag} title="Nothing flagged" body="All submissions cleared." />
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.id} className="py-3 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-body text-sm text-ivory">{s.client}</p>
                      <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">
                        {s.detail} · submitted {s.submitted}
                      </p>
                    </div>
                    {s.status === "pending" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => resolve(s.id, "cleared")}
                          className="inline-flex items-center gap-1 text-[0.55rem] tracking-wide-luxe uppercase px-2.5 py-1 border border-success/30 text-success rounded-full hover:bg-success/10 transition"
                        >
                          <ShieldCheck className="w-3 h-3" /> Clear
                        </button>
                        <button
                          onClick={() => resolve(s.id, "flagged")}
                          className="inline-flex items-center gap-1 text-[0.55rem] tracking-wide-luxe uppercase px-2.5 py-1 border border-error/30 text-error rounded-full hover:bg-error/10 transition"
                        >
                          <Flag className="w-3 h-3" /> Flag
                        </button>
                      </div>
                    ) : (
                      <span className={cn("text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full", STATUS[s.status])}>
                        {s.status}
                      </span>
                    )}
                  </div>
                  {s.flagged && s.status === "pending" && (
                    <p className="font-body text-[0.6rem] text-error/80 mt-1.5">⚠ {s.flagged}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}