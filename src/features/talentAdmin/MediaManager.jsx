import React, { useRef, useState } from "react";
import {
  Loader2, AlertTriangle, ImageOff, Star, Trash2, RotateCcw, History, Eye, EyeOff,
  Crown, Lock, Check, X, MessageSquareWarning, Upload,
} from "lucide-react";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { isApiError, toUserMessage } from "@/api/problemDetails";
import ConfirmAction from "@/features/talentApplication/ConfirmAction";
import {
  useTalentMedia, useMediaAction, useReorderTalentMedia, useMediaHistory, useUploadTalentMedia,
} from "@/features/talentAdmin/hooks";
import {
  MEDIA_VISIBILITY, MEDIA_MODERATION_STATUS, MEDIA_ADMIN_ERROR_CODES, canBeCover,
} from "@/services/mediaAdminService";

/**
 * Staff control of one talent's photographs.
 *
 * The rules this UI has to keep visible, because collapsing any of them
 * discloses something:
 *
 *  - **Hidden is not deleted.** `Private` withdraws an item from the public
 *    bucket and keeps the original. The wording never says "delete".
 *  - **VIP-only is not public.** It reaches entitled clients and nobody else.
 *  - **Pending and rejected are never public**, and neither can become a cover.
 *  - **Only an approved AND public item can be the cover.** The server refuses
 *    otherwise with `media.cover_not_public`; the button is disabled for the
 *    same reason so the refusal is not a surprise.
 *  - **Hiding the current cover may leave the profile with no cover**, which is
 *    stated before the action rather than discovered after it.
 *  - **Restoring an archived item returns it to pending review**, never straight
 *    back to public — the reason it was withdrawn has not been re-examined.
 *
 * Images are rendered from the `readUrl` the API mints per request. Nothing here
 * constructs a URL from an id, and no URL is logged or persisted.
 *
 * Staff can also ADD a photograph without signing in as the talent: request a
 * slot, PUT the bytes straight to storage, finalize. The bytes never pass
 * through the API. What lands is `PendingReview` and private — uploading is not
 * moderating, and the item still has to be approved and made public here before
 * anyone outside Lustra can see it.
 */

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 12 * 1024 * 1024;

const VISIBILITY_META = {
  [MEDIA_VISIBILITY.public]: {
    label: "Public",
    icon: Eye,
    tone: "border-success/40 text-success bg-success/10",
    help: "Visible to everyone, including guests.",
  },
  [MEDIA_VISIBILITY.private]: {
    label: "Hidden",
    icon: EyeOff,
    tone: "border-white/15 text-muted-grey bg-white/[0.03]",
    help: "Withdrawn from public view. The photograph is kept, not deleted.",
  },
  [MEDIA_VISIBILITY.vipOnly]: {
    label: "VIP only",
    icon: Crown,
    tone: "border-rose-gold/40 text-rose-gold bg-rose-gold/10",
    help: "Reaches entitled VIP clients only. This is not public.",
  },
  [MEDIA_VISIBILITY.managementOnly]: {
    label: "Management only",
    icon: Lock,
    tone: "border-warning/40 text-warning bg-warning/10",
    help: "Never reaches a client or the public.",
  },
};

const STATUS_TONE = {
  [MEDIA_MODERATION_STATUS.approved]: "border-success/40 text-success bg-success/10",
  [MEDIA_MODERATION_STATUS.pending]: "border-rose-gold/40 text-rose-gold bg-rose-gold/10",
  [MEDIA_MODERATION_STATUS.rejected]: "border-destructive/40 text-destructive bg-destructive/10",
  [MEDIA_MODERATION_STATUS.changesRequested]: "border-warning/40 text-warning bg-warning/10",
  [MEDIA_MODERATION_STATUS.archived]: "border-white/15 text-muted-grey bg-white/[0.03]",
};

function Pill({ tone, icon: Icon, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-body text-meta tracking-wide-luxe uppercase whitespace-nowrap",
        tone
      )}
    >
      {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

function HistoryPanel({ mediaId }) {
  const history = useMediaHistory(mediaId);

  if (history.isPending) {
    return (
      <p className="flex items-center gap-2 font-body text-meta text-muted-grey">
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading history…
      </p>
    );
  }
  if (history.isError) {
    return <p className="font-body text-meta text-muted-grey">The history could not be loaded.</p>;
  }
  const entries = history.data ?? [];
  if (entries.length === 0) {
    return <p className="font-body text-meta text-muted-grey">No decisions recorded yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-sm border border-white/10 p-2.5">
          <p className="font-body text-helper text-soft-ivory/90">
            {entry.action}
            {entry.fromStatus && entry.toStatus && ` · ${entry.fromStatus} → ${entry.toStatus}`}
            {entry.fromVisibility && entry.toVisibility &&
              ` · ${entry.fromVisibility} → ${entry.toVisibility}`}
          </p>
          {(entry.reason || entry.note) && (
            <p className="font-body text-meta text-soft-ivory/70 mt-1 whitespace-pre-line">
              {entry.reason || entry.note}
            </p>
          )}
          <p className="font-body text-meta text-muted-grey mt-1">
            {new Date(entry.createdAtUtc).toLocaleString()}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function MediaManager({ profileId }) {
  const media = useTalentMedia(profileId);
  const action = useMediaAction(profileId);
  const reorder = useReorderTalentMedia(profileId);

  const upload = useUploadTalentMedia(profileId);

  const [dialog, setDialog] = useState(null); // { kind, mediaId, title, ... }
  const [actionError, setActionError] = useState("");
  const [openHistory, setOpenHistory] = useState(null);
  const [uploads, setUploads] = useState({});
  const fileInput = useRef(null);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList ?? []);
    for (const file of files) {
      const clientId = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      if (!IMAGE_TYPES.includes(file.type)) {
        setUploads((u) => ({ ...u, [clientId]: { name: file.name, error: "JPG, PNG or WebP only" } }));
        continue;
      }
      if (file.size > MAX_BYTES) {
        setUploads((u) => ({ ...u, [clientId]: { name: file.name, error: "Each image must be 12MB or smaller" } }));
        continue;
      }
      setUploads((u) => ({ ...u, [clientId]: { name: file.name, progress: 0 } }));
      try {
        await upload.mutateAsync({
          file,
          // Minted once per file and reused on retry, so a resubmission replays
          // rather than creating a second row.
          idempotencyKey: clientId,
          onProgress: (fraction) =>
            setUploads((u) => ({ ...u, [clientId]: { ...u[clientId], progress: fraction } })),
        });
        setUploads((u) => {
          const rest = { ...u };
          delete rest[clientId];
          return rest;
        });
      } catch (error) {
        setUploads((u) => ({ ...u, [clientId]: { name: file.name, error: toUserMessage(error) } }));
      }
    }
  }

  const items = media.data ?? [];
  const cover = items.find((m) => m.isCover) ?? null;

  const run = async (payload) => {
    setActionError("");
    try {
      await action.mutateAsync(payload);
      setDialog(null);
    } catch (error) {
      if (isApiError(error) && error.code === MEDIA_ADMIN_ERROR_CODES.coverNotPublic) {
        setActionError(
          "Only an approved, publicly visible photograph can be the profile cover. Approve it " +
            "and set it to Public first."
        );
        return;
      }
      setActionError(toUserMessage(error));
    }
  };

  const move = (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((m, i) => ({ mediaId: m.id, sortOrder: i })));
  };

  if (media.isPending) {
    return (
      <Card className="p-8 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-rose-gold" aria-hidden="true" />
        <span className="font-body text-helper text-muted-grey">Loading photographs…</span>
      </Card>
    );
  }

  if (media.isError) {
    return (
      <Card className="p-6" role="alert">
        <p className="flex items-center gap-2 font-body text-body text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {toUserMessage(media.error)}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-helper text-muted-grey">
          {items.length} {items.length === 1 ? "photograph" : "photographs"}
          {cover ? " · cover set" : " · no cover set"}
        </p>
        {actionError && !dialog && (
          <p className="font-body text-meta text-destructive" role="alert">
            {actionError}
          </p>
        )}
      </div>

      <div
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          uploadFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/15 px-4 py-8 cursor-pointer hover:border-rose-gold/40 transition"
      >
        <Upload className="w-5 h-5 text-rose-gold/80" strokeWidth={1.3} aria-hidden="true" />
        <p className="font-body text-body text-soft-ivory/80">Add photographs — drag &amp; drop, or browse</p>
        <p className="font-body text-meta text-muted-grey">
          Uploaded photographs arrive pending review and private. Approve and make one public
          before it can be a cover or before the profile can be published.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          aria-label="Add photographs"
          onChange={(e) => {
            uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {Object.entries(uploads).map(([id, u]) => (
        <div key={id} className="rounded-sm border border-white/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-body text-body text-soft-ivory/80 truncate">{u.name}</span>
            {u.error ? (
              <span className="font-body text-meta text-error">{u.error}</span>
            ) : (
              <span className="font-body text-meta text-muted-grey tabular-nums">
                {Math.round((u.progress ?? 0) * 100)}%
              </span>
            )}
          </div>
          {!u.error && (
            <div className="mt-2 h-0.5 bg-ivory/10">
              <div
                className="h-full bg-rose-gold origin-left"
                style={{ transform: `scaleX(${u.progress ?? 0})` }}
              />
            </div>
          )}
        </div>
      ))}

      {items.length === 0 && (
        <Card className="p-6">
          <p className="font-body text-body text-soft-ivory/75">
            This talent has no photographs yet. Until at least one is approved and public, the
            profile cannot be published.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item, index) => {
          const visibility = VISIBILITY_META[item.visibility] ?? VISIBILITY_META[MEDIA_VISIBILITY.private];
          const approved = item.moderationStatus === MEDIA_MODERATION_STATUS.approved;
          const archived = item.moderationStatus === MEDIA_MODERATION_STATUS.archived;
          const coverEligible = canBeCover(item);

          return (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="aspect-[3/4] bg-deep-black/70 flex items-center justify-center relative">
                {item.readUrl ? (
                  <img
                    src={item.readUrl}
                    alt={item.originalFileName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-muted-grey">
                    <ImageOff className="w-5 h-5" aria-hidden="true" />
                    <span className="font-body text-meta">No preview</span>
                  </span>
                )}
                {item.isCover && (
                  <span className="absolute top-2 left-2">
                    <Pill tone="border-rose-gold/50 text-rose-gold bg-noir/80" icon={Star}>
                      Cover
                    </Pill>
                  </span>
                )}
              </div>

              <div className="p-3 space-y-2.5 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={STATUS_TONE[item.moderationStatus] ?? "border-white/15 text-muted-grey"}>
                    {item.moderationStatus}
                  </Pill>
                  <Pill tone={visibility.tone} icon={visibility.icon}>
                    {visibility.label}
                  </Pill>
                </div>

                <p className="font-body text-meta text-muted-grey truncate">
                  {item.originalFileName}
                </p>
                <p className="font-body text-meta text-muted-grey">{visibility.help}</p>

                {item.rejectionReason && (
                  <p className="font-body text-meta text-warning">{item.rejectionReason}</p>
                )}

                <div className="flex-1" />

                {/* Moderation */}
                <div className="flex flex-wrap gap-1.5">
                  {!approved && !archived && (
                    <button
                      onClick={() => run({ kind: "approve", mediaId: item.id })}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-success/40 font-body text-meta uppercase text-success hover:bg-success/10"
                    >
                      <Check className="w-3 h-3" aria-hidden="true" /> Approve
                    </button>
                  )}
                  {!archived && (
                    <button
                      onClick={() =>
                        setDialog({
                          kind: "reject",
                          mediaId: item.id,
                          title: "Reject photograph",
                          description:
                            "The photograph is refused and withdrawn from public view. The reason is recorded.",
                          confirmLabel: "Reject",
                          tone: "destructive",
                          reasonLabel: "Reason",
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-destructive/40 font-body text-meta uppercase text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-3 h-3" aria-hidden="true" /> Reject
                    </button>
                  )}
                  {!archived && (
                    <button
                      onClick={() =>
                        setDialog({
                          kind: "request-changes",
                          mediaId: item.id,
                          title: "Request a different photograph",
                          description: "The talent is asked for a replacement and will read your reason.",
                          confirmLabel: "Send request",
                          reasonLabel: "Message to the talent",
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-warning/40 font-body text-meta uppercase text-warning hover:bg-warning/10"
                    >
                      <MessageSquareWarning className="w-3 h-3" aria-hidden="true" /> Changes
                    </button>
                  )}
                </div>

                {/* Visibility — only meaningful once approved */}
                {approved && (
                  <label className="block">
                    <span className="sr-only">Visibility for {item.originalFileName}</span>
                    <select
                      aria-label={`Visibility for ${item.originalFileName}`}
                      value={item.visibility}
                      onChange={(e) =>
                        run({ kind: "visibility", mediaId: item.id, visibility: e.target.value })
                      }
                      className="w-full bg-deep-black/60 border border-white/10 rounded-sm px-2 py-1.5 font-body text-meta text-ivory focus:outline-none focus:border-rose-gold/50"
                    >
                      {Object.entries(VISIBILITY_META).map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => run({ kind: "cover", mediaId: item.id })}
                    disabled={!coverEligible || item.isCover}
                    title={
                      coverEligible
                        ? "Make this the profile cover"
                        : "Only an approved, public photograph can be the cover"
                    }
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-white/12 font-body text-meta uppercase text-soft-ivory/85 hover:border-rose-gold/40 disabled:opacity-40"
                  >
                    <Star className="w-3 h-3" aria-hidden="true" /> Cover
                  </button>
                  <button
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${item.originalFileName} earlier`}
                    className="px-2 py-1 rounded-sm border border-white/12 font-body text-meta text-soft-ivory/85 hover:border-rose-gold/40"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${item.originalFileName} later`}
                    className="px-2 py-1 rounded-sm border border-white/12 font-body text-meta text-soft-ivory/85 hover:border-rose-gold/40"
                  >
                    ↓
                  </button>
                  {archived ? (
                    <button
                      onClick={() => run({ kind: "restore", mediaId: item.id })}
                      title="Returns the photograph to pending review — not straight back to public"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-white/12 font-body text-meta uppercase text-soft-ivory/85 hover:border-rose-gold/40"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" /> Restore
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setDialog({
                          kind: "soft-delete",
                          mediaId: item.id,
                          title: "Archive photograph",
                          description:
                            item.isCover
                              ? "This is the current cover. Archiving it withdraws it from public view and leaves the profile with NO cover until another approved, public photograph is chosen. The photograph itself is kept, not deleted."
                              : "The photograph is withdrawn from public view and archived. It is kept, not deleted, and can be restored to pending review later.",
                          confirmLabel: "Archive",
                          tone: "destructive",
                          noteLabel: "Internal note",
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-white/12 font-body text-meta uppercase text-muted-grey hover:text-error hover:border-error/40"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" /> Archive
                    </button>
                  )}
                  <button
                    onClick={() => setOpenHistory(openHistory === item.id ? null : item.id)}
                    aria-expanded={openHistory === item.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-white/12 font-body text-meta uppercase text-soft-ivory/85 hover:border-rose-gold/40"
                  >
                    <History className="w-3 h-3" aria-hidden="true" /> History
                  </button>
                </div>

                {openHistory === item.id && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <HistoryPanel mediaId={item.id} />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmAction
        open={Boolean(dialog)}
        title={dialog?.title ?? ""}
        description={dialog?.description ?? ""}
        confirmLabel={dialog?.confirmLabel ?? "Confirm"}
        tone={dialog?.tone}
        reason={Boolean(dialog?.reasonLabel)}
        reasonLabel={dialog?.reasonLabel}
        onConfirm={(text) =>
          run(
            dialog?.reasonLabel
              ? { kind: dialog.kind, mediaId: dialog.mediaId, reason: text }
              : { kind: dialog.kind, mediaId: dialog.mediaId, note: text || null }
          )
        }
        onCancel={() => {
          setDialog(null);
          setActionError("");
        }}
        busy={action.isPending}
        error={actionError}
      />
    </div>
  );
}
