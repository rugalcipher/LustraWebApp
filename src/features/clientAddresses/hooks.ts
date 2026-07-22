import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as service from "@/services/clientAddressService";
import type { SaveClientAddressInput } from "@/services/clientAddressService";

/**
 * Client saved-address hooks. One query key; every mutation invalidates it so the list stays in
 * step. Non-idempotent mutations do not retry.
 */
const KEY = ["client", "addresses"] as const;

export function useClientAddresses() {
  return useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => service.listClientAddresses(signal),
    staleTime: 30_000,
  });
}

function useAddressMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateClientAddress() {
  return useAddressMutation((input: SaveClientAddressInput) => service.createClientAddress(input));
}

export function useUpdateClientAddress() {
  return useAddressMutation(({ id, input }: { id: string; input: SaveClientAddressInput }) =>
    service.updateClientAddress(id, input)
  );
}

export function useDeleteClientAddress() {
  return useAddressMutation((id: string) => service.deleteClientAddress(id));
}

export function useSetDefaultClientAddress() {
  return useAddressMutation((id: string) => service.setDefaultClientAddress(id));
}
