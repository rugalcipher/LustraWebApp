import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { GUEST_PRINCIPAL, LOADING_PRINCIPAL, type Principal } from "@/auth/principal";
import { useAuthStore } from "@/stores/authStore";

// The guard's contract is what we're testing; the principal source is stubbed.
const principalState = { value: GUEST_PRINCIPAL as Principal };

vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => {
    const principal = principalState.value;
    return {
      principal,
      isLoading: principal.isLoading,
      hasRole: (r: string) => principal.roles.includes(r as never),
      hasAnyRole: (allowed?: readonly string[] | null) =>
        Array.isArray(allowed) && allowed.some((r) => principal.roles.includes(r as never)),
      hasPermission: (p: string) => principal.permissions.includes(p),
      isVip: false,
      primaryRole: principal.roles[0] ?? "guest",
      GUEST: "guest",
    };
  },
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>SIGN IN</div>} />
        <Route path="/unauthorized" element={<div>UNAUTHORIZED</div>} />
        <Route
          path="/admin/users"
          element={
            <RoleRoute>
              <div>ADMIN USERS</div>
            </RoleRoute>
          }
        />
        <Route
          path="/app/saved"
          element={
            <RoleRoute>
              <div>SAVED</div>
            </RoleRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function authenticated(overrides: Partial<Principal>): Principal {
  return {
    ...GUEST_PRINCIPAL,
    userId: "u1",
    isAuthenticated: true,
    accountStatus: "Active",
    isLoading: false,
    source: "real",
    ...overrides,
  } as Principal;
}

beforeEach(() => {
  useAuthStore.setState({ intendedRoute: null });
  principalState.value = GUEST_PRINCIPAL;
});

describe("RoleRoute", () => {
  it("renders a loader and no decision while the principal is unsettled", () => {
    principalState.value = LOADING_PRINCIPAL;
    renderAt("/admin/users");
    expect(screen.queryByText("ADMIN USERS")).not.toBeInTheDocument();
    expect(screen.queryByText("UNAUTHORIZED")).not.toBeInTheDocument();
    expect(screen.queryByText("SIGN IN")).not.toBeInTheDocument();
  });

  it("sends a guest to sign-in and preserves the attempted route", () => {
    principalState.value = GUEST_PRINCIPAL;
    renderAt("/app/saved");
    expect(screen.getByText("SIGN IN")).toBeInTheDocument();
    expect(useAuthStore.getState().intendedRoute).toBe("/app/saved");
  });

  it("sends a signed-in user with the wrong role to /unauthorized, not to sign-in", () => {
    principalState.value = authenticated({ roles: ["client"] });
    renderAt("/admin/users");
    expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
    expect(screen.queryByText("SIGN IN")).not.toBeInTheDocument();
  });

  it("allows a principal holding the required role AND permission", () => {
    // /admin/users carries Users.View, mirroring AdminUsersController's own
    // policy. A role alone is not enough — the permission is the real gate.
    principalState.value = authenticated({ roles: ["admin"], permissions: ["Users.View"] });
    renderAt("/admin/users");
    expect(screen.getByText("ADMIN USERS")).toBeInTheDocument();
  });

  it("refuses an admin who does not hold Users.View", () => {
    principalState.value = authenticated({ roles: ["admin"], permissions: [] });
    renderAt("/admin/users");
    expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
  });

  it("denies a suspended account even when the role matches", () => {
    principalState.value = authenticated({
      roles: ["admin"],
      permissions: ["Users.View"],
      accountStatus: "Suspended",
    });
    renderAt("/admin/users");
    expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
  });

  it("enforces fine-grained permissions from the real claims", () => {
    principalState.value = authenticated({ roles: ["management"], permissions: [] });
    render(
      <MemoryRouter initialEntries={["/x"]}>
        <Routes>
          <Route path="/unauthorized" element={<div>UNAUTHORIZED</div>} />
          <Route
            path="/x"
            element={
              <RoleRoute allowed={["management"]} requiredPermissions={["Inquiries.View"]}>
                <div>PIPELINE</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("UNAUTHORIZED")).toBeInTheDocument();
  });
});
