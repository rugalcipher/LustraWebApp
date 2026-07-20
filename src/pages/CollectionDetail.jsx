import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, X, Users } from "lucide-react";
import { Eyebrow, EmptyState } from "@/components/lustra/Primitives";
import { toast } from "@/components/ui/use-toast";
import { resolveMediaUrl } from "@/services/mediaUrl";
import { toUserMessage } from "@/api/problemDetails";
import { isApiError } from "@/api/problemDetails";
import { useCollection, useRemoveTalentFromCollection } from "@/features/client/hooks";

/**
 * One curated collection and the talent in it.
 *
 * A collection that isn't the caller's returns 404 from the API — deliberately
 * indistinguishable from one that doesn't exist — and renders as "not found" here.
 */
export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: collection, isPending, isError, error } = useCollection(id);
  const removeTalent = useRemoveTalentFromCollection();

  const remove = async (talentProfileId, displayName) => {
    try {
      await removeTalent.mutateAsync({ collectionId: id, talentProfileId });
      toast({ title: `${displayName} removed`, description: "They remain in your saved list." });
    } catch (err) {
      toast({ title: "Couldn't remove", description: toUserMessage(err), variant: "destructive" });
    }
  };

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
          {notFound ? "Collection not found" : "Something went wrong"}
        </p>
        <p className="mt-3 font-body text-sm text-muted-grey">
          {notFound ? "It may have been removed." : toUserMessage(error)}
        </p>
        <Link
          to="/app/saved"
          className="mt-6 inline-block text-[0.65rem] tracking-luxe uppercase text-rose-gold border border-rose-gold/40 px-5 py-2.5 rounded-sm hover:bg-rose-gold/5 transition"
        >
          Back to Saved
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[0.6rem] tracking-luxe uppercase text-muted-grey hover:text-ivory transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.4} /> Back
      </button>

      <div className="mt-4">
        <Eyebrow>Curated Selection</Eyebrow>
        <h1 className="font-heading font-light text-3xl text-ivory mt-1">{collection.name}</h1>
        {collection.description && (
          <p className="mt-2 font-body text-sm text-muted-grey leading-relaxed">{collection.description}</p>
        )}
      </div>

      {collection.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="This collection is empty"
          body="Add talent to it from a profile or from your saved list."
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
        <div className="grid grid-cols-2 gap-3 mt-6">
          {collection.items.map((item) => (
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
                onClick={() => remove(item.talentProfileId, item.displayName)}
                disabled={removeTalent.isPending}
                aria-label={`Remove ${item.displayName} from ${collection.name}`}
                className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full bg-noir/60 backdrop-blur-sm border border-white/10 hover:border-rose-gold/50 transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5 text-ivory/80" strokeWidth={1.4} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
