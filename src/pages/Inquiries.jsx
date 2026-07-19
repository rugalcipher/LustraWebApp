import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { getTalent } from "@/mocks/talent";

const INQUIRIES = [
  {
    id: "i1",
    talentId: "t1",
    engagement: "Art Gallery Visit",
    date: "2026-07-25",
    manager: "V. Castellan",
    status: "Confirmed",
    lastMessage: "Everything is confirmed for Saturday. We look forward to welcoming you.",
    updated: "2h ago",
    unread: false,
  },
  {
    id: "i2",
    talentId: "t4",
    engagement: "Gala Hosting",
    date: "2026-08-02",
    manager: "V. Castellan",
    status: "Awaiting Client",
    lastMessage: "I've prepared a proposal for your review. Please let me know your thoughts.",
    updated: "1d ago",
    unread: true,
  },
  {
    id: "i3",
    talentId: "t2",
    engagement: "Brand Event",
    date: "2026-06-14",
    manager: "V. Castellan",
    status: "Closed",
    lastMessage: "Thank you for a wonderful evening. A review request will follow.",
    updated: "1w ago",
    unread: false,
  },
];

const TABS = ["New", "In Review", "Awaiting Client", "Confirmed", "Closed"];

const STATUS_TAB = {
  New: ["Awaiting Client"],
  "In Review": ["In Review"],
  "Awaiting Client": ["Awaiting Client"],
  Confirmed: ["Confirmed"],
  Closed: ["Closed"],
};

export default function Inquiries() {
  const [tab, setTab] = useState("New");
  const filtered = INQUIRIES.filter((i) => (STATUS_TAB[tab] || []).includes(i.status) || (tab === "New" && i.unread));

  return (
    <div className="px-5 pt-6">
      <Eyebrow>Concierge Inbox</Eyebrow>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Inquiries</h1>

      <div className="flex gap-1.5 overflow-x-auto lustra-scroll-hide -mx-5 px-5 mt-5 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 text-[0.6rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border transition font-body",
              tab === t ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5" : "border-white/[0.08] text-muted-grey hover:text-soft-ivory"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No inquiries in this tab"
          body="When you submit an inquiry, it will appear here for you to track."
        />
      ) : (
        <div className="space-y-2.5 mt-5">
          {filtered.map((inq) => {
            const talent = getTalent(inq.talentId);
            return (
              <Link
                key={inq.id}
                to="/app/messages"
                className="flex gap-3 p-3.5 bg-card-black/70 border border-white/[0.06] rounded-lg hover:border-rose-gold/30 transition group"
              >
                <img src={talent?.cover} alt={talent?.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-base text-ivory leading-none">{talent?.name}</p>
                    {inq.unread && <span className="w-2 h-2 rounded-full bg-rose-gold shrink-0" />}
                  </div>
                  <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-1">{inq.engagement}</p>
                  <p className="text-xs text-soft-ivory/70 mt-2 line-clamp-1 leading-snug">{inq.lastMessage}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[0.5rem] tracking-luxe uppercase text-rose-gold/80">{inq.status}</span>
                    <span className="text-[0.55rem] text-muted-grey flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" strokeWidth={1.2} /> {inq.updated}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-grey group-hover:text-rose-gold transition self-center" strokeWidth={1.2} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}