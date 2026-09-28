import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@meridian/shared";
import { api } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: { fullName: string; phone: string; birthDate: string }) => Promise<User>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.login({ email, password });
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const u = await api.register({ email, password, fullName });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { fullName: string; phone: string; birthDate: string }) => {
    const u = await api.updateProfile(data);
    setUser(u);
    return u;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
