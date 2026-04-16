import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "../api/client";

const USER_KEY = "fs_user";
const TOKEN_KEY = "fs_access_token";
const REFRESH_KEY = "fs_refresh_token";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback((u: AuthUser, access: string, refresh?: string) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === USER_KEY) setUser(e.newValue ? JSON.parse(e.newValue) : null);
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  return { user, login, logout };
}
