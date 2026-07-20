import { create } from "zustand";
import type { AuthUserDto } from "@/services/dto/authDto";

/**
 * Client-side authentication STATE — not server data.
 *
 * Deliberately minimal: hydration status, a snapshot of the authenticated user,
 * and the route the user was trying to reach when they were bounced to sign-in.
 * The canonical current user is always the `GET /auth/me` React Query entry;
 * this snapshot exists so route guards and shells can render synchronously
 * without a query subscription.
 *
 * Tokens are NOT stored here — they live behind `@/api/tokenStorage`.
 */

export type AuthStatus = "idle" | "hydrating" | "authenticated" | "guest";

interface AuthState {
  status: AuthStatus;
  user: AuthUserDto | null;
  /** Path to return to after a successful sign-in. */
  intendedRoute: string | null;

  setHydrating: () => void;
  setAuthenticated: (user: AuthUserDto) => void;
  setGuest: () => void;
  setIntendedRoute: (route: string | null) => void;
  /** Read and clear the intended route in one step. */
  consumeIntendedRoute: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  user: null,
  intendedRoute: null,

  setHydrating: () => set({ status: "hydrating" }),
  setAuthenticated: (user) => set({ status: "authenticated", user }),
  setGuest: () => set({ status: "guest", user: null }),
  setIntendedRoute: (route) => set({ intendedRoute: route }),
  consumeIntendedRoute: () => {
    const route = get().intendedRoute;
    if (route) set({ intendedRoute: null });
    return route;
  },
}));

/** Non-reactive accessor for use outside React (interceptors, coordinators). */
export const authStore = {
  getState: useAuthStore.getState,
  setState: useAuthStore.setState,
};
