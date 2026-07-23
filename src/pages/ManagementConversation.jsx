import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarPlus,
  Crown,
  Loader2,
  Lock,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import { api } from "@/api/client";
import * as managementService from "@/services/managementService";
import { isOwnMessage } from "@/services/conversationService";
import { presentAppointmentStatus } from "@/services/appointmentService";
import { formatBookingDate, formatBookingTime } from "@/services/bookingService";
import {
  useManagementConversation,
  useConversationClientSummary,
  useConversationAppointment,
  useConversationNotes,
  useAddConversationNote,
  useAssignConversation,
} from "@/features/management/hooks";
import { useLiveThread } from "@/features/conversations/hooks";
import { useManagementStaff } from "@/features/admin/hooks";

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
  const [note, setNote] = useState("");
  const endRef = useRef(null);

  const conversation = useManagementConversation(id);
  const clientSummary = useConversationClientSummary(id);
  const appointment = useConversationAppointment(id);
  const notes = useConversationNotes(id);
  const addNote = useAddConversationNote(id);
  const assign = useAssignConversation(id);
  const staff = useManagementStaff();

  // Live: refetch this thread + the inbox when a client/talent message or access change arrives.
  const liveKeys = useMemo(
    () => [
      queryKeys.management.conversationMessages(id ?? "", 1),
      queryKeys.management.conversation(id ?? ""),
      ["management", "conversations"],
    ],
    [id]
  );
  useLiveThread(id, liveKeys);

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

  // The send mode is chosen explicitly and NEVER retained across conversations or between
  // proxy sends — a manager must deliberately opt into speaking for the talent each time.
  const [sendMode, setSendMode] = useState("management");
  useEffect(() => setSendMode("management"), [id]);

  const invalidateThread = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.management.conversationMessages(id ?? "", 1),
    });
    queryClient.invalidateQueries({ queryKey: ["management", "conversations"] });
  };

  const send = useMutation({
    mutationFn: (body) => managementService.postMessage(id, { body }),
    // No idempotency key on this endpoint, so a silent retry could double-post.
    retry: false,
    onSuccess: () => {
      setDraft("");
      invalidateThread();
    },
  });

  const sendOnBehalf = useMutation({
    mutationFn: (body) => managementService.postMessageOnBehalf(id, { body }),
    retry: false,
    onSuccess: () => {
      setDraft("");
      // Back to Management after each proxy send: the next one needs a fresh, explicit choice.
      setSendMode("management");
      invalidateThread();
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

  // Proxy sending is only offered on a booking conversation, where a talent is a participant
  // to represent. Everywhere else the composer sends plainly as management.
  const isBookingConversation = conversation.data?.type === "BookingManagement";
  const talentName = conversation.data?.talentDisplayName;
  const proxyAvailable = isBookingConversation && Boolean(talentName);
  const proxyMode = proxyAvailable && sendMode === "proxy";
  const sending = send.isPending || sendOnBehalf.isPending;

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    try {
      if (sendMode === "proxy") await sendOnBehalf.mutateAsync(body);
      else await send.mutateAsync(body);
    } catch (err) {
      toast({ title: "Couldn't send", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const submitNote = async (event) => {
    event.preventDefault();
    const text = note.trim();
    if (!text) return;
    try {
      await addNote.mutateAsync(text);
      setNote("");
    } catch (err) {
      toast({
        title: "Couldn't save the note",
        description: toUserMessage(err),
        variant: "destructive",
      });
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

      <div className="px-5 lg:px-8 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
        </button>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2">
        <Card className="p-5">
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
                      {message.isSystem ? (
                        <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey/70 mb-1">
                          System
                        </p>
                      ) : (
                        message.displayAttribution && (
                          <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey/70 mb-1">
                            {message.displayAttribution}
                          </p>
                        )
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
            {proxyAvailable && (
              <div className="mb-2.5">
                <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey/70 mb-1.5">
                  Send as
                </p>
                <div className="inline-flex rounded-sm border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSendMode("management")}
                    className={cn(
                      "px-3 py-1.5 text-[0.6rem] tracking-luxe uppercase transition",
                      !proxyMode ? "bg-rose-gold/15 text-rose-gold" : "text-muted-grey hover:text-soft-ivory"
                    )}
                  >
                    Management
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode("proxy")}
                    className={cn(
                      "px-3 py-1.5 text-[0.6rem] tracking-luxe uppercase transition border-l border-white/10",
                      proxyMode ? "bg-amber-500/20 text-amber-300" : "text-muted-grey hover:text-soft-ivory"
                    )}
                  >
                    On behalf of {talentName}
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder={proxyMode ? `Reply as ${talentName} (sent by you)…` : "Reply as Lustra management…"}
              className={cn(
                "w-full bg-transparent border rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none transition resize-none",
                proxyMode ? "border-amber-500/40 focus:border-amber-400/60" : "border-white/10 focus:border-rose-gold/50"
              )}
            />
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="inline-flex items-center gap-1.5 text-[0.55rem] text-muted-grey">
                <Lock className="w-2.5 h-2.5" strokeWidth={1.3} />
                {proxyMode
                  ? `Attributed "Management on behalf of ${talentName}" — recorded as sent by you.`
                  : "Visible to the client. Use internal notes for anything private."}
              </p>
              <button
                type="submit"
                disabled={draft.trim().length === 0 || sending}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border text-[0.6rem] tracking-luxe uppercase transition disabled:opacity-50",
                  proxyMode
                    ? "border-amber-400/50 text-amber-300 hover:bg-amber-500/10"
                    : "border-rose-gold/40 text-rose-gold hover:bg-rose-gold/10"
                )}
              >
                <Send className="w-3 h-3" strokeWidth={1.3} />
                {sending ? "Sending…" : proxyMode ? `Send as ${talentName}` : "Send"}
              </button>
            </div>
          </form>
        </Card>

        {/* Honest about liveness: this view does not hold a socket. */}
        <p className="font-body text-[0.6rem] text-muted-grey mt-3">
          This view is not live — refresh to see new replies.
        </p>
        </div>

        {/* Right rail — who this is, who it is about, and what to do about it. */}
        <aside className="space-y-5">
          <ClientSummaryCard query={clientSummary} />

          <TalentContextCard conversation={conversation} />

          <OwnerCard
            conversation={conversation}
            staff={staff}
            assign={assign}
            currentUserId={principal.userId}
          />

          <AppointmentCard
            query={appointment}
            conversationId={id}
            hasTalent={Boolean(conversation.data?.talentProfileId)}
          />

          {/* Internal notes are visually separated from the thread above on purpose:
              everything in that thread is read by the client, and nothing here is. */}
          <Card className="p-4">
            <Eyebrow>Internal notes</Eyebrow>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.55rem] text-muted-grey">
              <Lock className="w-2.5 h-2.5" strokeWidth={1.3} />
              Staff only — never shown to the client or the talent.
            </p>

            <form onSubmit={submitNote} className="mt-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Note for the team…"
                className="w-full bg-deep-black/60 border border-white/[0.08] rounded-sm p-3 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
              />
              <button
                type="submit"
                disabled={note.trim().length === 0 || addNote.isPending}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-white/15 text-muted-grey hover:text-ivory hover:border-white/30 text-[0.6rem] tracking-luxe uppercase transition disabled:opacity-40"
              >
                <NotebookPen className="w-3 h-3" strokeWidth={1.3} />
                {addNote.isPending ? "Saving…" : "Add note"}
              </button>
            </form>

            <div className="mt-4 space-y-2.5">
              {(notes.data ?? []).length === 0 ? (
                <p className="font-body text-xs text-muted-grey">No internal notes yet.</p>
              ) : (
                notes.data.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-sm border border-white/[0.06] bg-deep-black/40 px-3 py-2.5"
                  >
                    <p className="font-body text-xs text-soft-ivory/90 whitespace-pre-line leading-relaxed">
                      {entry.note}
                    </p>
                    <p className="text-[0.5rem] text-muted-grey/70 mt-1.5">
                      {new Date(entry.createdAtUtc).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * The client summary panel.
 *
 * Only what management is authorised to hold — how to address them, how they wish to be
 * contacted, and standing preferences the client wrote themselves. Nothing here may be
 * passed to a talent: management is always the intermediary.
 */
function ClientSummaryCard({ query }) {
  if (query.isPending) {
    return (
      <Card className="p-4">
        <Eyebrow>Client</Eyebrow>
        <p className="mt-3 inline-flex items-center gap-2 font-body text-xs text-muted-grey">
          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.4} /> Loading…
        </p>
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="p-4">
        <Eyebrow>Client</Eyebrow>
        <p className="mt-3 font-body text-xs text-muted-grey">No client on this conversation.</p>
      </Card>
    );
  }

  const client = query.data;

  return (
    <Card className="p-4">
      <Eyebrow>Client</Eyebrow>

      <div className="mt-3 flex items-start gap-2.5">
        <UserRound className="w-4 h-4 text-rose-gold mt-0.5 shrink-0" strokeWidth={1.4} />
        <div className="min-w-0">
          <p className="font-heading text-base text-ivory truncate">
            {client.preferredName || client.displayName}
          </p>
          {client.preferredName && client.preferredName !== client.displayName && (
            <p className="font-body text-[0.6rem] text-muted-grey truncate">
              Account: {client.displayName}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {client.email && <Detail icon={Mail} value={client.email} />}
        {client.phoneNumber && <Detail icon={Phone} value={client.phoneNumber} />}
        {client.preferredCityName && <Detail icon={MapPin} value={client.preferredCityName} />}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag tone={client.isVerified ? "good" : "muted"}>
          {client.isVerified ? "Verified" : "Unverified"}
        </Tag>
        {client.hasActiveVip && (
          <Tag tone="gold">
            <Crown className="w-2.5 h-2.5" strokeWidth={1.5} /> VIP
          </Tag>
        )}
        <Tag tone="muted">Prefers {client.contactPreference}</Tag>
      </div>

      {client.engagementPreferences && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-[0.5rem] tracking-wide-luxe uppercase text-muted-grey">
            Standing preferences
          </p>
          <p className="mt-1 font-body text-xs text-soft-ivory/90 whitespace-pre-line leading-relaxed">
            {client.engagementPreferences}
          </p>
        </div>
      )}

      <p className="mt-3 text-[0.5rem] text-muted-grey/70">
        With Lustra since {new Date(client.memberSinceUtc).toLocaleDateString()}
      </p>
    </Card>
  );
}

/**
 * The talent this conversation is ABOUT.
 *
 * Context, not participation — the talent is not in this thread and cannot read it.
 */
function TalentContextCard({ conversation }) {
  const talentName = conversation.data?.talentDisplayName;
  const talentSlug = conversation.data?.talentSlug;

  return (
    <Card className="p-4">
      <Eyebrow>Selected talent</Eyebrow>
      {talentName ? (
        <>
          <p className="mt-3 font-heading text-base text-ivory">{talentName}</p>
          {talentSlug && (
            <Link
              to={`/talent/${talentSlug}`}
              className="mt-1 inline-block font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold hover:underline"
            >
              View profile
            </Link>
          )}
          <p className="mt-2.5 font-body text-[0.55rem] text-muted-grey leading-relaxed">
            Context only. {talentName} is not a participant and cannot read this conversation.
          </p>
        </>
      ) : (
        <p className="mt-3 font-body text-xs text-muted-grey">
          This conversation is not about a specific talent.
        </p>
      )}
    </Card>
  );
}

/**
 * Who owns this conversation.
 *
 * There is no staff-directory endpoint, so the picker is populated from the admin user
 * search filtered to active Management — a route Management already holds `Users.View`
 * for. Better than inventing a parallel endpoint for one dropdown.
 */
function OwnerCard({ conversation, staff, assign, currentUserId }) {
  const assignedTo = conversation.data?.assignedToUserId ?? null;
  const options = staff.data?.items ?? [];

  const choose = async (userId) => {
    if (!userId) return;
    try {
      await assign.mutateAsync(userId);
      toast({ title: "Conversation assigned" });
    } catch (err) {
      toast({ title: "Couldn't assign", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <Card className="p-4">
      <Eyebrow>Owner</Eyebrow>

      {staff.isError ? (
        <p className="mt-3 font-body text-xs text-muted-grey">
          Staff list unavailable. You can still reply; assignment needs the user directory.
        </p>
      ) : (
        <>
          <select
            value={assignedTo ?? ""}
            onChange={(e) => choose(e.target.value)}
            disabled={assign.isPending || staff.isPending}
            aria-label="Assign this conversation"
            className="mt-3 w-full bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2.5 font-body text-sm text-ivory focus:outline-none focus:border-rose-gold/50 transition disabled:opacity-50"
          >
            <option value="" className="bg-noir">
              {staff.isPending ? "Loading…" : "Unassigned"}
            </option>
            {options.map((member) => (
              <option key={member.id} value={member.id} className="bg-noir">
                {member.displayName}
                {member.id === currentUserId ? " (you)" : ""}
              </option>
            ))}
          </select>

          {currentUserId && assignedTo !== currentUserId && (
            <button
              onClick={() => choose(currentUserId)}
              disabled={assign.isPending}
              className="mt-2 w-full px-3 py-2 rounded-sm border border-white/15 text-muted-grey hover:text-ivory hover:border-white/30 text-[0.6rem] tracking-luxe uppercase transition disabled:opacity-40"
            >
              Assign to me
            </button>
          )}
        </>
      )}

      <p className="mt-2.5 font-body text-[0.55rem] text-muted-grey leading-relaxed">
        Assignment is for triage only. Any staff member can still read and reply.
      </p>
    </Card>
  );
}

/** The linked appointment, or the action that creates one. */
function AppointmentCard({ query, conversationId, hasTalent }) {
  const appointment = query.data;

  if (appointment) {
    return (
      <Card className="p-4">
        <Eyebrow>Appointment</Eyebrow>
        <p className="mt-3 font-heading text-base text-ivory">{appointment.bookingReference}</p>
        <p className="font-body text-[0.6rem] tracking-luxe uppercase text-rose-gold mt-0.5">
          {presentAppointmentStatus(appointment.status)}
        </p>

        <div className="mt-3 space-y-1.5 font-body text-xs text-soft-ivory/90">
          <p>{formatBookingDate(appointment.confirmedDate)}</p>
          {appointment.startTime && (
            <p className="text-muted-grey">
              {formatBookingTime(appointment.startTime)}
              {appointment.endTime ? ` – ${formatBookingTime(appointment.endTime)}` : ""}
            </p>
          )}
          {appointment.venueName && <p className="text-muted-grey">{appointment.venueName}</p>}
          <p className="text-muted-grey">{appointment.talentDisplayName}</p>
        </div>

        <Link
          to={`/agency-calendar?appointment=${appointment.bookingId}`}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-rose-gold/40 text-rose-gold text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition"
        >
          Open on the calendar
        </Link>

        <p className="mt-2.5 inline-flex items-center gap-1.5 text-[0.5rem] text-muted-grey">
          <Lock className="w-2.5 h-2.5" strokeWidth={1.3} />
          Internal record. The client cannot see it.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <Eyebrow>Appointment</Eyebrow>
      <p className="mt-3 font-body text-xs text-muted-grey leading-relaxed">
        None yet. Create one once you have agreed the arrangement with the client and confirmed
        availability with the talent.
      </p>

      <Link
        to={`/create-appointment?conversationId=${conversationId}`}
        aria-disabled={!hasTalent}
        onClick={(e) => {
          if (!hasTalent) e.preventDefault();
        }}
        className={cn(
          "mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-sm bg-gradient-to-r from-light-rose-gold via-rose-gold to-rose-gold text-noir font-body text-[0.62rem] tracking-luxe uppercase font-medium transition",
          !hasTalent && "opacity-40 pointer-events-none"
        )}
      >
        <CalendarPlus className="w-3.5 h-3.5" strokeWidth={1.6} />
        Create appointment
      </Link>

      {!hasTalent && (
        <p className="mt-2 font-body text-[0.55rem] text-warning">
          Needs a selected talent on the conversation.
        </p>
      )}
    </Card>
  );
}

function Detail({ icon: Icon, value }) {
  return (
    <p className="flex items-start gap-2 font-body text-xs text-soft-ivory/90 min-w-0">
      <Icon className="w-3 h-3 text-muted-grey mt-0.5 shrink-0" strokeWidth={1.4} />
      <span className="truncate">{value}</span>
    </p>
  );
}

function Tag({ tone, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5rem] tracking-wide-luxe uppercase border",
        tone === "gold" && "border-rose-gold/40 text-rose-gold",
        tone === "good" && "border-success/40 text-success",
        tone === "muted" && "border-white/10 text-muted-grey"
      )}
    >
      {children}
    </span>
  );
}
