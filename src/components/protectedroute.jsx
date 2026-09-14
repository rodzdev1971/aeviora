import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { apiRequest } from "../util/api";

export default function ProtectedRoute() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/users/me", { signal: controller.signal })
      .then(() => setStatus("authorized"))
      .catch(() => { if (!controller.signal.aborted) setStatus("unauthorized"); });
    return () => controller.abort();
  }, []);
  if (status === "checking") return <p role="status" className="p-8">Checking your account…</p>;
  if (status === "unauthorized") return <Navigate to="/login" replace />;
  return <Outlet />;
}
