import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2, FolderPlus, Trash2, Pencil, ChevronRight, X } from "lucide-react";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { resolveMediaUrl } from "@/services/mediaUrl";
import { toUserMessage } from "@/api/problemDetails";
import {
  useSavedTalent,
  useCollections,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
} from "@/features/client/hooks";
import { useSaveTalentAction } from "@/features/client/useSaveTalentAction";

/**
 * The client's private selection: saved talent and curated collections.
 *
 * Both are server-owned. This is a private list, not a shopping basket — the language
 * is deliberately "saved", "collections", "curated selection".
 */
export default function Saved() {
  const [tab, setTab] = useState("saved");

  return (
    <div className="px-5 pt-6 pb-8">
      <Eyebrow>Your Selection</Eyebrow>
      <h1 className="font-heading font-light text-3xl text-ivory mt-1">Saved</h1>

      <div className="flex gap-1.5 mt-5">
        {[
          { id: "saved", label: "Saved" },
          { id: "collections", label: "Collections" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "text-[0.6rem] tracking-wide-luxe uppercase px-3 py-1.5 rounded-full border transition font-body",
              tab === t.id
                ? "border-rose-gold/50 text-rose-gold bg-rose-gold/5"
                : "border-white/[0.08] text-muted-grey hover:text-soft-ivory"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "saved" ? <SavedList /> : <CollectionsList />}
    </div>
  );
}

function SavedList() {
  const { data: saved, isPending, isError, error } = useSavedTalent();
  const { toggle, isPending: isToggling } = useSaveTalentAction();

  if (isPending) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    return <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>;
  }

  if (saved.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nothing saved yet"
        body="Tap the heart on any profile to keep it in your private selection."
        action={
          <Link
            to="/app/discover"
            className="text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
          >
            Discover Talent
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-5">
      {saved.map((item) => (
        <div
          key={item.talentProfileId}
          className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-card-black"
        >
          <Link to={`/talent/${item.slug}`} className="block">
            <div className="aspect-[3/4] overflow-hidden">
              {item.coverImageUrl ? (
                <img
                  src={resolveMediaUrl(item.coverImageUrl) ?? ""}
                  alt={item.displayName}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-elevated-black" />
              )}
            </div>
            <div className="p-3">
              <p className="font-heading text-lg text-ivory leading-none">{item.displayName}</p>
              {item.headline && (
                <p className="font-body text-[0.6rem] tracking-wide-luxe uppercase text-muted-grey mt-1.5 line-clamp-1">
                  {item.headline}
                </p>
              )}
            </div>
          </Link>
          <button
            onClick={() => toggle({ talentProfileId: item.talentProfileId, slug: item.slug })}
            disabled={isToggling}
            aria-label={`Remove ${item.displayName} from saved`}
            className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full bg-noir/60 backdrop-blur-sm border border-white/10 hover:border-rose-gold/50 transition disabled:opacity-50"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-gold text-rose-gold" strokeWidth={1.2} />
          </button>
        </div>
      ))}
    </div>
  );
}

function CollectionsList() {
  const { data: collections, isPending, isError, error } = useCollections();
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const submitNew = async (e) => {
    e.preventDefault();
    try {
      await createCollection.mutateAsync({ name: name.trim(), description: null, sortOrder: 0 });
      setName("");
      setCreating(false);
    } catch (err) {
      toast({ title: "Couldn't create", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const submitRename = async (collection) => {
    try {
      await updateCollection.mutateAsync({
        collectionId: collection.id,
        input: { name: editName.trim(), description: collection.description, sortOrder: collection.sortOrder },
      });
      setEditingId(null);
    } catch (err) {
      toast({ title: "Couldn't rename", description: toUserMessage(err), variant: "destructive" });
    }
  };

  const remove = async (collection) => {
    try {
      await deleteCollection.mutateAsync(collection.id);
      toast({
        title: "Collection removed",
        description: "The talent stay in your saved list.",
      });
    } catch (err) {
      toast({ title: "Couldn't remove", description: toUserMessage(err), variant: "destructive" });
    }
  };

  if (isPending) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      </div>
    );
  }

  if (isError) {
    return <p className="py-20 text-center font-body text-sm text-muted-grey">{toUserMessage(error)}</p>;
  }

  return (
    <div className="mt-5">
      {creating ? (
        <form onSubmit={submitNew} className="mb-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={80}
            placeholder="Collection name"
            className="flex-1 bg-card-black border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm font-body text-ivory placeholder:text-muted-grey/50 focus:outline-none focus:border-rose-gold/40"
          />
          <button
            type="submit"
            disabled={!name.trim() || createCollection.isPending}
            className="px-4 rounded-sm bg-rose-gold text-noir font-body text-[0.6rem] tracking-luxe uppercase disabled:opacity-50"
          >
            {createCollection.isPending ? "…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            aria-label="Cancel"
            className="px-2 text-muted-grey hover:text-ivory"
          >
            <X className="w-4 h-4" strokeWidth={1.4} />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mb-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-sm border border-rose-gold/30 text-rose-gold font-body text-[0.6rem] tracking-luxe uppercase hover:bg-rose-gold/10 transition"
        >
          <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.4} /> New collection
        </button>
      )}

      {collections.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No collections yet"
          body="Group saved talent into curated selections — an evening in Cape Town, a brand campaign, a private celebration."
        />
      ) : (
        <div className="space-y-2.5">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-card-black/70 border border-white/[0.06] rounded-lg overflow-hidden"
            >
              {editingId === collection.id ? (
                <div className="p-3 flex gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    maxLength={80}
                    className="flex-1 bg-deep-black/60 border border-white/[0.08] rounded-sm px-3 py-2 text-sm font-body text-ivory focus:outline-none focus:border-rose-gold/40"
                  />
                  <button
                    onClick={() => submitRename(collection)}
                    disabled={!editName.trim() || updateCollection.isPending}
                    className="px-3 rounded-sm bg-rose-gold text-noir font-body text-[0.55rem] tracking-luxe uppercase disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                    className="px-2 text-muted-grey hover:text-ivory"
                  >
                    <X className="w-4 h-4" strokeWidth={1.4} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <Link
                    to={`/app/collections/${collection.id}`}
                    className="flex-1 min-w-0 flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-base text-ivory leading-none truncate">
                        {collection.name}
                      </p>
                      <p className="text-[0.55rem] tracking-luxe uppercase text-muted-grey mt-1.5">
                        {collection.itemCount} {collection.itemCount === 1 ? "profile" : "profiles"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-grey shrink-0" strokeWidth={1.2} />
                  </Link>
                  <div className="flex items-center gap-1 pr-3">
                    <button
                      onClick={() => {
                        setEditingId(collection.id);
                        setEditName(collection.name);
                      }}
                      aria-label={`Rename ${collection.name}`}
                      className="p-2 text-muted-grey hover:text-rose-gold transition"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.2} />
                    </button>
                    <button
                      onClick={() => remove(collection)}
                      disabled={deleteCollection.isPending}
                      aria-label={`Delete ${collection.name}`}
                      className="p-2 text-muted-grey hover:text-error transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.2} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
