import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, ChevronRight, Loader2, Clock, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import Monogram from "@/lib/lustra/Monogram";
import { toUserMessage } from "@/api/problemDetails";
import { listTalentConversations } from "@/services/talentConversationService";

/**
 * The talent's booking conversations.
 *
 * Every row here is a confirmed appointment the talent is assigned to — the only threads a
 * talent is ever a participant of. It shows who the appointment is with (the client's
 * permitted display name), when it is, and its status, so the talent can triage at a glance.
 */
export default function TalentMessages() {
  const {
    data: conversations,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["talent", "conversations"],
    queryFn: ({ signal }) => listTalentConversations(signal),
  });

  return (
    <div className="px-5 pt-6 pb-8 max-w-3xl">
      <p className="text-[0.55rem] tracking-luxe uppercase text-rose-gold">Bookings</p>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Messages</h1>

      {isPending ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : isError ? (
        <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      ) : conversations.length === 0 ? (
        <div className="py-20 text-center">
          <MessageSquare className="w-8 h-8 text-muted-grey/50 mx-auto" strokeWidth={1.2} />
          <p className="font-heading text-lg text-ivory mt-4">No booking conversations yet</p>
          <p className="font-body text-sm text-muted-grey mt-2 max-w-sm mx-auto">
            When Lustra confirms an appointment for you, a private conversation with the client
            opens here so you can coordinate the arrangements.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 mt-5">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/talent-messages/${conversation.id}`}
              className="flex items-center gap-3 p-3.5 bg-card-black/70 border border-white/[0.06] rounded-lg hover:border-rose-gold/30 transition group"
            >
              <div className="w-10 h-10 rounded-full bg-elevated-black border border-rose-gold/25 flex items-center justify-center shrink-0">
                <Monogram size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading text-base text-ivory leading-none truncate">
                    {conversation.counterpartyDisplayName || conversation.subject || "Client"}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-gold text-noir text-[0.55rem] font-body flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>

                {(conversation.bookingReference || conversation.bookingDate) && (
                  <p className="text-[0.6rem] font-body text-soft-ivory/70 mt-1 flex items-center gap-1 truncate">
                    <CalendarCheck className="w-2.5 h-2.5 shrink-0 text-rose-gold" strokeWidth={1.4} />
                    {[
                      formatDate(conversation.bookingDate),
                      conversation.bookingStatus,
                      conversation.bookingReference,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" strokeWidth={1.2} />
                  {conversation.lastMessageAtUtc
                    ? new Date(conversation.lastMessageAtUtc).toLocaleString()
                    : "No messages yet"}
                </p>
              </div>

              <ChevronRight
                className={cn(
                  "w-4 h-4 shrink-0 transition",
                  conversation.unreadCount > 0
                    ? "text-rose-gold"
                    : "text-muted-grey group-hover:text-rose-gold"
                )}
                strokeWidth={1.2}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
