import { api } from "@/api/client";

/**
 * The password requirements the backend actually enforces.
 *
 * Read from the live `IdentityOptions` server-side — the same object the
 * validator uses — so the checklist a person reads while typing cannot drift
 * from the rule that rejects them. The frontend deliberately keeps no second
 * copy of these numbers: a duplicated policy is one that will eventually
 * disagree with itself, and the user is who finds out.
 *
 * Anonymous, because everyone who needs it is signing up, activating an
 * invitation or resetting a password, and none of them hold a token.
 */

/** Mirrors `PasswordPolicyDto`, using ASP.NET Identity's own field names. */
export interface PasswordPolicyDto {
  minimumLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireNonAlphanumeric: boolean;
  requiredUniqueChars: number;
}

/**
 * What the UI assumes when the policy cannot be fetched.
 *
 * Deliberately the STRICTEST plausible configuration, not the loosest. If the
 * request fails, showing a person a shorter or laxer requirement than the server
 * enforces means they compose a password, believe it satisfies the rules, and
 * are rejected — and worse, it teaches the UI to under-report a security
 * control. Over-stating is a mild annoyance; under-stating is a broken promise.
 *
 * The server remains the only authority on acceptance either way.
 */
export const CONSERVATIVE_PASSWORD_POLICY: PasswordPolicyDto = {
  minimumLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireNonAlphanumeric: true,
  requiredUniqueChars: 1,
};

export function getPasswordPolicy(signal?: AbortSignal): Promise<PasswordPolicyDto> {
  return api.get<PasswordPolicyDto>("/public/password-policy", { anonymous: true, signal });
}
