import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2, Lock, CalendarCheck, RefreshCw, Paperclip, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { resolveMediaUrl } from "@/services/mediaUrl";
import { usePrincipal } from "@/auth/PrincipalContext";

/** Attachments are capped client-side to match the server's 10 MB limit. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
import {
  getTalentMessages,
  postTalentMessage,
  markTalentConversationRead,
  isOwnTalentMessage,
  listTalentConversations,
} from "@/services/talentConversationService";
import { useLiveThread } from "@/features/conversations/hooks";

/**
 * One booking conversation, from the talent's side.
 *
 * Live over the shared SignalR connection: incoming client/management messages refetch this
 * thread, and losing access (a reassignment) drops it. The talent is a participant only because
 * they are assigned to this booking; the server enforces that on every call and on the hub join,
 * so a changed id in the URL — or a revoked assignment — yields not-found.
 */
export default function TalentConversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { principal } = usePrincipal();

  const [limit, setLimit] = useState(30);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Live: refetch this thread + the talent list on any message/access event for it.
  const liveKeys = useMemo(
    () => [["talent", "conversations", id, "messages"], ["talent", "conversations"]],
    [id]
  );
  useLiveThread(id, liveKeys);

  const messagesQuery = useQuery({
    queryKey: ["talent", "conversations", id, "messages", limit],
    queryFn: ({ signal }) => getTalentMessages(id, 1, limit, signal),
    enabled: Boolean(id),
    retry: false,
  });

  // The header context (client name + appointment) comes from the cached list — no separate
  // talent conversation-detail endpoint exists, and none is needed.
  const listQuery = useQuery({
    queryKey: ["talent", "conversations"],
    queryFn: ({ signal }) => listTalentConversations(signal),
  });
  const summary = useMemo(
    () => listQuery.data?.find((c) => c.id === id) ?? null,
    [listQuery.data, id]
  );

  // Newest-first from the API; render oldest-first so the latest sits at the bottom.
  const messages = useMemo(
    () => (messagesQuery.data?.items ? [...messagesQuery.data.items].reverse() : []),
    [messagesQuery.data]
  );
  const hasOlder = Boolean(messagesQuery.data && messagesQuery.data.totalCount > messages.length);

  const markedRef = useRef(false);
  useEffect(() => {
    if (!id || markedRef.current || messages.length === 0) return;
    markedRef.current = true;
    markTalentConversationRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["talent", "conversations"] }))
      .catch(() => {});
  }, [id, messages.length, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: (input) => postTalentMessage(id, input),
    retry: false,
    onSuccess: () => {
      setDraft("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["talent", "conversations", id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["talent", "conversations"] });
    },
    onError: (err) =>
      toast({ title: "Message not sent", description: toUserMessage(err), variant: "destructive" }),
  });

  const pickFile = (event) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    if (chosen.size > MAX_ATTACHMENT_BYTES) {
      toast({
        title: "Attachment too large",
        description: "Attachments must be 10 MB or smaller.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    setFile(chosen);
  };

  const busy = sendMessage.isPending;
  const canSend = (draft.trim().length > 0 || file) && !busy;
  const send = () => {
    if (canSend) sendMessage.mutate({ body: draft.trim() || null, file });
  };

  if (messagesQuery.isError) {
    const notFound = isApiError(messagesQuery.error) && messagesQuery.error.kind === "not_found";
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">
          {notFound ? "Conversation not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound
            ? "It may no longer be available, or it is not one of your bookings."
            : toUserMessage(messagesQuery.error)}
        </p>
        <Link
          to="/talent-messages"
          className="mt-6 inline-block text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
        >
          Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-noir/60">
        <button onClick={() => navigate("/talent-messages")} className="text-ivory" aria-label="Back">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-base text-ivory leading-none truncate">
            {summary?.counterpartyDisplayName || summary?.subject || "Booking conversation"}
          </p>
          <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey mt-0.5">
            {[summary?.bookingStatus, summary?.bookingReference].filter(Boolean).join(" · ") ||
              "Booking conversation"}
          </p>
        </div>
        {summary?.bookingId && (
          <Link
            to={`/talent-bookings/${summary.bookingId}`}
            className="flex items-center gap-1.5 text-[0.55rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-3 py-2 rounded-sm hover:bg-rose-gold/5 transition shrink-0"
          >
            <CalendarCheck className="w-3 h-3" strokeWidth={1.4} /> Appointment
          </Link>
        )}
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto lustra-scroll-hide px-4 py-4 space-y-3">
        {hasOlder && (
          <div className="flex justify-center">
            <button
              onClick={() => setLimit((n) => n + 30)}
              disabled={messagesQuery.isFetching}
              className="flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-rose-gold transition"
            >
              <RefreshCw className={cn("w-3 h-3", messagesQuery.isFetching && "animate-spin")} strokeWidth={1.4} />
              Load older messages
            </button>
          </div>
        )}

        {messagesQuery.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center font-body text-sm text-muted-grey">
            No messages yet. Say hello to coordinate the appointment.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} userId={principal.userId} />
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/[0.06] bg-noir/80 px-3 py-2.5 safe-bottom">
        {file && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-sm bg-card-black border border-white/[0.08]">
            <FileText className="w-3.5 h-3.5 text-rose-gold shrink-0" strokeWidth={1.2} />
            <span className="flex-1 min-w-0 truncate font-body text-[0.7rem] text-soft-ivory/85">{file.name}</span>
            <button
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remove attachment"
              className="text-muted-grey hover:text-ivory"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.4} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" onChange={pickFile} className="hidden" id="talent-chat-attachment" />
          <label
            htmlFor="talent-chat-attachment"
            aria-label="Attach a file"
            className="w-9 h-9 flex items-center justify-center text-muted-grey hover:text-rose-gold transition cursor-pointer shrink-0"
          >
            <Paperclip className="w-5 h-5" strokeWidth={1.2} />
          </label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 bg-card-black border border-white/[0.08] rounded-full px-4 py-2.5 text-base font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition"
          />
          <button
            onClick={send}
            disabled={!canSend}
            aria-label="Send message"
            className="w-9 h-9 rounded-full bg-gradient-to-br from-light-rose-gold to-rose-gold flex items-center justify-center text-noir disabled:opacity-30 transition shrink-0"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Send className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
        <p className="text-[0.5rem] tracking-wide-luxe text-muted-grey/60 mt-1.5 flex items-center gap-1 justify-center">
          <Lock className="w-2.5 h-2.5" strokeWidth={1.2} /> Private · This conversation is tied to
          your booking and overseen by Lustra management
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message, userId }) {
  const mine = isOwnTalentMessage(message, userId);

  if (message.isDeleted) {
    return (
      <p className="text-center font-body text-[0.6rem] italic text-muted-grey/70">
        This message was removed.
      </p>
    );
  }

  if (message.isSystem) {
    return (
      <div className="mx-auto max-w-[85%] rounded-lg border border-rose-gold/20 bg-card-black/60 px-4 py-3">
        <p className="font-body text-[0.75rem] leading-relaxed text-soft-ivory/85 text-center whitespace-pre-line">
          {message.body}
        </p>
        <p className="mt-2 text-[0.5rem] text-muted-grey text-center">{formatTime(message.createdAtUtc)}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {/* Attribution for everything not written by this talent: the client's name, "Management",
          or "Management on behalf of {talent}". Comes from the server, never a legal name. */}
      {!mine && message.displayAttribution && (
        <span className="mb-0.5 px-1 text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey">
          {message.displayAttribution}
        </span>
      )}
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-line",
          mine
            ? "bg-gradient-to-br from-rose-gold to-rose-gold/80 text-noir rounded-br-sm"
            : "bg-card-black text-soft-ivory rounded-bl-sm border border-white/[0.06]"
        )}
      >
        {message.body}

        {message.attachments?.length > 0 && (
          <div className={cn("mt-2 space-y-1.5", message.body && "pt-2 border-t border-current/15")}>
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={resolveMediaUrl(attachment.url) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[0.7rem] underline underline-offset-2"
              >
                <FileText className="w-3 h-3 shrink-0" strokeWidth={1.4} />
                {/* The server-provided filename, rendered as text (never HTML). */}
                <span className="truncate">{attachment.fileName}</span>
              </a>
            ))}
          </div>
        )}
      </div>
      <span className="mt-1 px-1 text-[0.5rem] text-muted-grey">{formatTime(message.createdAtUtc)}</span>
    </div>
  );
}

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
