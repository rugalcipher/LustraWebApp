import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Calendar, Clock, MapPin, Users, MessageSquare, ChevronRight, Lock,
} from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card, Eyebrow } from "@/components/lustra/Primitives";
import LustraButton from "@/components/lustra/Button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage, isApiError } from "@/api/problemDetails";
import { presentStatus } from "@/services/inquiryService";
import { formatBookingDate, formatBookingTime } from "@/services/bookingService";
import { INQUIRY_STATUSES } from "@/services/managementService";
import {
  useManagementInquiry, useChangeInquiryStatus, useAddInquiryNote,
  useCloseInquiry, useReopenInquiry,
} from "@/features/management/hooks";

/**
 * One inquiry, as management sees it.
 *
 * Carries the internal notes and the full status history the client never sees. Status
 * changes are real server-side transitions — the pipeline board is read-only precisely so
 * that they happen here, where the outcome can be reported honestly.
 */
export default function ManagementInquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: inquiry, isPending, isError, error } = useManagementInquiry(id);

  const changeStatus = useChangeInquiryStatus();
  const addNote = useAddInquiryNote();
  const closeInquiry = useCloseInquiry();
  const reopenInquiry = useReopenInquiry();

  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");

  if (isPending) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    const notFound = isApiError(error) && error.kind === "not_found";
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">
          {notFound ? "Inquiry not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound ? "It may have been removed." : toUserMessage(error)}
        </p>
        <LustraButton as={Link} to="/inquiry-pipeline" variant="outline" size="sm" className="mt-6">
          Back to pipeline
        </LustraButton>
      </div>
    );
  }

  const status = presentStatus(inquiry.status);
  const isClosed = ["Closed", "Cancelled", "Declined"].includes(inquiry.status);

  const submitStatus = async (event) => {
    event.preventDefault();
    if (!nextStatus) return;
    try {
      await changeStatus.mutateAsync({
        inquiryId: id,
        status: nextStatus,
        reason: statusReason.trim() || null,
      });
      setNextStatus("");
      setStatusReason("");
      toast({ title: "Status updated", description: presentStatus(nextStatus).label });
    } catch (err) {
      toast({ title: "Couldn't update", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const submitNote = async (event) => {
    event.preventDefault();
    try {
      await addNote.mutateAsync({ inquiryId: id, note: note.trim() });
      setNote("");
      toast({ title: "Note added" });
    } catch (err) {
      toast({ title: "Couldn't add", description: toUserMessage(err), variant: "destructive" });
    }
  };

  return (
    <div className="w-full">
      <InternalHeader
        eyebrow="Inquiry"
        title={inquiry.talentDisplayName}
        subtitle={inquiry.engagementCategory}
      />

      <div className="px-5 lg:px-8 py-6 space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          <div className="xl:col-span-2 space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Eyebrow>Request</Eyebrow>
                <span
                  className={cn(
                    "text-[0.55rem] tracking-luxe uppercase px-2.5 py-1 rounded-full border",
                    status.tone === "closed"
                      ? "border-white/10 text-muted-grey"
                      : "border-rose-gold/40 text-rose-gold bg-rose-gold/5"
                  )}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Row icon={Calendar} label="Preferred" value={formatBookingDate(inquiry.preferredDate)} />
                {inquiry.alternativeDate && (
                  <Row label="Alternative" value={formatBookingDate(inquiry.alternativeDate)} />
                )}
                {inquiry.preferredStartTime && (
                  <Row icon={Clock} label="Time" value={formatBookingTime(inquiry.preferredStartTime)} />
                )}
                {inquiry.estimatedDurationMinutes && (
                  <Row label="Duration" value={`${inquiry.estimatedDurationMinutes} min`} />
                )}
                {inquiry.cityName && <Row icon={MapPin} label="City" value={inquiry.cityName} />}
                {inquiry.venueType && <Row label="Venue" value={inquiry.venueType} />}
                {inquiry.attendeeCount !== null && (
                  <Row icon={Users} label="Attendees" value={inquiry.attendeeCount} />
                )}
                <Row label="Travel" value={inquiry.travelRequired ? "Required" : "Not required"} />
                <Row label="Priority" value={inquiry.priority} />
                <Row label="Received" value={new Date(inquiry.createdAtUtc).toLocaleString()} />
              </div>

              {inquiry.clientMessage && (
                <div className="mt-5 pt-5 border-t border-white/[0.06]">
                  <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">
                    Client message
                  </p>
                  <p className="font-body text-sm text-soft-ivory/85 mt-2 leading-relaxed whitespace-pre-line">
                    {inquiry.clientMessage}
                  </p>
                </div>
              )}

              {inquiry.additionalRequirements && (
                <div className="mt-4">
                  <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">
                    Additional requirements
                  </p>
                  <p className="font-body text-sm text-soft-ivory/85 mt-2 leading-relaxed whitespace-pre-line">
                    {inquiry.additionalRequirements}
                  </p>
                </div>
              )}
            </Card>

            {/* Internal notes — staff only. Labelled as such so nobody pastes something
                here believing the client will read it. */}
            <Card className="p-5">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-muted-grey" strokeWidth={1.3} />
                <Eyebrow>Internal Notes</Eyebrow>
              </div>
              <p className="font-body text-[0.6rem] text-muted-grey mt-2">
                Staff only. Never shown to the client or the talent.
              </p>

              <form onSubmit={submitNote} className="mt-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Add a note…"
                  className="w-full bg-transparent border border-white/10 rounded-sm p-2.5 font-body text-[0.8rem] text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition resize-none"
                />
                <LustraButton
                  type="submit"
                  size="sm"
                  className="mt-2"
                  disabled={note.trim().length === 0 || addNote.isPending}
                >
                  {addNote.isPending ? "Adding…" : "Add note"}
                </LustraButton>
              </form>

              {inquiry.internalNotes.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  {inquiry.internalNotes.map((entry) => (
                    <div key={entry.id} className="pb-2.5 border-b border-white/[0.04] last:border-0">
                      <p className="font-body text-[0.8rem] text-soft-ivory/85 whitespace-pre-line">
                        {entry.note}
                      </p>
                      <p className="text-[0.55rem] text-muted-grey mt-1">
                        {new Date(entry.createdAtUtc).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right rail: actions and history */}
          <div className="space-y-5">
            <Card className="p-5">
              <Eyebrow>Actions</Eyebrow>

              <Link
                to={`/management-conversations/${inquiry.conversationId}`}
                className="flex items-center justify-between gap-2 mt-3 p-3 rounded-sm border border-rose-gold/25 hover:border-rose-gold/50 transition"
              >
                <span className="inline-flex items-center gap-2 text-[0.6rem] tracking-luxe uppercase text-rose-gold/90">
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.3} /> Conversation
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-grey" strokeWidth={1.2} />
              </Link>

              <form onSubmit={submitStatus} className="mt-4 space-y-2">
                <label className="block">
                  <span className="text-[0.55rem] tracking-luxe uppercase text-muted-grey">
                    Change status
                  </span>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="w-full mt-1 bg-transparent border border-white/10 rounded-sm px-2.5 py-2 font-body text-[0.75rem] text-ivory focus:outline-none focus:border-rose-gold/50 transition"
                  >
                    <option value="" className="bg-noir">
                      Select…
                    </option>
                    {INQUIRY_STATUSES.filter((s) => s !== inquiry.status).map((s) => (
                      <option key={s} value={s} className="bg-noir">
                        {presentStatus(s).label}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Reason (optional)"
                  maxLength={500}
                  className="w-full bg-transparent border border-white/10 rounded-sm px-2.5 py-2 font-body text-[0.75rem] text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
                />
                <LustraButton
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={!nextStatus || changeStatus.isPending}
                >
                  {changeStatus.isPending ? "Updating…" : "Apply"}
                </LustraButton>
              </form>

              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                {isClosed ? (
                  <button
                    onClick={() => reopenInquiry.mutate(id)}
                    disabled={reopenInquiry.isPending}
                    className="w-full py-2.5 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-ivory hover:border-white/25 transition disabled:opacity-50"
                  >
                    Reopen inquiry
                  </button>
                ) : (
                  <button
                    onClick={() => closeInquiry.mutate({ inquiryId: id, reason: null })}
                    disabled={closeInquiry.isPending}
                    className="w-full py-2.5 rounded-sm border border-white/10 text-muted-grey font-body text-[0.6rem] tracking-luxe uppercase hover:text-error hover:border-error/30 transition disabled:opacity-50"
                  >
                    Close inquiry
                  </button>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <Eyebrow>History</Eyebrow>
              {inquiry.history.length === 0 ? (
                <p className="font-body text-sm text-muted-grey mt-3">No changes yet.</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {inquiry.history.map((entry, index) => (
                    <div key={`${entry.toStatus}-${entry.createdAtUtc}-${index}`} className="flex gap-2.5">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-gold/60 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-body text-[0.8rem] text-soft-ivory/85">
                          {presentStatus(entry.toStatus).label}
                        </p>
                        {entry.reason && (
                          <p className="font-body text-[0.65rem] text-muted-grey mt-0.5">
                            {entry.reason}
                          </p>
                        )}
                        <p className="text-[0.55rem] text-muted-grey/70 mt-0.5">
                          {new Date(entry.createdAtUtc).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex justify-between gap-3 items-baseline">
      <span className="text-[0.55rem] tracking-luxe uppercase text-muted-grey shrink-0 inline-flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" strokeWidth={1.2} />}
        {label}
      </span>
      <span className="text-[0.8rem] font-body text-soft-ivory/85 text-right">{value}</span>
    </div>
  );
}
