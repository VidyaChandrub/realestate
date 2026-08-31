"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "./api";
import type {
  AuthTokens,
  LoginInput,
  LoginResponse,
  OrganisationRegistrationInput,
  Permissions,
  SafeUser,
  SessionUser,
  SignupInput,
  SignupResponse,
  UserRole,
} from "./types";
import {
  dashboardPathFor,
  findMockAccount,
} from "./mock/sessions";

const STORAGE_KEYS = {
  accessToken: "be.access_token",
  refreshToken: "be.refresh_token",
  user: "be.user",
  orgSetup: "be.org_setup",
  verifiedEmail: "be.verified_email",
} as const;

export interface OrgSetupState {
  organisationName: string;
  email: string;
  step: "verify-email" | "onboarding";
}

interface AuthContextValue {
  user: SessionUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isMock: boolean;
  login: (input: LoginInput) => Promise<SessionUser>;
  signup: (input: SignupInput) => Promise<SessionUser>;
  // Persists a session from a SafeUser + token pair returned by any of the
  // signup-wizard step endpoints (Step 1, resume, Step 2's reissue) —
  // those aren't full logins, but they hand back a real session the same
  // way login() does, so the wizard reuses this instead of duplicating
  // toSessionUser/persist logic itself.
  applyAuthTokens: (safeUser: SafeUser, tokens: AuthTokens) => SessionUser;
  logout: () => Promise<void>;
  mockLogin: (
    role: UserRole,
    email: string,
    password: string,
  ) => Promise<void>;
  mockRegister: (input: OrganisationRegistrationInput) => Promise<OrgSetupState>;
  completeEmailVerification: (code: string) => boolean;
  completeOnboarding: () => void;
  getOrgSetup: () => OrgSetupState | null;
  hasPermission: (
    module: string,
    action: "view" | "add" | "edit" | "delete",
  ) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): {
  accessToken: string | null;
  user: SessionUser | null;
} {
  if (typeof window === "undefined") {
    return { accessToken: null, user: null };
  }

  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  const rawUser = localStorage.getItem(STORAGE_KEYS.user);

  if (!accessToken || !refreshToken || !rawUser) {
    return { accessToken: null, user: null };
  }

  try {
    const parsed = JSON.parse(rawUser) as SessionUser;
    if (!parsed.role) {
      return { accessToken: null, user: null };
    }
    return { accessToken, user: parsed };
  } catch {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    return { accessToken: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = readStoredSession();
    setUser(stored.user);
    setAccessToken(stored.accessToken);
    setIsLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const persist = useCallback(
    (user: SessionUser, accessToken: string, refreshToken: string) => {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
      setUser(user);
      setAccessToken(accessToken);
    },
    [],
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    setUser(null);
    setAccessToken(null);
  }, []);

  const toSessionUser = useCallback(
    (safeUser: SafeUser, permissions: Permissions): SessionUser => {
      const role: UserRole = safeUser.org_id
        ? "organisation_admin"
        : "super_admin";
      return {
        ...safeUser,
        role,
        roleLabel: role === "super_admin" ? "Super Admin" : "Organisation Admin",
        permissions,
        organisation: null,
      };
    },
    [],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      const session = toSessionUser(response.user, {
        dashboard: { view: true },
        settings: { view: true, edit: true },
      });
      persist(session, response.access_token, response.refresh_token);
      return session;
    },
    [persist, toSessionUser],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const response = await apiFetch<SignupResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      });
      // Pending approval — no tokens, do not persist session
      if (response.pending || !response.access_token || !response.refresh_token) {
        // Return a session-like value but without persisting; caller should handle pending
        const session = toSessionUser(response.user, {});
        // Attach pending flag for UI handling by throwing a special error shape is not needed; just return with pending flag
        (session as any).pending = true;
        return session;
      }
      const session = toSessionUser(response.user, {});
      persist(session, response.access_token, response.refresh_token);
      return session;
    },
    [persist, toSessionUser],
  );

  const applyAuthTokens = useCallback(
    (safeUser: SafeUser, tokens: AuthTokens) => {
      const session = toSessionUser(safeUser, {
        dashboard: { view: true },
        settings: { view: true, edit: true },
      });
      persist(session, tokens.access_token, tokens.refresh_token);
      return session;
    },
    [persist, toSessionUser],
  );

  const mockLogin = useCallback(
    async (role: UserRole, email: string, password: string) => {
      const account = findMockAccount(email, role);
      if (!account || account.password !== password) {
        throw new Error(
          "Invalid credentials. Use one of the demo accounts shown below.",
        );
      }
      const sessionUser = account.buildUser();
      persist(sessionUser, `mock-access-${sessionUser.id}`, `mock-refresh-${sessionUser.id}`);
    },
    [persist],
  );

  const mockRegister = useCallback(
    async (input: OrganisationRegistrationInput) => {
      const setup: OrgSetupState = {
        organisationName: input.organisation_name,
        email: input.work_email,
        step: "verify-email",
      };
      localStorage.setItem(STORAGE_KEYS.orgSetup, JSON.stringify(setup));
      return setup;
    },
    [],
  );

  const getOrgSetup = useCallback((): OrgSetupState | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS.orgSetup);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OrgSetupState;
    } catch {
      return null;
    }
  }, []);

  const completeEmailVerification = useCallback((code: string) => {
    if (code.trim().length !== 6) return false;
    const setup = getOrgSetup();
    if (!setup) return false;
    localStorage.setItem(STORAGE_KEYS.verifiedEmail, setup.email);
    const next: OrgSetupState = { ...setup, step: "onboarding" };
    localStorage.setItem(STORAGE_KEYS.orgSetup, JSON.stringify(next));
    return true;
  }, [getOrgSetup]);

  const completeOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.orgSetup);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (refreshToken && !refreshToken.startsWith("mock-refresh-")) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Ignore logout API failures — always clear the local session.
      }
    }
    clearSession();
  }, [clearSession]);

  const hasPermission = useCallback(
    (module: string, action: "view" | "add" | "edit" | "delete") => {
      return user?.permissions?.[module]?.[action] === true;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isMock: true,
      login,
      signup,
      applyAuthTokens,
      logout,
      mockLogin,
      mockRegister,
      completeEmailVerification,
      completeOnboarding,
      getOrgSetup,
      hasPermission,
    }),
    [
      user,
      accessToken,
      isLoading,
      login,
      signup,
      applyAuthTokens,
      logout,
      mockLogin,
      mockRegister,
      completeEmailVerification,
      completeOnboarding,
      getOrgSetup,
      hasPermission,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useDashboardPath() {
  const { user, isLoading } = useAuth();
  const path = user ? dashboardPathFor(user.role) : "/login";
  return { path, user, isLoading };
}