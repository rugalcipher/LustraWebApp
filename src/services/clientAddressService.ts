import { api } from "@/api/client";
import type { StructuredAddress, StructuredAddressInput } from "@/domain/address";

/**
 * A client's own saved addresses — `/api/v1/client/addresses`. Every call is scoped to the
 * signed-in client by the server; another client's id is answered as not-found.
 */

/** Mirrors the backend `ClientAddressDto`. */
export interface ClientAddressDto {
  id: string;
  label: string;
  isDefault: boolean;
  address: StructuredAddress;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/** Mirrors the backend `SaveClientAddressInput`. */
export interface SaveClientAddressInput {
  label: string;
  isDefault: boolean;
  address: StructuredAddressInput;
}

export function listClientAddresses(signal?: AbortSignal): Promise<ClientAddressDto[]> {
  return api.get<ClientAddressDto[]>("/client/addresses", { signal });
}

export function createClientAddress(input: SaveClientAddressInput): Promise<ClientAddressDto> {
  return api.post<ClientAddressDto>("/client/addresses", input);
}

export function updateClientAddress(id: string, input: SaveClientAddressInput): Promise<ClientAddressDto> {
  return api.put<ClientAddressDto>(`/client/addresses/${id}`, input);
}

export function deleteClientAddress(id: string): Promise<void> {
  return api.delete<void>(`/client/addresses/${id}`);
}

export function setDefaultClientAddress(id: string): Promise<void> {
  return api.post<void>(`/client/addresses/${id}/set-default`, undefined);
}
