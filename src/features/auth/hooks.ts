import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import * as authService from "@/services/authService";
import { queryKeys } from "@/api/queryKeys";
import { toFormErrors, toUserMessage, isApiError } from "@/api/problemDetails";
import { useAuthStore } from "@/stores/authStore";
import { usePrincipal } from "@/auth/PrincipalContext";
import { consumeIntendedAction, routeForIntendedAction } from "@/features/auth/intendedAction";
import { authenticatedHomePath, normalizeRole } from "@/domain/roles";
import type { Role } from "@/domain/roles";
import type { AuthResultDto, SessionDto } from "@/services/dto/authDto";

/**
 * Auth feature hooks. Pages consume these; they never call the service or the
 * API client directly, and they never touch tokens.
 */

/**
 * Map a server ProblemDetails onto react-hook-form fields, falling back to a
 * form-level error so no failure is ever swallowed or shown as a bare
 * "Something went wrong" when the API said something more useful.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): void {
  const fieldErrors = toFormErrors(error);
  let applied = false;
  for (const [field, message] of Object.entries(fieldErrors)) {
    setError(field as Path<T>, { type: "server", message });
    applied = true;
  }
  if (!applied) {
    setError("root" as Path<T>, { type: "server", message: toUserMessage(error) });
  }
}

/**
 * Where to send the user after a successful sign-in, in priority order:
 *
 *  1. A parked INTENDED ACTION (guest tapped Inquire / Save / Add-to-collection) —
 *     this returns them to the same talent and story position, which a bare route
 *     could not do.
 *  2. The route the guard bounced them from.
 *  3. The home for their role.
 *
 * The intent is consumed here, so a refresh of the landing page cannot re-fire it.
 */
export function usePostAuthRedirect(): (result: AuthResultDto) => void {
  const navigate = useNavigate();
  const location = useLocation();
  const consumeIntendedRoute = useAuthStore((s) => s.consumeIntendedRoute);

  return useCallback(
    (result: AuthResultDto) => {
      const pendingAction = consumeIntendedAction();
      if (pendingAction) {
        navigate(routeForIntendedAction(pendingAction), {
          replace: true,
          state: { resumedAction: pendingAction },
        });
        return;
      }

      const fromState = (location.state as { from?: string } | null)?.from;
      const intended = consumeIntendedRoute() ?? fromState ?? null;
      if (intended && intended !== "/login" && intended !== "/register") {
        navigate(intended, { replace: true });
        return;
      }
      // The same helper the authenticated shells' logo uses, so "where signing in
      // puts you" and "where home goes" cannot drift apart.
      const roles = (result.user.roles ?? [])
        .map((r) => normalizeRole(r))
        .filter((r): r is Role => r !== null);

      navigate(authenticatedHomePath(roles), { replace: true });
    },
    [navigate, location.state, consumeIntendedRoute]
  );
}

export function useLogin() {
  const queryClient = useQueryClient();
  const redirect = usePostAuthRedirect();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.auth.me(), result.user);
      redirect(result);
    },
  });
}

/**
 * Register a client. The API signs the user in immediately (it returns tokens)
 * but the account is UNVERIFIED until they follow the emailed link, and
 * verification is required to submit an inquiry. So this hook deliberately does
 * NOT auto-redirect — the page shows the "verify your email" step and hands
 * control to {@link usePostAuthRedirect} when the user continues.
 */
export function useRegisterClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.registerClient,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.auth.me(), result.user);
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => authService.forgotPassword(email) });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authService.resetPassword });
}

export function useResendVerification() {
  return useMutation({ mutationFn: (email: string) => authService.resendVerification(email) });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.verifyEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: authService.changePassword });
}

/** Active sessions for the signed-in user. */
export function useSessions() {
  const { principal } = usePrincipal();
  return useQuery<SessionDto[]>({
    queryKey: queryKeys.auth.sessions(),
    queryFn: ({ signal }) => authService.listSessions(signal),
    enabled: principal.isAuthenticated,
    staleTime: 30_000,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => authService.revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() }),
  });
}

/** Human-readable message for any auth failure, safe to render. */
export function authErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (isApiError(error) && error.kind === "canceled") return null;
  return toUserMessage(error);
}
