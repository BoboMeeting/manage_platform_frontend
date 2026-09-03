"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { UserInfo } from "@/types/api";
import * as authApi from "@/lib/api/auth";
import { clearToken, setToken } from "@/lib/api/client";

interface AuthContextValue {
  user: UserInfo | null;
  loading: boolean;
  login: (account: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 启动时若本地有 Token，则拉取当前用户信息恢复登录态
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    const res = await authApi.login(account, password);
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 <AuthProvider> 内使用");
  return ctx;
}
