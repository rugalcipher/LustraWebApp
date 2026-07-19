import React from "react";
import { ScrollText, PlugZap } from "lucide-react";
import { Card, Eyebrow } from "@/components/lustra/Primitives";

/**
 * Audit Log — placeholder. The backend audit domain is not yet implemented
 * (see Lustra.API: no audit entity/endpoint exists). This page intentionally
 * shows NO fabricated audit events; it documents the pending integration in the
 * real Lustra internal style so the /admin/audit destination is never a broken
 * link.
 */
export default function AdminAudit() {
  return (
    <div className="px-5 lg:px-8 py-6 lg:py-8 w-full">
      <div className="mb-6">
        <Eyebrow>Administrator</Eyebrow>
        <h1 className="font-heading font-light text-3xl lg:text-4xl text-ivory mt-1">Audit Log</h1>
        <p className="font-body text-sm text-muted-grey mt-2 max-w-2xl">
          A tamper-evident record of administrative and moderation actions across the platform.
        </p>
      </div>

      <Card className="p-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full border border-rose-gold/30 bg-deep-black/40 flex items-center justify-center">
          <ScrollText className="w-6 h-6 text-rose-gold/80" strokeWidth={1.2} />
        </div>
        <p className="mt-5 font-heading text-xl text-ivory">Audit data is not yet connected</p>
        <p className="mt-2 font-body text-sm text-muted-grey max-w-md leading-relaxed">
          The audit trail will appear here once the backend audit endpoint is available. No audit
          events are shown until real data is connected — this view does not display placeholder or
          sample activity.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-[0.6rem] tracking-luxe uppercase text-warning border border-warning/30 rounded-full px-3 py-1.5">
          <PlugZap className="w-3.5 h-3.5" strokeWidth={1.4} /> Awaiting backend integration
        </div>
      </Card>
    </div>
  );
}
