import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { toUserMessage } from "@/api/problemDetails";
import { presentStatus } from "@/services/inquiryService";
import { useMyInquiries } from "@/features/inquiries/hooks";

/**
 * The client's real inquiries. Every row is persisted server-side — there are no
 * seeded examples, no fake "last message" previews and no invented unread counts.
 */

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "all", label: "All" },
  { id: "closed", label: "Closed" },
];

export default function Inquiries() {
  const [filter, setFilter] = useState("active");
  const { data: inquiries, isPending, isError, error } = useMyInquiries();

  const visible = useMemo(() => {
    const list = inquiries ?? [];
    if (filter === "all") return list;
    const wantClosed = filter === "closed";
    return list.filter((i) => (presentStatus(i.status).tone === "closed") === wantClosed);
  }, [inquiries, filter]);

  return (
    <div className="px-5 pt-6 pb-8">
      <Eyebrow>Concierge</Eyebrow>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Inquiries</h1>

      <div className="flex gap-1.5 overflow-x-auto lustra-scroll-hide -mx-5 px-5 mt-5 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 text-[0.6rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border transition font-body",
              filter === f.id
                ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5"
                : "border-white/[0.08] text-muted-grey hover:text-soft-ivory"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : isError ? (
        <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={filter === "active" ? "No active inquiries" : "Nothing here yet"}
          body="When you submit an inquiry, it appears here so you can follow its progress."
          action={
            <Link
              to="/app/discover"
              className="text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
            >
              Discover Talent
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5 mt-5">
          {visible.map((inquiry) => {
            const status = presentStatus(inquiry.status);
            return (
              <Link
                key={inquiry.id}
                to={`/app/inquiries/${inquiry.id}`}
                className="flex gap-3 p-3.5 bg-card-black/70 border border-white/[0.06] rounded-lg hover:border-rose-gold/30 transition group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-base text-ivory leading-none">
                    {inquiry.talentDisplayName}
                  </p>
                  <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-1.5">
                    {inquiry.engagementCategory}
                  </p>
                  <div className="flex items-center justify-between mt-2.5 gap-3">
                    <span
                      className={cn(
                        "text-[0.5rem] tracking-luxe uppercase",
                        status.tone === "closed" ? "text-muted-grey" : "text-rose-gold/90"
                      )}
                    >
                      {status.label}
                    </span>
                    <span className="text-[0.55rem] text-muted-grey flex items-center gap-1 shrink-0">
                      <Clock className="w-2.5 h-2.5" strokeWidth={1.2} />
                      {inquiry.preferredDate
                        ? new Date(inquiry.preferredDate).toLocaleDateString()
                        : `Sent ${new Date(inquiry.createdAtUtc).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className="w-4 h-4 text-muted-grey group-hover:text-rose-gold transition self-center shrink-0"
                  strokeWidth={1.2}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
