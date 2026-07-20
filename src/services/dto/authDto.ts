/**
 * Auth API DTOs — mirror the .NET `AuthModels.cs` wire shapes exactly. These
 * are the ONLY place the raw API auth shapes live. Visual/domain code consumes
 * the mapped {@link Principal}, never these DTOs directly.
 */

import type { Principal } from "@/auth/principal";
import type { Role } from "@/domain/roles";
import { normalizeRole } from "@/domain/roles";
import { normalizeAccountStatus } from "@/domain/account";
import { normalizeMembership } from "@/domain/entitlements";

export interface AuthTokensDto {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  tokenType: string;
}

export interface MembershipDto {
  tier?: string;
  vipActivatedAtUtc?: string | null;
  vipExpiresAtUtc?: string | null;
}

export interface AuthUserDto {
  id: string;
  email: string;
  displayName: string;
  emailConfirmed: boolean;
  accountStatus: string;
  roles: string[];
  permissions: string[];
  /** Not yet in the backend contract — reserved for the membership stage. */
  membership?: MembershipDto | null;
}

export interface AuthResultDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
}

/**
 * Mirrors the backend `SessionDto`. Note it deliberately carries no refresh
 * token or token hash — only descriptive metadata for the sessions screen.
 */
export interface SessionDto {
  id: string;
  deviceDescription: string | null;
  createdByIp: string | null;
  createdAtUtc: string;
  lastSeenAtUtc: string;
  isCurrent: boolean;
}

/**
 * Explicit mapper: AuthUserDto → canonical Principal. Isolates the app from
 * backend naming/shape differences — future DTO changes are absorbed here.
 */
export function mapAuthUserToPrincipal(dto: AuthUserDto): Principal {
  const roles = (dto.roles ?? [])
    .map((r) => normalizeRole(r))
    .filter((r): r is Role => r !== null);
  return {
    userId: dto.id,
    email: dto.email,
    displayName: dto.displayName,
    accountStatus: normalizeAccountStatus(dto.accountStatus),
    roles,
    permissions: dto.permissions ?? [],
    membership: normalizeMembership(dto.membership),
    isAuthenticated: true,
    isLoading: false,
    source: "real",
  };
}
