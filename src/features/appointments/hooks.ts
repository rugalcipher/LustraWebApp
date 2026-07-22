import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as appointmentService from "@/services/appointmentService";
import type { CreateAppointmentInput } from "@/services/appointmentService";

/**
 * Internal appointment hooks (management).
 *
 * An appointment is Lustra's operational record. The client now has a read-only
 * view of the ones reserved for them (`features/clientAppointments`), built on a
 * separate service and a separate DTO — it is not this record with fields
 * removed, and the two must not be merged. Clients still create, reschedule and
 * cancel nothing: that is arranged by talking to management.
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
  filters: {
    status?: string | null;
    talentProfileId?: string | null;
    isVisibleToClient?: boolean | null;
    page?: number;
  } = {}
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

/** A client's saved addresses, for a booker to choose one to snapshot onto an appointment. */
export function useClientAddressesForBooking(clientUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["management", "bookings", "client-addresses", clientUserId ?? ""],
    queryFn: ({ signal }) => appointmentService.listClientAddressesForBooking(clientUserId!, signal),
    enabled: Boolean(clientUserId),
    staleTime: 30_000,
  });
}

/** Updates or clears an appointment's structured address snapshot (management edit). */
export function useUpdateAppointmentAddress(conversationId?: string | null) {
  const invalidate = useAppointmentInvalidation();
  return useMutation({
    mutationFn: ({
      bookingId,
      address,
    }: {
      bookingId: string;
      address: import("@/domain/address").StructuredAddressInput | null;
    }) => appointmentService.updateAppointmentAddress(bookingId, address),
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

// ---- client visibility ------------------------------------------------------

/**
 * Who changed an appointment's client visibility, when and why.
 *
 * Kept out of the detail query so a reviewer who never opens the panel does not
 * pay for it, and so a failure to load the history cannot blank the appointment.
 */
export function useAppointmentVisibilityHistory(bookingId: string | undefined, enabled = true) {
  const canView = usePermission("Bookings.View");
  return useQuery({
    queryKey: queryKeys.management.bookingVisibilityHistory(bookingId ?? ""),
    queryFn: ({ signal }) =>
      appointmentService.getAppointmentVisibilityHistory(bookingId!, signal),
    enabled: canView && enabled && Boolean(bookingId),
    staleTime: APPOINTMENT_STALE_TIME,
  });
}

/**
 * Shows or hides an appointment from its client.
 *
 * Invalidates the visibility history alongside the usual set: the panel that
 * records the change must not still be showing the state before it.
 */
export function useSetAppointmentClientVisibility(bookingId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = useAppointmentInvalidation();
  return useMutation({
    mutationFn: ({ visible, internalReason }: { visible: boolean; internalReason?: string | null }) =>
      visible
        ? appointmentService.showAppointmentToClient(bookingId!, internalReason)
        : appointmentService.hideAppointmentFromClient(bookingId!, internalReason),
    retry: false,
    onSuccess: () => {
      invalidate(bookingId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.management.bookingVisibilityHistory(bookingId ?? ""),
      });
    },
  });
}

/** Moves an appointment to a different talent, recording why. */
export function useReassignAppointmentTalent(bookingId: string | undefined) {
  const invalidate = useAppointmentInvalidation();
  return useMutation({
    mutationFn: ({ talentProfileId, reason }: { talentProfileId: string; reason: string }) =>
      appointmentService.reassignAppointmentTalent(bookingId!, talentProfileId, reason),
    retry: false,
    onSuccess: () => invalidate(bookingId),
  });
}

/**
 * Searches talent for an appointment picker.
 *
 * Gated on **`Bookings.Manage`**, not `Talent.View`. Choosing who to schedule and
 * administering the talent roster are separate privileges, and the backend enforces the
 * split — `GET /management/bookings/talent-options` needs only the booking permission.
 */
export function useBookingTalentOptions(
  filters: appointmentService.BookingTalentOptionSearch = {},
  enabled = true
) {
  const canManage = usePermission("Bookings.Manage");
  return useQuery({
    queryKey: queryKeys.management.bookingTalentOptions(filters),
    queryFn: ({ signal }) => appointmentService.searchBookingTalentOptions(filters, signal),
    enabled: canManage && enabled,
    staleTime: APPOINTMENT_STALE_TIME,
  });
}

/**
 * Resolves one talent for a picker regardless of their state.
 *
 * For an EXISTING appointment whose assigned talent has since been archived: the search
 * list correctly hides them, but the record they are already on must still show a name.
 */
export function useBookingTalentOption(talentProfileId: string | null | undefined) {
  const canManage = usePermission("Bookings.Manage");
  return useQuery({
    queryKey: queryKeys.management.bookingTalentOption(talentProfileId ?? ""),
    queryFn: ({ signal }) =>
      appointmentService.getBookingTalentOption(talentProfileId!, signal),
    enabled: canManage && Boolean(talentProfileId),
    staleTime: APPOINTMENT_STALE_TIME,
  });
}
