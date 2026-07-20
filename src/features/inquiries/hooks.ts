import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { newIdempotencyKey } from "@/api/idempotency";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as inquiryService from "@/services/inquiryService";
import type { CreateInquiryInput } from "@/services/inquiryService";

/**
 * Client inquiry hooks.
 *
 * The idempotency contract is the important part: ONE key per logical submission,
 * reused across every retry of that submission, minted afresh only when the client
 * genuinely starts a new one.
 */

const INQUIRY_STALE_TIME = 30_000;

/**
 * A stable idempotency key for one inquiry form.
 *
 * Created once when the form mounts and held in a ref, so a double-click, a React Query
 * retry, a browser retry or a network hiccup all reuse it and the server replays the
 * original inquiry instead of creating a duplicate. `reset()` is called only after a
 * confirmed success, when the next submission really is a different intent.
 */
export function useInquiryIdempotencyKey(): { key: () => string; reset: () => void } {
  const keyRef = useRef<string>(newIdempotencyKey());
  return {
    key: useCallback(() => keyRef.current, []),
    reset: useCallback(() => {
      keyRef.current = newIdempotencyKey();
    }, []),
  };
}

/**
 * Submit an inquiry.
 *
 * `retry: false` is deliberate: retrying is the CALLER's decision because a retry must
 * reuse the same idempotency key, and a silent library retry would obscure that.
 * (The server would deduplicate anyway — this keeps the behaviour explicit.)
 */
export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateInquiryInput; idempotencyKey: string }) =>
      inquiryService.createInquiry(input, idempotencyKey),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.all() });
    },
  });
}

export function useMyInquiries() {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.inquiries.mine(),
    queryFn: ({ signal }) => inquiryService.listInquiries(signal),
    enabled: principal.isAuthenticated,
    staleTime: INQUIRY_STALE_TIME,
  });
}

export function useInquiry(inquiryId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inquiries.detail(inquiryId ?? ""),
    queryFn: ({ signal }) => inquiryService.getInquiry(inquiryId!, signal),
    enabled: Boolean(inquiryId),
    staleTime: INQUIRY_STALE_TIME,
  });
}

export function useCancelInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inquiryId, reason }: { inquiryId: string; reason?: string | null }) =>
      inquiryService.cancelInquiry(inquiryId, reason),
    onSuccess: (_r, { inquiryId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.detail(inquiryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.mine() });
    },
  });
}
