import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrincipal } from "@/auth/PrincipalContext";
import { useSavedTalentIds, useToggleSavedTalent } from "@/features/client/hooks";
import { rememberIntendedAction } from "@/features/auth/intendedAction";

/**
 * The canonical "save this talent" action, used by every card, the action bar and the
 * profile page.
 *
 * The saved list is server-owned: this hook reads it from the user-scoped saved-ids
 * query and mutates through the API. Nothing is persisted client-side, so an account
 * switch cannot show the previous client's saves.
 *
 * A GUEST who taps save has the intent parked and is sent to sign in; on return the
 * action is completed against the API.
 */
export interface SaveTalentAction {
  /** True when the talent is in the client's saved list (false for guests). */
  isSaved: (talentProfileId: string | null | undefined) => boolean;
  /** Toggle save. Guests are routed to sign-in with the intent preserved. */
  toggle: (talent: { id?: string; slug?: string; talentProfileId?: string }) => void;
  isPending: boolean;
}

export function useSaveTalentAction(): SaveTalentAction {
  const { principal } = usePrincipal();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSaved } = useSavedTalentIds();
  const toggleMutation = useToggleSavedTalent();

  const toggle = useCallback<SaveTalentAction["toggle"]>(
    (talent) => {
      // The API keys saves on the talent PROFILE ID, while routing uses the slug — both
      // are carried on the view model, so accept either shape.
      const talentProfileId = talent?.talentProfileId ?? talent?.id;
      const slug = talent?.slug ?? talent?.id;
      if (!talentProfileId) return;

      if (!principal.isAuthenticated) {
        rememberIntendedAction({
          type: "save",
          talentSlug: String(slug),
          returnTo: `${location.pathname}${location.search}`,
        });
        navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
        return;
      }

      toggleMutation.mutate({
        talentProfileId: String(talentProfileId),
        save: !isSaved(String(talentProfileId)),
      });
    },
    [principal.isAuthenticated, navigate, location.pathname, location.search, isSaved, toggleMutation]
  );

  return { isSaved, toggle, isPending: toggleMutation.isPending };
}
