import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as service from "@/services/commercialTermsService";
import type { SetCommercialTermsInput } from "@/services/commercialTermsService";

const key = (profileId: string) => ["talent-admin", "commercial-terms", profileId];

/** A talent's commercial terms, gated on TalentCommercialTerms.View. */
export function useCommercialTerms(profileId: string | undefined) {
  const { hasPermission } = usePrincipal();
  return useQuery({
    queryKey: key(profileId ?? ""),
    queryFn: ({ signal }) => service.getCommercialTerms(profileId!, signal),
    enabled: Boolean(profileId) && hasPermission("TalentCommercialTerms.View"),
    staleTime: 20_000,
  });
}

export function useCanManageCommercialTerms(): boolean {
  const { hasPermission } = usePrincipal();
  return hasPermission("TalentCommercialTerms.Manage");
}

export function useSetCommercialTerms(profileId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key(profileId ?? "") });
    // The public starting price and the record change too.
    queryClient.invalidateQueries({ queryKey: ["talent-admin"] });
    queryClient.invalidateQueries({ queryKey: ["discovery"] });
  };
  return {
    set: useMutation({
      mutationFn: (input: SetCommercialTermsInput) => service.setCommercialTerms(profileId!, input),
      retry: false,
      onSuccess: invalidate,
    }),
    resetPayout: useMutation({
      mutationFn: () => service.resetPayoutToGradeDefault(profileId!),
      retry: false,
      onSuccess: invalidate,
    }),
  };
}
