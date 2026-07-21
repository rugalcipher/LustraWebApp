import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import * as service from "@/services/clientAppointmentService";
import type { ClientAppointmentScope } from "@/services/clientAppointmentService";

/**
 * The client's own appointments.
 *
 * User-scoped: these keys sit under a namespace that is dropped on sign-out, so
 * one person's appointments can never be read back from cache by the next.
 */

const STALE_TIME = 30_000;

export function useClientAppointments(
  filters: { scope?: ClientAppointmentScope; page?: number } = {}
) {
  return useQuery({
    queryKey: queryKeys.clientAppointments.list(filters),
    queryFn: ({ signal }) => service.listClientAppointments(filters, signal),
    staleTime: STALE_TIME,
  });
}

export function useClientAppointment(appointmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clientAppointments.detail(appointmentId ?? ""),
    queryFn: ({ signal }) => service.getClientAppointment(appointmentId!, signal),
    enabled: Boolean(appointmentId),
    staleTime: STALE_TIME,
    // A 404 here is the deliberate "you may not see this" answer, not a blip.
    // Retrying it wastes a round trip and delays the message the client needs.
    retry: false,
  });
}
