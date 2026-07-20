import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrincipal } from "@/auth/PrincipalContext";
import { rememberIntendedAction } from "@/features/auth/intendedAction";
import { useDiscoveryUiStore } from "@/stores/discoveryUiStore";

/**
 * The canonical "Inquire" action.
 *
 * A signed-in client goes straight to the form. A GUEST has the intent parked — talent,
 * discovery position and story slide — is sent to sign in, and is returned to the same
 * talent's inquiry form afterwards, without having to find them again.
 *
 * Personal inquiry content is never parked; only the context needed to reopen the form.
 */
export function useInquireAction(): (talent: { slug?: string; id?: string } | null | undefined) => void {
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
          type: "inquire",
          talentSlug: String(slug),
          returnTo,
          talentIndex: currentIndex,
          slideIndex,
        });
        navigate("/login", { state: { from: returnTo } });
        return;
      }

      navigate(`/app/inquire/${encodeURIComponent(String(slug))}`, {
        state: { source: returnTo, slideIndex },
      });
    },
    [principal.isAuthenticated, navigate, location.pathname, location.search, currentIndex, slideIndex]
  );
}
