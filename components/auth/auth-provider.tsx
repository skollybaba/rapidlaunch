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
import { readApiJson } from "@/lib/http";

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
  loginWithGoogle: (credential: string) => Promise<PublicUser>;
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
      const json = await readApiJson<{ user: PublicUser | null }>(response);
      if (json?.ok) setUser(json.data?.user ?? null);
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
    const json = await readApiJson<{ user: PublicUser }>(response);
    if (!json?.ok) {
      throw new Error(json?.error?.message ?? "Could not sign in. Please try again.");
    }
    const user = json.data?.user;
    if (!user) {
      throw new Error("Could not sign in. Please try again.");
    }
    setUser(user);
    return user;
  }, []);

  const register = useCallback(
    async (input: { name?: string; email: string; password: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await readApiJson<{ user: PublicUser }>(response);
      if (!json?.ok) {
        throw new Error(json?.error?.message ?? "Could not create account. Please try again.");
      }
      const user = json.data?.user;
      if (!user) {
        throw new Error("Could not create account. Please try again.");
      }
      setUser(user);
      return user;
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

  const loginWithGoogle = useCallback(async (credential: string) => {
    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const json = await readApiJson<{ user: PublicUser }>(response);
    if (!json?.ok) {
      throw new Error(json?.error?.message ?? "Could not sign in with Google. Please try again.");
    }
    const user = json.data?.user;
    if (!user) {
      throw new Error("Could not sign in with Google. Please try again.");
    }
    setUser(user);
    return user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      setUser,
      login,
      register,
      loginWithGoogle,
      logout,
    }),
    [user, loading, refresh, login, register, loginWithGoogle, logout]
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
