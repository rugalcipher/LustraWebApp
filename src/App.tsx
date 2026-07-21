import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import { AuthProvider } from "@/auth/AuthProvider";
import ScrollToTop from "@/components/ScrollToTop";
import { DevPreviewProvider } from "@/auth/devPreview";
import { PrincipalProvider } from "@/auth/PrincipalContext";
import RoleSwitcher from "@/components/lustra/RoleSwitcher";
import RoleRoute from "@/components/RoleRoute";
import AppShell from "@/layouts/AppShell";
import InternalShell from "@/layouts/InternalShell";
import { env } from "@/config/env";
import { publicRoutes, clientRoutes, internalRoutes } from "@/app/routeRegistry";
import RestrictedSessionGate from "@/auth/RestrictedSessionGate";

/**
 * All routing is generated from the typed route registry (src/app/routeRegistry)
 * — the single source of truth for path/access/shell/nav. Guards, sidebars, and
 * bottom nav all derive from the same registry, so route-role logic is not
 * duplicated here.
 *
 * PUBLIC ROUTES RENDER IMMEDIATELY. Only guarded routes wait for the session to
 * hydrate (RoleRoute shows the branded loader), so a guest browsing Discover is
 * never blocked behind an auth round trip.
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes (dev-only routes registered only when the dev preview is enabled) */}
      {publicRoutes
        .filter((r) => !r.devOnly || env.devRolePreviewEnabled)
        .map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}

      {/* Client app shell — mobile-first immersive, guarded */}
      <Route path="/app" element={<RoleRoute><AppShell /></RoleRoute>}>
        {clientRoutes.map((r) => {
          const rel = r.path.replace(/^\/app\//, "");
          return (
            <React.Fragment key={r.path}>
              {r.index && <Route index element={r.element} />}
              <Route path={rel} element={r.element} />
            </React.Fragment>
          );
        })}
      </Route>

      {/* Internal routes — RoleRoute gate → InternalShell dispatcher selects the
          Talent/Management/Admin shell by the authenticated principal. */}
      <Route element={<RoleRoute><InternalShell /></RoleRoute>}>
        {internalRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

/**
 * Development-only guard: refuses to render if a production build is somehow
 * left in mock mode, so mock data can never reach a production deployment.
 */
function ModeGuard({ children }: { children: React.ReactNode }) {
  if (env.isProd && env.isMock) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-noir p-8 text-center">
        <div className="max-w-md">
          <p className="font-display text-lg text-rose-gold">Configuration error</p>
          <p className="mt-3 font-body text-sm text-muted-grey">
            This production build is configured for mock data (VITE_API_MODE=mock). Set
            VITE_API_MODE=api and VITE_API_BASE_URL before deploying.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ModeGuard>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthProvider>
            <DevPreviewProvider>
              <PrincipalProvider>
                <ScrollToTop />
                {/* Above the route guards on purpose, mirroring the API's
                    middleware order: "change your password" must win over a role
                    denial, which would send the user somewhere that cannot help. */}
                <RestrictedSessionGate>
                  <AppRoutes />
                </RestrictedSessionGate>
                <RoleSwitcher />
                <Toaster />
              </PrincipalProvider>
            </DevPreviewProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ModeGuard>
  );
}
