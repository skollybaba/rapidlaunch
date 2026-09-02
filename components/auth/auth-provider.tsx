"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PublicUser } from "@/types/user";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (input: {
    name?: string;
    email: string;
    password: string;
  }) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: PublicUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [loading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        headers: { "Content-Type": "application/json" },
      });
      const json = await response.json();
      if (json.ok) setUser(json.data.user ?? null);
    } catch {
      // keep current user on transient failures
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await response.json();
    if (!json.ok) {
      throw new Error(json.error?.message ?? "Could not sign in");
    }
    setUser(json.data.user);
    return json.data.user as PublicUser;
  }, []);

  const register = useCallback(
    async (input: { name?: string; email: string; password: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not create account");
      }
      setUser(json.data.user);
      return json.data.user as PublicUser;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refresh, setUser, login, register, logout }),
    [user, loading, refresh, login, register, logout]
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
