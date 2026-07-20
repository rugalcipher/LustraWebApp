import React, { useRef, useState } from "react";
import {
  Upload, Loader2, Crown, Globe, Star, Trash2, Send, ArrowUp, ArrowDown, Lock,
} from "lucide-react";
import InternalHeader from "@/components/lustra/InternalHeader";
import { Card } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { toUserMessage } from "@/api/problemDetails";
import { resolveMediaUrl } from "@/services/mediaUrl";
import { presentModerationStatus, presentVisibility, formatFileSize } from "@/services/talentMediaService";
import {
  useMyMedia, useUploadMedia, useDeleteMedia, useSubmitMedia, useSetCoverMedia,
  useReorderMedia, useUpdateMediaCaption,
} from "@/features/talent/hooks";

/**
 * The talent's OWN media library.
 *
 * Nothing here is public until Lustra approves it. Every tile states its real moderation
 * status, and an unapproved item is never styled as though clients can see it. VISIBILITY
 * (Public / VIP-only) is set by management and is shown read-only — a talent cannot grant
 * themselves VIP placement.
 */
export default function TalentMedia() {
  const { data: media, isPending, isError, error } = useMyMedia();
  const upload = useUploadMedia();
  const reorder = useReorderMedia();
  const fileInput = useRef(null);

  const pick = () => fileInput.current?.click();

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-selecting the same file still fires a change event.
    event.target.value = "";
    if (!file) return;

    const mediaType = file.type.startsWith("video/") ? "IntroductionVideo" : "Image";
    try {
      await upload.mutateAsync({ file, mediaType, caption: null });
      toast({
        title: "Uploaded",
        description: "Submit it for review when you're ready — it isn't public yet.",
      });
    } catch (err) {
      toast({ title: "Upload failed", description: toUserMessage(err), variant: "destructive" });
    }
  };

  /** Swap a tile with its neighbour and persist the whole order the server expects. */
  const move = (index, direction) => {
    const items = [...(media ?? [])];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    reorder.mutate(items.map((item, i) => ({ id: item.id, sortOrder: i + 1 })));
  };

  return (
    <div className="lustra-marble min-h-screen pb-16">
      <InternalHeader
        eyebrow="Talent Portal"
        title="Your Media"
        subtitle="Upload photography, then submit it to Lustra for review."
      />

      <div className="max-w-luxe mx-auto px-5 py-6 space-y-5">
        <Card className="p-5 border-dashed border-white/15">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full border border-rose-gold/40 flex items-center justify-center">
              {upload.isPending ? (
                <Loader2 className="w-4 h-4 text-rose-gold animate-spin" strokeWidth={1.2} />
              ) : (
                <Upload className="w-4 h-4 text-rose-gold" strokeWidth={1.2} />
              )}
            </div>
            <p className="font-heading text-lg text-ivory">
              {upload.isPending ? "Uploading…" : "Upload media"}
            </p>
            <p className="font-body text-[0.65rem] text-muted-grey max-w-sm leading-relaxed">
              Photographs and introduction videos. Uploads are private to you and Lustra
              until you submit them and they are approved.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              onChange={onFile}
              className="hidden"
            />
            <button
              onClick={pick}
              disabled={upload.isPending}
              className="mt-2 inline-flex items-center gap-2 text-[0.6rem] tracking-luxe uppercase text-rose-gold/90 hover:text-light-rose-gold font-body disabled:opacity-50"
            >
              Browse files
            </button>
          </div>
        </Card>

        {isPending ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
          </div>
        ) : isError ? (
          <p className="py-20 text-center font-body text-sm text-muted-grey">
            {toUserMessage(error)}
          </p>
        ) : media.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-heading text-xl text-ivory">No media yet</p>
            <p className="font-body text-sm text-muted-grey mt-2">
              Your photography appears here once you upload it.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {media.map((item, index) => (
              <MediaTile
                key={item.id}
                item={item}
                onMoveUp={index > 0 ? () => move(index, -1) : null}
                onMoveDown={index < media.length - 1 ? () => move(index, 1) : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaTile({ item, onMoveUp, onMoveDown }) {
  const submitMedia = useSubmitMedia();
  const deleteMedia = useDeleteMedia();
  const setCover = useSetCoverMedia();
  const updateCaption = useUpdateMediaCaption();
  const [caption, setCaption] = useState(item.caption ?? "");
  const [editingCaption, setEditingCaption] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = presentModerationStatus(item.moderationStatus);
  const visibility = presentVisibility(item.visibility);
  const url = resolveMediaUrl(item.readUrl);

  const act = async (fn, success) => {
    try {
      await fn();
      toast({ title: success });
    } catch (err) {
      toast({ title: "Couldn't do that", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const saveCaption = async () => {
    setEditingCaption(false);
    if ((item.caption ?? "") === caption.trim()) return;
    await act(
      () => updateCaption.mutateAsync({ mediaId: item.id, caption: caption.trim() || null }),
      "Caption saved"
    );
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-[3/4] bg-elevated-black">
        {url ? (
          <img src={url} alt={item.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          // No readable URL means the item is not yet retrievable (still uploading, or
          // archived). Say so rather than rendering a broken image.
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-grey/60">
            <Lock className="w-5 h-5" strokeWidth={1.2} />
            <span className="text-[0.55rem] tracking-wide-luxe uppercase">Not available</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
          <span
            className={cn(
              "text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full bg-noir/75 backdrop-blur-sm",
              status.isPublic
                ? "text-success border-success/40"
                : item.moderationStatus === "Rejected"
                  ? "text-error border-error/40"
                  : "text-warning border-warning/40"
            )}
          >
            {status.label}
          </span>
          {item.isCover && (
            <span className="inline-flex items-center gap-1 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border border-rose-gold/40 text-rose-gold rounded-full bg-noir/75 backdrop-blur-sm">
              <Star className="w-2.5 h-2.5 fill-rose-gold" strokeWidth={1.6} /> Cover
            </span>
          )}
        </div>

        {/* Visibility is management-owned, so it is a badge, not a control. */}
        <span
          className={cn(
            "absolute top-2 right-2 inline-flex items-center gap-1 text-[0.5rem] tracking-wide-luxe uppercase px-2 py-0.5 border rounded-full bg-noir/75 backdrop-blur-sm",
            visibility.isVip ? "text-rose-gold border-rose-gold/40" : "text-soft-ivory/70 border-white/15"
          )}
        >
          {visibility.isVip ? (
            <><Crown className="w-2.5 h-2.5" strokeWidth={1.6} /> {visibility.label}</>
          ) : (
            <><Globe className="w-2.5 h-2.5" strokeWidth={1.6} /> {visibility.label}</>
          )}
        </span>

        <div className="absolute bottom-2 right-2 flex gap-1">
          {onMoveUp && (
            <IconButton onClick={onMoveUp} label="Move earlier">
              <ArrowUp className="w-3 h-3" strokeWidth={1.4} />
            </IconButton>
          )}
          {onMoveDown && (
            <IconButton onClick={onMoveDown} label="Move later">
              <ArrowDown className="w-3 h-3" strokeWidth={1.4} />
            </IconButton>
          )}
        </div>
      </div>

      <div className="p-3.5 space-y-2.5">
        <p className="font-body text-[0.6rem] text-muted-grey leading-relaxed">{status.detail}</p>

        {item.rejectionReason && (
          <p className="font-body text-[0.65rem] text-error/90 leading-relaxed">
            {item.rejectionReason}
          </p>
        )}

        {editingCaption ? (
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={saveCaption}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            autoFocus
            maxLength={200}
            placeholder="Add a caption"
            className="w-full bg-transparent border-b border-white/10 pb-1.5 font-body text-sm text-ivory placeholder:text-muted-grey/60 focus:outline-none focus:border-rose-gold/50 transition"
          />
        ) : (
          <button
            onClick={() => setEditingCaption(true)}
            className="w-full text-left font-body text-sm text-soft-ivory/80 hover:text-ivory transition"
          >
            {item.caption || <span className="text-muted-grey/60">Add a caption</span>}
          </button>
        )}

        <p className="text-[0.55rem] tracking-wide-luxe uppercase text-muted-grey/70">
          {formatFileSize(item.sizeBytes)}
          {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {status.canSubmit && (
            <TileAction
              onClick={() => act(() => submitMedia.mutateAsync(item.id), "Submitted for review")}
              disabled={submitMedia.isPending}
              tone="primary"
            >
              <Send className="w-3 h-3" strokeWidth={1.3} /> Submit
            </TileAction>
          )}
          {/* Only an approved item can be a meaningful cover — setting an unapproved one
              would put a photo clients cannot see at the top of the profile. */}
          {status.isPublic && !item.isCover && (
            <TileAction
              onClick={() => act(() => setCover.mutateAsync(item.id), "Cover updated")}
              disabled={setCover.isPending}
            >
              <Star className="w-3 h-3" strokeWidth={1.3} /> Set cover
            </TileAction>
          )}
          {confirmDelete ? (
            <>
              <TileAction
                onClick={() => act(() => deleteMedia.mutateAsync(item.id), "Removed")}
                disabled={deleteMedia.isPending}
                tone="danger"
              >
                Confirm
              </TileAction>
              <TileAction onClick={() => setConfirmDelete(false)}>Keep</TileAction>
            </>
          ) : (
            <TileAction onClick={() => setConfirmDelete(true)} tone="danger">
              <Trash2 className="w-3 h-3" strokeWidth={1.3} /> Remove
            </TileAction>
          )}
        </div>
      </div>
    </Card>
  );
}

function IconButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-6 h-6 rounded-sm bg-noir/75 backdrop-blur-sm border border-white/15 text-soft-ivory/80 flex items-center justify-center hover:text-rose-gold hover:border-rose-gold/40 transition"
    >
      {children}
    </button>
  );
}

function TileAction({ onClick, disabled, tone, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm border text-[0.55rem] tracking-luxe uppercase font-body transition disabled:opacity-50",
        tone === "primary"
          ? "border-rose-gold/40 text-rose-gold hover:bg-rose-gold/10"
          : tone === "danger"
            ? "border-white/10 text-muted-grey hover:text-error hover:border-error/30"
            : "border-white/10 text-muted-grey hover:text-soft-ivory hover:border-white/25"
      )}
    >
      {children}
    </button>
  );
}
