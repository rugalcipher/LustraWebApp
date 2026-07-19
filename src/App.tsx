import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "@/components/ScrollToTop";
import { DevPreviewProvider } from "@/auth/devPreview";
import { PrincipalProvider } from "@/auth/PrincipalContext";
import RoleSwitcher from "@/components/lustra/RoleSwitcher";
import RoleRoute from "@/components/RoleRoute";
import AppShell from "@/layouts/AppShell";
import InternalShell from "@/layouts/InternalShell";
import { env } from "@/config/env";
import { publicRoutes, clientRoutes, internalRoutes } from "@/app/routeRegistry";

/**
 * All routing is generated from the typed route registry (src/app/routeRegistry)
 * — the single source of truth for path/access/shell/nav. Guards, sidebars, and
 * bottom nav all derive from the same registry, so route-role logic is not
 * duplicated here.
 */
function AuthenticatedApp() {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

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

export default function App() {
  return (
    <AuthProvider>
      <DevPreviewProvider>
        <PrincipalProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
              <RoleSwitcher />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </PrincipalProvider>
      </DevPreviewProvider>
    </AuthProvider>
  );
}
