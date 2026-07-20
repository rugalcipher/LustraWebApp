import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrincipal } from "@/auth/PrincipalContext";
import { rememberIntendedAction } from "@/features/auth/intendedAction";
import { useDiscoveryUiStore } from "@/stores/discoveryUiStore";

/**
 * The canonical MESSAGE action — the primary thing a client does on Lustra.
 *
 * A signed-in client goes straight to their conversation with management about this
 * talent. A GUEST has the intent parked (talent, discovery position, story slide), signs
 * in, and is returned to the same talent's conversation without having to find them again.
 *
 * This replaced `useInquireAction`, which sent the client to a structured inquiry form.
 * Lustra is concierge-led: the client messages management and everything is arranged in
 * conversation, so there is no form to fill in.
 *
 * No message content is ever parked — only the context needed to reopen the conversation.
 */
export function useMessageAction(): (talent: { slug?: string; id?: string } | null | undefined) => void {
  const { principal } = usePrincipal();
  const navigate = useNavigate();
  const location = useLocation();
  const currentIndex = useDiscoveryUiStore((s) => s.currentIndex);
  const slideIndex = useDiscoveryUiStore((s) => s.slideIndex);

  return useCallback(
    (talent) => {
      const slug = talent?.slug ?? talent?.id;
      if (!slug) return;

      const returnTo = `${location.pathname}${location.search}`;

      if (!principal.isAuthenticated) {
        rememberIntendedAction({
          type: "message",
          talentSlug: String(slug),
          returnTo,
          talentIndex: currentIndex,
          slideIndex,
        });
        navigate("/login", { state: { from: returnTo } });
        return;
      }

      navigate(`/app/message/${encodeURIComponent(String(slug))}`, {
        state: { source: returnTo, slideIndex },
      });
    },
    [principal.isAuthenticated, navigate, location.pathname, location.search, currentIndex, slideIndex]
  );
}
