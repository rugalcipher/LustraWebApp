import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as proposalService from "@/services/proposalService";
import { isAwaitingResponse } from "@/services/proposalService";

/**
 * Client proposal hooks.
 *
 * Responding to a proposal changes the inquiry, may create a booking and posts to the
 * conversation, so every mutation invalidates those namespaces too — otherwise the client
 * would be looking at a stale inquiry status right after acting on it.
 */

const PROPOSAL_STALE_TIME = 30_000;

export function useMyProposals() {
  const { principal } = usePrincipal();
  return useQuery({
    queryKey: queryKeys.proposals.mine(),
    queryFn: ({ signal }) => proposalService.listProposals(signal),
    enabled: principal.isAuthenticated,
    staleTime: PROPOSAL_STALE_TIME,
  });
}

export function useProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.proposals.detail(proposalId ?? ""),
    queryFn: ({ signal }) => proposalService.getProposal(proposalId!, signal),
    enabled: Boolean(proposalId),
    staleTime: PROPOSAL_STALE_TIME,
  });
}

/** The proposals raised against one inquiry, newest first. */
export function useProposalsForInquiry(inquiryId: string | undefined) {
  const { data, isPending, isError } = useMyProposals();

  const proposals = useMemo(
    () => (data ?? []).filter((p) => p.inquiryId === inquiryId),
    [data, inquiryId]
  );

  return {
    proposals,
    /** The one still awaiting a response, if any — what the inquiry page should surface. */
    open: proposals.find((p) => isAwaitingResponse(p.status)) ?? null,
    isPending,
    isError,
  };
}

/**
 * Invalidate everything a proposal response can move.
 *
 * Accepting a proposal advances the inquiry, posts a system message to the conversation
 * and — once management confirms — produces a booking. Refetching all four keeps the UI
 * honest instead of showing a stale "awaiting your response" card.
 */
function useProposalResponseInvalidation() {
  const queryClient = useQueryClient();
  return (proposalId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(proposalId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.proposals.mine() });
    queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() });
  };
}

/**
 * Accept a proposal.
 *
 * `retry: false` on every response mutation: these are one-shot state transitions with no
 * idempotency key, and a silent library retry against an already-transitioned proposal
 * would surface a confusing 422 the client never caused.
 */
export function useAcceptProposal() {
  const invalidate = useProposalResponseInvalidation();
  return useMutation({
    mutationFn: (proposalId: string) => proposalService.acceptProposal(proposalId),
    retry: false,
    onSuccess: (_r, proposalId) => invalidate(proposalId),
  });
}

export function useDeclineProposal() {
  const invalidate = useProposalResponseInvalidation();
  return useMutation({
    mutationFn: ({ proposalId, reason }: { proposalId: string; reason?: string | null }) =>
      proposalService.declineProposal(proposalId, reason),
    retry: false,
    onSuccess: (_r, { proposalId }) => invalidate(proposalId),
  });
}

export function useRequestProposalChange() {
  const invalidate = useProposalResponseInvalidation();
  return useMutation({
    mutationFn: ({ proposalId, message }: { proposalId: string; message: string }) =>
      proposalService.requestProposalChange(proposalId, message),
    retry: false,
    onSuccess: (_r, { proposalId }) => invalidate(proposalId),
  });
}

/** Count of proposals still awaiting the client's response, for badges. */
export function useOpenProposalCount(): number {
  const { data } = useMyProposals();
  return useMemo(() => (data ?? []).filter((p) => isAwaitingResponse(p.status)).length, [data]);
}
