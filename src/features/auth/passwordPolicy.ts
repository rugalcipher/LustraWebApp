import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import {
  getPasswordPolicy,
  CONSERVATIVE_PASSWORD_POLICY,
  type PasswordPolicyDto,
} from "@/services/passwordPolicyService";

/**
 * The password policy, fetched once and shared.
 *
 * Every `PasswordField` on a page asks for this, and a registration form may
 * hold two of them. The policy changes about as often as the application is
 * redeployed, so it is cached for the life of the tab: `staleTime: Infinity`
 * means no refetch on mount, on focus or on reconnect, and React Query
 * deduplicates the concurrent first request from several fields into one.
 * Typing cannot trigger a fetch — the query key has no input in it.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

/**
 * Builds the checklist from the server's answer.
 *
 * Order is fixed (length, case, digit, symbol, variety) so the list does not
 * reshuffle between renders; a rule the server does not require is simply
 * absent rather than shown as permanently satisfied.
 */
export function rulesFromPolicy(policy: PasswordPolicyDto): PasswordRule[] {
  const rules: PasswordRule[] = [
    {
      id: "length",
      label: `At least ${policy.minimumLength} characters`,
      test: (v) => v.length >= policy.minimumLength,
    },
  ];
  if (policy.requireUppercase)
    rules.push({ id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) });
  if (policy.requireLowercase)
    rules.push({ id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) });
  if (policy.requireDigit)
    rules.push({ id: "digit", label: "One number", test: (v) => /[0-9]/.test(v) });
  if (policy.requireNonAlphanumeric)
    rules.push({ id: "symbol", label: "One symbol", test: (v) => /[^A-Za-z0-9]/.test(v) });
  if (policy.requiredUniqueChars > 1)
    rules.push({
      id: "unique",
      label: `At least ${policy.requiredUniqueChars} different characters`,
      test: (v) => new Set(v).size >= policy.requiredUniqueChars,
    });
  return rules;
}

/**
 * 0–4, derived from the policy in force rather than a fixed rule count.
 *
 * A password that meets every requirement scores 3; the top band is reserved
 * for comfortably exceeding the minimum length, so a bare pass never reads as
 * "Excellent".
 */
export function strengthFor(value: string, rules: PasswordRule[]): number {
  if (!value) return 0;
  const met = rules.filter((r) => r.test(value)).length;
  if (met < rules.length) return Math.min(met, 3);
  const longest = rules.find((r) => r.id === "length");
  return longest && value.length >= 14 ? 4 : 3;
}

/**
 * @returns the effective policy, the rules derived from it, and whether the
 * figures are the server's or the conservative fallback. Callers surface
 * `isFallback` so a person is told the requirements could not be confirmed
 * rather than being quietly shown weaker ones.
 */
export function usePasswordPolicy() {
  const query = useQuery({
    queryKey: queryKeys.reference.passwordPolicy(),
    queryFn: ({ signal }) => getPasswordPolicy(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const isFallback = query.isError || (!query.data && !query.isPending);
  const policy = query.data ?? CONSERVATIVE_PASSWORD_POLICY;

  return {
    policy,
    rules: rulesFromPolicy(policy),
    isLoading: query.isPending,
    // True when the displayed requirements are the conservative assumption, not
    // the server's. Never the other way round: a failed fetch must not relax.
    isFallback,
  };
}
