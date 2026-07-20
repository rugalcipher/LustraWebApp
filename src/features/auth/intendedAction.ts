import { z } from "zod";

/**
 * Guest → authentication → resume.
 *
 * When a signed-out visitor taps Inquire / Save / Add-to-collection, the intent is
 * parked here, the visitor signs in, and the app resumes exactly where they were —
 * same talent, same story slide, same discovery position.
 *
 * Design rules this module enforces:
 *  - VERSIONED. A shape change invalidates old intents instead of mis-restoring them.
 *  - SHORT-LIVED. Intents expire; a stale one is discarded, never replayed hours later.
 *  - CONSUMED ONCE. Reading for restoration removes it, so a refresh cannot re-fire
 *    a mutation (a double-save or a duplicate inquiry).
 *  - VALIDATED. Restored data is parsed, never trusted. It came from storage the user
 *    can edit.
 *  - NON-AUTHORITATIVE. It carries no user id, no role and no permission. Those always
 *    come from `/auth/me` after authentication.
 *  - NO PERSONAL CONTENT. Inquiry notes are never parked here or put in a query string;
 *    only the talent context needed to reopen the form.
 *
 * sessionStorage (not localStorage) so an intent cannot outlive the browser tab.
 */

const STORAGE_KEY = "lustra.intendedAction";
const VERSION = 1 as const;

/** Intents expire after 30 minutes; a sign-in detour is a matter of minutes. */
export const INTENT_TTL_MS = 30 * 60_000;

const intendedActionSchema = z.object({
  v: z.literal(VERSION),
  type: z.enum(["inquire", "save", "add-to-collection"]),
  /** Public talent slug — never an internal id. */
  talentSlug: z.string().min(1).max(200),
  /** Where to send the visitor back to. */
  returnTo: z
    .string()
    .min(1)
    .max(500)
    // Only same-origin paths: an absolute URL here would be an open-redirect.
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), "returnTo must be a relative path"),
  /** Immersive discovery position, so the story resumes on the same slide. */
  talentIndex: z.number().int().min(0).max(10_000).optional(),
  slideIndex: z.number().int().min(0).max(50).optional(),
  createdAtMs: z.number().int().positive(),
});

export type IntendedActionType = z.infer<typeof intendedActionSchema>["type"];
export type IntendedAction = z.infer<typeof intendedActionSchema>;

export interface IntendedActionInput {
  type: IntendedActionType;
  talentSlug: string;
  returnTo: string;
  talentIndex?: number;
  slideIndex?: number;
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Park an intent before routing the guest to sign-in. Replaces any previous intent. */
export function rememberIntendedAction(input: IntendedActionInput, now: number = Date.now()): void {
  const candidate: IntendedAction = { v: VERSION, ...input, createdAtMs: now };
  const parsed = intendedActionSchema.safeParse(candidate);
  if (!parsed.success) return; // Never store something we could not restore.

  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
  } catch {
    /* private mode / quota: the visitor simply lands on their role home instead */
  }
}

/**
 * Read the pending intent WITHOUT consuming it — for rendering a hint such as
 * "continue your inquiry". Returns null when absent, malformed, or expired.
 */
export function peekIntendedAction(now: number = Date.now()): IntendedAction | null {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return null;

  let parsed;
  try {
    parsed = intendedActionSchema.safeParse(JSON.parse(raw));
  } catch {
    clearIntendedAction();
    return null;
  }

  if (!parsed.success) {
    // Wrong version or tampered shape — discard rather than half-restore.
    clearIntendedAction();
    return null;
  }

  if (now - parsed.data.createdAtMs > INTENT_TTL_MS) {
    clearIntendedAction();
    return null;
  }

  return parsed.data;
}

/**
 * Read and REMOVE the pending intent. Use this at the moment of restoration so a
 * page refresh cannot replay the action.
 */
export function consumeIntendedAction(now: number = Date.now()): IntendedAction | null {
  const action = peekIntendedAction(now);
  clearIntendedAction();
  return action;
}

/** Drop any pending intent — on cancellation, on completion, and on logout. */
export function clearIntendedAction(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The route that resumes an intent. `save` and `add-to-collection` return to where the
 * visitor was so the action can be completed in place; `inquire` opens the form.
 */
export function routeForIntendedAction(action: IntendedAction): string {
  return action.type === "inquire"
    ? `/app/inquire/${encodeURIComponent(action.talentSlug)}`
    : action.returnTo;
}
