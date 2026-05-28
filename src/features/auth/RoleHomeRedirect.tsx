import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { defaultPathForRole } from "./nav";

export function RoleHomeRedirect() {
  const { role, loading } = useAuth();
  if (loading || !role) return null;
  return <Navigate to={defaultPathForRole(role)} replace />;
}
