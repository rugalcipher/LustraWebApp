/**
 * Account lifecycle status — mirrors the backend `AccountStatus` enum
 * (`Lustra.Domain/Users/Enums/AccountStatus.cs`). Kept as a canonical union so
 * account status is never a free-form string scattered across the app.
 */
export type AccountStatus = "PendingActivation" | "Active" | "Suspended" | "Deactivated";

export const ACCOUNT_STATUS = {
  PendingActivation: "PendingActivation",
  Active: "Active",
  Suspended: "Suspended",
  Deactivated: "Deactivated",
} as const satisfies Record<AccountStatus, AccountStatus>;

const ALL: readonly string[] = Object.values(ACCOUNT_STATUS);

/** Normalize a backend/raw status string to the canonical union (defaults to Active). */
export function normalizeAccountStatus(raw: string | null | undefined): AccountStatus {
  if (raw && ALL.includes(raw)) return raw as AccountStatus;
  return "Active";
}

/** Whether the account may use the application (not suspended/deactivated). */
export function isActiveAccount(status: AccountStatus): boolean {
  return status === ACCOUNT_STATUS.Active;
}
