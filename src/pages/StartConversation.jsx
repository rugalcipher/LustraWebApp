import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import LustraButton from "@/components/lustra/Button";
import { toUserMessage } from "@/api/problemDetails";
import { useTalentProfile } from "@/features/discovery/hooks";
import { useStartConversation } from "@/features/conversations/hooks";

/**
 * The bridge between "Message" on a talent profile and the conversation itself.
 *
 * It exists as a ROUTE rather than an inline handler because the same journey has to work
 * for a signed-in client and for a guest returning from login — and after login the app
 * can only resume by navigating to a URL. Parking the talent slug and landing here means
 * both paths run identical code.
 *
 * It resolves the talent's profile id from the public slug, asks the server to open or
 * reuse the management conversation, and replaces itself in history so Back returns to the
 * profile rather than to this spinner.
 */
export default function StartConversation() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: talent, isPending: loadingTalent, isError: talentError, error: talentErr } =
    useTalentProfile(slug);
  const startConversation = useStartConversation();
  const [failure, setFailure] = useState(null);

  // The start-or-find call must fire once. Without this guard a re-render (or React 18's
  // double-invoked effects in development) would issue a second request.
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !talent?.talentProfileId) return;
    started.current = true;

    startConversation
      .mutateAsync(talent.talentProfileId)
      .then(({ conversationId }) => {
        navigate(`/app/messages/${conversationId}`, {
          replace: true,
          // The draft opener is passed as navigation state, NOT sent. The client sees it
          // in the composer and decides whether to send it.
          state: { draft: `Hi, I'm interested in ${talent.name}.`, talentSlug: talent.slug },
        });
      })
      .catch((error) => setFailure(error));
  }, [talent, startConversation, navigate]);

  if (talentError || failure) {
    const error = failure ?? talentErr;
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-heading text-2xl text-ivory">Couldn't open the conversation</p>
        <p className="mt-3 font-body text-sm text-muted-grey">{toUserMessage(error)}</p>
        <div className="flex gap-2 justify-center mt-6">
          <LustraButton as={Link} to="/app/discover" variant="outline" size="sm">
            Back to Discover
          </LustraButton>
          {slug && (
            <LustraButton as={Link} to={`/app/talent/${slug}`} size="sm">
              Back to profile
            </LustraButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 flex flex-col items-center gap-3">
      <Loader2 className="w-5 h-5 text-rose-gold animate-spin" strokeWidth={1.4} />
      <p className="font-body text-[0.7rem] tracking-wide-luxe uppercase text-muted-grey">
        {loadingTalent ? "Opening…" : "Connecting you to Lustra management…"}
      </p>
    </div>
  );
}
