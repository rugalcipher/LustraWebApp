import React, { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The confirmation step in front of every consequential review action.
 *
 * Requesting changes, rejecting, approving and publishing all reach the
 * applicant or the public and none of them can be quietly undone, so each is
 * gated behind an explicit confirmation. Where the backend requires a reason the
 * dialog will not submit without one — the reason travels to the applicant, so
 * an empty or lazy one is a real harm, not a validation nicety.
 */
export default function ConfirmAction({
  open,
  title,
  description,
  confirmLabel,
  tone = "default",
  reason,
  reasonLabel,
  reasonHint,
  onConfirm,
  onCancel,
  busy = false,
  error,
  children,
}) {
  const [text, setText] = useState("");
  const firstField = useRef(null);

  useEffect(() => {
    if (open) {
      setText("");
      // Focus lands on the field the reviewer must fill, not on the confirm button.
      const id = window.setTimeout(() => firstField.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  if (!open) return null;

  const needsReason = Boolean(reason);
  const ready = !needsReason || text.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-noir/80 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-md border border-white/10 bg-deep-black p-5 space-y-4"
      >
        <h2 className="font-heading text-xl text-ivory">{title}</h2>
        <p className="font-body text-body text-soft-ivory/80">{description}</p>

        {children}

        {needsReason && (
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-reason"
              className="block font-body text-meta tracking-wide-luxe uppercase text-muted-grey"
            >
              {reasonLabel} <span className="text-rose-gold">*</span>
            </label>
            <textarea
              id="confirm-reason"
              ref={firstField}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-card-black/60 border border-white/10 rounded-sm px-3 py-2.5 font-body text-body text-ivory focus:outline-none focus:border-rose-gold/50"
            />
            {reasonHint && <p className="font-body text-meta text-muted-grey">{reasonHint}</p>}
          </div>
        )}

        {error && (
          <p className="flex items-start gap-2 font-body text-meta text-destructive" role="alert">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-sm border border-white/10 font-body text-meta tracking-luxe uppercase text-soft-ivory/80 hover:border-white/25 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(text.trim())}
            disabled={busy || !ready}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-sm border font-body text-meta tracking-luxe uppercase disabled:opacity-40",
              tone === "destructive"
                ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                : "border-rose-gold/50 text-rose-gold hover:bg-rose-gold/10"
            )}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
