import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../AuthContext";

export function RequireAuth({ role, children }: { role: "student" | "admin"; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />;
  return <>{children}</>;
}
