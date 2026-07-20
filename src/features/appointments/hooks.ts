import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as appointmentService from "@/services/appointmentService";
import type { CreateAppointmentInput } from "@/services/appointmentService";

/**
 * Internal appointment hooks (management).
 *
 * There is no client equivalent and there must not be one: an appointment is Lustra's
 * operational record, and the client arranges everything by talking to management.
 */

const APPOINTMENT_STALE_TIME = 20_000;

function usePermission(permission: string): boolean {
  const { principal } = usePrincipal();
  return principal.isAuthenticated && principal.permissions.includes(permission);
}

/**
 * Everything an appointment change can invalidate.
 *
 * Creating, rescheduling, cancelling or advancing an appointment moves it on the
 * calendar, in the appointment lists, and in the conversation that produced it — so all
 * three are refreshed together rather than leaving one showing a stale time.
 */
function useAppointmentInvalidation() {
  const queryClient = useQueryClient();
  return (bookingId?: string, conversationId?: string | null) => {
    if (bookingId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.booking(bookingId) });
    }
    queryClient.invalidateQueries({ queryKey: ["management", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["management", "calendar"] });
    if (conversationId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.management.conversationAppointment(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.management.conversation(conversationId),
      });
    }
    // The inbox row shows whether a thread has produced an appointment.
    queryClient.invalidateQueries({ queryKey: ["management", "conversations"] });
    // The assigned talent's own schedule changed too.
    queryClient.invalidateQueries({ queryKey: ["talent-portal", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useAppointments(
  filters: { status?: string | null; talentProfileId?: string | null; page?: number } = {}
) {
  const enabled = usePermission("Bookings.View");
  return useQuery({
    queryKey: queryKeys.management.bookings(filters),
    queryFn: ({ signal }) => appointmentService.listAppointments(filters, signal),
    enabled,
    staleTime: APPOINTMENT_STALE_TIME,
  });
}

export function useAppointment(bookingId: string | undefined) {
  const enabled = usePermission("Bookings.View") && Boolean(bookingId);
  return useQuery({
    queryKey: queryKeys.management.booking(bookingId ?? ""),
    queryFn: ({ signal }) => appointmentService.getAppointment(bookingId!, signal),
    enabled,
    staleTime: APPOINTMENT_STALE_TIME,
  });
}

export function useAppointmentCalendar(
  filters: { from?: string | null; to?: string | null; talentProfileId?: string | null } = {}
) {
  const enabled = usePermission("Bookings.View");
  return useQuery({
    queryKey: queryKeys.management.calendar(filters),
    queryFn: ({ signal }) => appointmentService.listCalendar(filters, signal),
    enabled,
    staleTime: APPOINTMENT_STALE_TIME,
  });
}

export function useAppointmentConflicts() {
  const enabled = usePermission("Bookings.View");
  return useQuery({
    queryKey: queryKeys.management.conflicts(),
    queryFn: ({ signal }) => appointmentService.listConflicts(signal),
    enabled,
    staleTime: APPOINTMENT_STALE_TIME,
  });
}

/**
 * Records an appointment.
 *
 * The caller supplies the idempotency key, minted once when the form opened, so a retry
 * after a timeout replays the original instead of double-booking the talent.
 */
export function useCreateAppointment() {
  const invalidate = useAppointmentInvalidation();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateAppointmentInput; idempotencyKey: string }) =>
      appointmentService.createAppointment(input, idempotencyKey),
    retry: false,
    onSuccess: (result, { input }) => invalidate(result.bookingId, input.conversationId),
  });
}

export function useRescheduleAppointment(conversationId?: string | null) {
  const invalidate = useAppointmentInvalidation();
  return useMutation({
    mutationFn: ({
      bookingId,
      ...input
    }: {
      bookingId: string;
      confirmedDate?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      durationMinutes?: number | null;
    }) => appointmentService.rescheduleAppointment(bookingId, input),
    retry: false,
    onSuccess: (_r, { bookingId }) => invalidate(bookingId, conversationId),
  });
}

export function useCancelAppointment(conversationId?: string | null) {
  const invalidate = useAppointmentInvalidation();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      appointmentService.cancelAppointment(bookingId, reason),
    retry: false,
    onSuccess: (_r, { bookingId }) => invalidate(bookingId, conversationId),
  });
}

/** Start, complete or mark a no-show. */
export function useAppointmentTransition(conversationId?: string | null) {
  const invalidate = useAppointmentInvalidation();
  return useMutation({
    mutationFn: ({ bookingId, action }: { bookingId: string; action: "start" | "complete" | "no-show" }) => {
      if (action === "start") return appointmentService.startAppointment(bookingId);
      if (action === "complete") return appointmentService.completeAppointment(bookingId);
      return appointmentService.markAppointmentNoShow(bookingId);
    },
    retry: false,
    onSuccess: (_r, { bookingId }) => invalidate(bookingId, conversationId),
  });
}

export function useAddAppointmentNote(bookingId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => appointmentService.addAppointmentNote(bookingId!, note),
    retry: false,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.management.booking(bookingId ?? "") }),
  });
}
