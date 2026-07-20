import { api } from "@/api/client";
import { adoptAuthResult, endSession } from "@/api/authTokenCoordinator";
import { hasUsableRefreshToken } from "@/api/tokenStorage";
import type { AuthResultDto, AuthUserDto, SessionDto } from "@/services/dto/authDto";

/**
 * Typed auth service — the only module that knows the shape of the .NET auth
 * routes (`/api/v1/auth/*`, `/api/v1/talent-activation/*`).
 *
 * Every call that establishes a session funnels through `adoptAuthResult` so
 * token storage and the refresh coordinator stay the single owners of tokens;
 * no page or hook ever touches a token directly.
 */

/** Mirrors the backend `RegisterClientRequest` exactly. */
export interface RegisterClientInput {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  /** Adults-only platform: the backend rejects a false declaration. */
  isAdultDeclaration: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function registerClient(input: RegisterClientInput): Promise<AuthResultDto> {
  const result = await api.post<AuthResultDto>("/auth/client/register", input, { anonymous: true });
  adoptAuthResult(result);
  return result;
}

export async function login(input: LoginInput): Promise<AuthResultDto> {
  const result = await api.post<AuthResultDto>("/auth/login", input, { anonymous: true });
  adoptAuthResult(result);
  return result;
}

/** Current user. Throws 401 when the session is gone — callers treat that as guest. */
export function getCurrentUser(signal?: AbortSignal): Promise<AuthUserDto> {
  return api.get<AuthUserDto>("/auth/me", { signal });
}

/** True when a stored refresh token could restore a session on this device. */
export function canRestoreSession(): boolean {
  return hasUsableRefreshToken();
}

/**
 * Revoke the current server session, then drop local state. The local session
 * is cleared even when the server call fails, so the user is never left
 * apparently-signed-in on this device.
 */
export async function logout(): Promise<void> {
  try {
    await api.post<void>("/auth/logout");
  } catch {
    /* best-effort revocation */
  } finally {
    endSession("logout");
  }
}

/** Revoke every session for this user across all devices. */
export async function logoutAll(): Promise<void> {
  try {
    await api.post<void>("/auth/logout-all");
  } catch {
    /* best-effort revocation */
  } finally {
    endSession("logout");
  }
}

export function forgotPassword(email: string): Promise<void> {
  return api.post<void>("/auth/forgot-password", { email }, { anonymous: true });
}

export function resetPassword(input: { email: string; token: string; newPassword: string }): Promise<void> {
  return api.post<void>("/auth/reset-password", input, { anonymous: true });
}

export function verifyEmail(input: { userId: string; token: string }): Promise<void> {
  return api.post<void>("/auth/verify-email", input, { anonymous: true });
}

export function resendVerification(email: string): Promise<void> {
  return api.post<void>("/auth/resend-verification", { email }, { anonymous: true });
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return api.post<void>("/auth/change-password", input);
}

export function listSessions(signal?: AbortSignal): Promise<SessionDto[]> {
  return api.get<SessionDto[]>("/auth/sessions", { signal });
}

export function revokeSession(sessionId: string): Promise<void> {
  return api.delete<void>(`/auth/sessions/${sessionId}`);
}

// --- Talent invitation activation (no public talent self-registration) -------

/** Mirrors the backend `ActivationTokenInfoDto`. */
export interface ActivationTokenInfoDto {
  isValid: boolean;
  email: string | null;
  expiresAtUtc: string | null;
}

export function validateActivationToken(token: string): Promise<ActivationTokenInfoDto> {
  return api.post<ActivationTokenInfoDto>("/talent-activation/validate", { token }, { anonymous: true });
}

/** Mirrors the backend `ActivateTalentRequest` exactly. */
export interface ActivateTalentInput {
  token: string;
  password: string;
  displayName?: string | null;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  isAdultDeclaration: boolean;
}

export async function activateTalent(input: ActivateTalentInput): Promise<AuthResultDto> {
  const result = await api.post<AuthResultDto>("/talent-activation/activate", input, { anonymous: true });
  adoptAuthResult(result);
  return result;
}
