import React from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import Monogram from "@/lib/lustra/Monogram";
import { toUserMessage } from "@/api/problemDetails";
import { useConversations } from "@/features/conversations/hooks";

/**
 * The client's concierge conversations.
 *
 * A client only ever converses with Lustra MANAGEMENT — never directly with talent.
 * Every conversation here was opened by the server when an inquiry was submitted.
 */
export default function Messages() {
  const { data: conversations, isPending, isError, error } = useConversations();

  return (
    <div className="px-5 pt-6 pb-8">
      <Eyebrow>Concierge</Eyebrow>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Messages</h1>

      {isPending ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
        </div>
      ) : isError ? (
        <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          body="When you submit an inquiry, a private conversation with your Lustra concierge opens here."
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
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/app/messages/${conversation.id}`}
              className="flex items-center gap-3 p-3.5 bg-card-black/70 border border-white/[0.06] rounded-lg hover:border-rose-gold/30 transition group"
            >
              <div className="w-10 h-10 rounded-full bg-elevated-black border border-rose-gold/25 flex items-center justify-center shrink-0">
                <Monogram size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading text-base text-ivory leading-none truncate">
                    {conversation.subject || "Lustra Concierge"}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-gold text-noir text-[0.55rem] font-body flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-1.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" strokeWidth={1.2} />
                  {conversation.lastMessageAtUtc
                    ? new Date(conversation.lastMessageAtUtc).toLocaleString()
                    : "No messages yet"}
                </p>
              </div>

              <ChevronRight
                className={cn(
                  "w-4 h-4 shrink-0 transition",
                  conversation.unreadCount > 0 ? "text-rose-gold" : "text-muted-grey group-hover:text-rose-gold"
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
