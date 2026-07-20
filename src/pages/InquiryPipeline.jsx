import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Clock, ChevronRight, AlertCircle } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/api/problemDetails";
import { presentStatus } from "@/services/inquiryService";
import { formatBookingDate } from "@/services/bookingService";
import { PIPELINE_COLUMNS, priorityTone } from "@/services/managementService";
import { useInquiryPipeline } from "@/features/management/hooks";

/**
 * The inquiry pipeline.
 *
 * A READ-ONLY board over real inquiry statuses. Drag-and-drop was removed deliberately:
 * the previous version let a card be dragged between columns and mutated local state only,
 * so the change looked applied but reached no server and vanished on refresh. Status is a
 * real transition with server-side rules, so it is changed on the inquiry itself where
 * the outcome can be reported honestly.
 */
const COLUMN_ACCENT = {
  New: "text-warning",
  Reviewing: "text-rose-gold",
  Proposal: "text-light-rose-gold",
  Closed: "text-muted-grey",
};

export default function InquiryPipeline() {
  const { columns, total, isPending, isError, error } = useInquiryPipeline();
  const [focused, setFocused] = useState(null);

  return (
    <div className="w-full">
      <InternalHeader
        eyebrow="Management"
        title="Inquiry Pipeline"
        subtitle={isPending ? "Loading…" : `${total} ${total === 1 ? "inquiry" : "inquiries"} in view.`}
      />

      <div className="px-5 lg:px-8 py-6">
        {isPending ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : isError ? (
          <div className="py-24 text-center">
            <p className="font-heading text-2xl text-ivory">Couldn't load the pipeline</p>
            <p className="mt-3 font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {PIPELINE_COLUMNS.map((column) => {
              const items = columns[column.id] ?? [];
              return (
                <div key={column.id}>
                  <div className="flex items-center justify-between mb-3">
                    <Eyebrow>
                      <span className={COLUMN_ACCENT[column.id]}>{column.label}</span>
                    </Eyebrow>
                    <span className="text-[0.6rem] font-body text-muted-grey">{items.length}</span>
                  </div>

                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <Card className="p-4 border-dashed border-white/[0.06]">
                        <p className="font-body text-[0.65rem] text-muted-grey text-center">Empty</p>
                      </Card>
                    ) : (
                      items.map((inquiry) => (
                        <InquiryCard
                          key={inquiry.id}
                          inquiry={inquiry}
                          expanded={focused === inquiry.id}
                          onToggle={() => setFocused(focused === inquiry.id ? null : inquiry.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InquiryCard({ inquiry, expanded, onToggle }) {
  const status = presentStatus(inquiry.status);
  const tone = priorityTone(inquiry.priority);

  return (
    <Card className={cn("p-3.5 transition", expanded && "border-rose-gold/30")}>
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="font-body text-sm text-ivory truncate min-w-0">{inquiry.talentDisplayName}</p>
          {tone === "high" && (
            <AlertCircle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" strokeWidth={1.4} />
          )}
        </div>
        <p className="font-body text-[0.65rem] text-muted-grey mt-1 truncate">
          {inquiry.engagementCategory}
        </p>
        <div className="flex items-center gap-2.5 mt-2 text-[0.6rem] text-muted-grey">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" strokeWidth={1.2} />
            {inquiry.preferredDate ? formatBookingDate(inquiry.preferredDate) : "Flexible"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          <Row label="Status" value={status.label} />
          <Row label="Priority" value={inquiry.priority} />
          <Row label="Received" value={new Date(inquiry.createdAtUtc).toLocaleDateString()} />
          <Row
            label="Assigned"
            value={inquiry.assignedManagementUserId ? "Assigned" : "Unassigned"}
          />

          <div className="flex gap-2 pt-1">
            <Link
              to={`/inquiry-pipeline/${inquiry.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-sm border border-rose-gold/40 text-rose-gold text-[0.55rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition"
            >
              Open <ChevronRight className="w-3 h-3" strokeWidth={1.3} />
            </Link>
            <Link
              to={`/management-conversations/${inquiry.conversationId}`}
              className="flex-1 inline-flex items-center justify-center py-2 rounded-sm border border-white/10 text-muted-grey text-[0.55rem] tracking-luxe uppercase hover:text-ivory hover:border-white/25 transition"
            >
              Conversation
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 items-baseline">
      <span className="text-[0.55rem] tracking-luxe uppercase text-muted-grey shrink-0">{label}</span>
      <span className="text-[0.7rem] font-body text-soft-ivory/85 text-right truncate">{value}</span>
    </div>
  );
}
