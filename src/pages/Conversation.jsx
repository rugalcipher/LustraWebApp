import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Loader2, Lock, X, FileText, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import Monogram from "@/lib/lustra/Monogram";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { resolveMediaUrl } from "@/services/mediaUrl";
import { isOwnMessage } from "@/services/conversationService";
import { usePrincipal } from "@/auth/PrincipalContext";
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useLiveConversation,
} from "@/features/conversations/hooks";

/** Attachments are capped client-side to match the server's limit. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * One conversation with Lustra management.
 *
 * REST loads and sends; SignalR delivers live updates on top. With the socket down the
 * thread still works — it simply stops updating without a refresh, which the header
 * says plainly rather than pretending to be connected.
 */
export default function Conversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { principal } = usePrincipal();

  const { data: conversation, isError: detailError, error: detailErrorValue } = useConversation(id);
  const { messages, isLoading, isError, error } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkConversationRead();
  const { status, isSomeoneTyping, notifyTyping } = useLiveConversation(id);

  // Arriving from "Message" on a talent profile carries a suggested opener. It is placed
  // in the composer as a DRAFT the client can edit or delete — never sent for them, so
  // management only ever reads words the client chose to send.
  const location = useLocation();
  const [draft, setDraft] = useState(() => location.state?.draft ?? "");
  const [file, setFile] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Mark read once the thread is open and has content.
  const markedRef = useRef(false);
  useEffect(() => {
    if (!id || markedRef.current || messages.length === 0) return;
    markedRef.current = true;
    markRead.mutate(id);
  }, [id, messages.length, markRead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSomeoneTyping]);

  const onDraftChange = useCallback(
    (event) => {
      setDraft(event.target.value);
      notifyTyping();
    },
    [notifyTyping]
  );

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

  const send = async () => {
    const body = draft.trim();
    if (!body && !file) return;

    try {
      await sendMessage.mutateAsync({ body: body || null, file });
      setDraft("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      // Never clear the draft on failure — the client would lose what they wrote.
      toast({ title: "Message not sent", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (detailError) {
    const notFound = isApiError(detailErrorValue) && detailErrorValue.kind === "not_found";
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">
          {notFound ? "Conversation not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound ? "It may no longer be available." : toUserMessage(detailErrorValue)}
        </p>
        <Link
          to="/app/messages"
          className="mt-6 inline-block text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
        >
          Back to Messages
        </Link>
      </div>
    );
  }

  const busy = sendMessage.isPending;
  const canSend = (draft.trim().length > 0 || file) && !busy;

  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-noir/60">
        <button onClick={() => navigate("/app/messages")} className="text-ivory" aria-label="Back">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.4} />
        </button>
        <div className="w-9 h-9 rounded-full bg-elevated-black border border-rose-gold/30 flex items-center justify-center">
          <Monogram size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-base text-ivory leading-none truncate">
            {conversation?.subject || "Lustra Concierge"}
          </p>
          {/* Honest connection state — never a decorative "Online". */}
          <p
            className={cn(
              "text-[0.55rem] tracking-wide-luxe uppercase mt-0.5 flex items-center gap-1",
              status === "connected" ? "text-success" : "text-muted-grey"
            )}
          >
            {status === "connected" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live
              </>
            ) : status === "connecting" || status === "reconnecting" ? (
              <>
                <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={1.4} /> Connecting
              </>
            ) : (
              <>
                <WifiOff className="w-2.5 h-2.5" strokeWidth={1.4} /> Not live — refresh to update
              </>
            )}
          </p>
        </div>
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto lustra-scroll-hide px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : isError ? (
          <p className="py-16 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center font-body text-sm text-muted-grey">
            No messages yet. Your concierge will be in touch shortly.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} userId={principal.userId} />
          ))
        )}

        {isSomeoneTyping && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-card-black/70 rounded-2xl rounded-bl-sm w-fit">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-rose-gold/70"
                style={{ animation: `shimmer 1s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/[0.06] bg-noir/80 px-3 py-2.5 safe-bottom">
        {file && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-sm bg-card-black border border-white/[0.08]">
            <FileText className="w-3.5 h-3.5 text-rose-gold shrink-0" strokeWidth={1.2} />
            <span className="flex-1 min-w-0 truncate font-body text-[0.7rem] text-soft-ivory/85">
              {file.name}
            </span>
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
          <input ref={fileInputRef} type="file" onChange={pickFile} className="hidden" id="chat-attachment" />
          <label
            htmlFor="chat-attachment"
            aria-label="Attach a file"
            className="w-9 h-9 flex items-center justify-center text-muted-grey hover:text-rose-gold transition cursor-pointer"
          >
            <Paperclip className="w-5 h-5" strokeWidth={1.2} />
          </label>
          <input
            value={draft}
            onChange={onDraftChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) send();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 bg-card-black border border-white/[0.08] rounded-full px-4 py-2.5 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40 transition"
          />
          <button
            onClick={send}
            disabled={!canSend}
            aria-label="Send message"
            className="w-9 h-9 rounded-full bg-gradient-to-br from-light-rose-gold to-rose-gold flex items-center justify-center text-noir disabled:opacity-30 transition"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Send className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Accurate privacy copy: conversations are private and run through Lustra —
            they are NOT end-to-end encrypted, so we must not claim that. */}
        <p className="text-[0.5rem] tracking-wide-luxe text-muted-grey/60 mt-1.5 flex items-center gap-1 justify-center">
          <Lock className="w-2.5 h-2.5" strokeWidth={1.2} /> Private · All communication runs through
          Lustra management
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message, userId }) {
  const mine = isOwnMessage(message, userId);

  if (message.isDeleted) {
    return (
      <p className="text-center font-body text-[0.6rem] italic text-muted-grey/70">
        This message was removed.
      </p>
    );
  }

  // System messages (inquiry summary, status changes) are announcements, not chat.
  if (message.isSystem) {
    return (
      <div className="mx-auto max-w-[85%] rounded-lg border border-rose-gold/20 bg-card-black/60 px-4 py-3">
        <p className="text-[0.5rem] tracking-luxe uppercase text-rose-gold text-center">
          {systemLabel(message.messageType)}
        </p>
        <p className="mt-2 font-body text-[0.75rem] leading-relaxed text-soft-ivory/85 text-center whitespace-pre-line">
          {message.body}
        </p>
        <p className="mt-2 text-[0.5rem] text-muted-grey text-center">{formatTime(message.createdAtUtc)}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {/* Who sent it, from the server: a talent's or management's display name, or
          "Management on behalf of {talent}" for a proxy message. Never a legal name. */}
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

        {message.attachments.length > 0 && (
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

function systemLabel(messageType) {
  switch (messageType) {
    case "InquirySummary":
      return "Inquiry submitted";
    case "BookingStatus":
      return "Status update";
    case "BookingProposal":
      return "Proposal";
    case "DateProposal":
      return "Proposed date";
    case "ManagementNotice":
      return "Notice";
    default:
      return "Update";
  }
}

function formatTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
