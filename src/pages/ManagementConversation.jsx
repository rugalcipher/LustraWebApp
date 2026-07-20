import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send, Lock } from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import { api } from "@/api/client";
import * as managementService from "@/services/managementService";
import { isOwnMessage } from "@/services/conversationService";

/**
 * A conversation as management sees it.
 *
 * Deliberately simpler than the client thread: no SignalR. Staff work this queue on a
 * desktop and refresh explicitly, and opening a socket per staff member per conversation
 * would multiply connections against a hub that has NO BACKPLANE (single-instance only).
 * REST is authoritative for everyone, so this view is complete without it — just not live.
 */
const PAGE_SIZE = 50;

export default function ManagementConversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { principal } = usePrincipal();
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);

  const messagesQuery = useQuery({
    queryKey: queryKeys.management.conversationMessages(id ?? "", 1),
    queryFn: ({ signal }) =>
      api.get(`/management/conversations/${id}/messages`, {
        query: { page: 1, pageSize: PAGE_SIZE },
        signal,
      }),
    enabled: Boolean(id),
    staleTime: 10_000,
  });

  const send = useMutation({
    mutationFn: (body) => managementService.postMessage(id, { body }),
    // No idempotency key on this endpoint, so a silent retry could double-post.
    retry: false,
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.management.conversationMessages(id ?? "", 1),
      });
      queryClient.invalidateQueries({ queryKey: ["management", "conversations"] });
    },
  });

  // Mark read on open so the console badge reflects what staff have actually seen.
  useEffect(() => {
    if (!id) return;
    managementService
      .markConversationRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ["management", "conversations"] }))
      .catch(() => {
        // Read state is a convenience; failing to set it must not block the thread.
      });
  }, [id, queryClient]);

  const messages = [...(messagesQuery.data?.items ?? [])].sort(
    (a, b) => new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime()
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    try {
      await send.mutateAsync(body);
    } catch (err) {
      toast({ title: "Couldn't send", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (messagesQuery.isPending) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (messagesQuery.isError) {
    const notFound = isApiError(messagesQuery.error) && messagesQuery.error.kind === "not_found";
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">
          {notFound ? "Conversation not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {toUserMessage(messagesQuery.error)}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <InternalHeader
        eyebrow="Management"
        title="Conversation"
        subtitle="You are replying as Lustra management."
      />

      <div className="px-5 lg:px-8 py-6 max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
        </button>

        <Card className="mt-4 p-5">
          {messages.length === 0 ? (
            <p className="font-body text-sm text-muted-grey py-8 text-center">
              No messages yet.
            </p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {messages.map((message) => {
                const mine = isOwnMessage(message, principal.userId);
                return (
                  <div
                    key={message.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3.5 py-2.5",
                        message.isSystem
                          ? "bg-transparent border border-white/[0.06] text-muted-grey"
                          : mine
                            ? "bg-rose-gold/10 border border-rose-gold/25"
                            : "bg-card-black border border-white/[0.06]"
                      )}
                    >
                      {message.isSystem && (
                        <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey/70 mb-1">
                          System
                        </p>
                      )}
                      <p className="font-body text-sm text-soft-ivory/90 whitespace-pre-line leading-relaxed">
                        {message.body}
                      </p>
                      {message.attachments?.length > 0 && (
                        <p className="text-[0.55rem] text-muted-grey mt-1.5">
                          {message.attachments.length} attachment
                          {message.attachments.length === 1 ? "" : "s"}
                        </p>
                      )}
                      <p className="text-[0.5rem] text-muted-grey/70 mt-1.5">
                        {new Date(message.createdAtUtc).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          )}

          <form onSubmit={submit} className="mt-4 pt-4 border-t border-white/[0.06]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Reply as Lustra management…"
              className="w-full bg-transparent border border-white/10 rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
            />
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="inline-flex items-center gap-1.5 text-[0.55rem] text-muted-grey">
                <Lock className="w-2.5 h-2.5" strokeWidth={1.3} />
                Visible to the client. Use internal notes for anything private.
              </p>
              <button
                type="submit"
                disabled={draft.trim().length === 0 || send.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border border-rose-gold/40 text-rose-gold text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition disabled:opacity-50"
              >
                <Send className="w-3 h-3" strokeWidth={1.3} />
                {send.isPending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </Card>

        {/* Honest about liveness: this view does not hold a socket. */}
        <p className="font-body text-[0.6rem] text-muted-grey mt-3">
          This view is not live — refresh to see new replies.
        </p>
      </div>
    </div>
  );
}
