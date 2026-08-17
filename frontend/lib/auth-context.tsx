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
  LoginInput,
  LoginResponse,
  SafeUser,
  SignupInput,
  SignupResponse,
} from "./types";

const STORAGE_KEYS = {
  accessToken: "be.access_token",
  refreshToken: "be.refresh_token",
  user: "be.user",
} as const;

interface AuthContextValue {
  user: SafeUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession() {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, user: null };
  }

  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  const rawUser = localStorage.getItem(STORAGE_KEYS.user);

  if (!accessToken || !refreshToken || !rawUser) {
    return { accessToken: null, refreshToken: null, user: null };
  }

  try {
    return { accessToken, refreshToken, user: JSON.parse(rawUser) as SafeUser };
  } catch {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    return { accessToken: null, refreshToken: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
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
    (user: SafeUser, accessToken: string, refreshToken: string) => {
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

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      persist(response.user, response.access_token, response.refresh_token);
    },
    [persist],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const response = await apiFetch<SignupResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      });
      persist(response.user, response.access_token, response.refresh_token);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (refreshToken) {
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

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, isLoading, login, signup, logout }),
    [user, accessToken, isLoading, login, signup, logout],
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