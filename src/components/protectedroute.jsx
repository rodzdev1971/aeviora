import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { apiRequest } from "../util/api";

export default function ProtectedRoute({ requiredRole }) {
  const [status, setStatus] = useState("checking");
  const [user, setUser] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/users/me", { signal: controller.signal })
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        setStatus(
          requiredRole && currentUser.role !== requiredRole
            ? "forbidden"
            : "authorized",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("unauthorized");
      });
    return () => controller.abort();
  }, [requiredRole]);
  if (status === "checking")
    return (
      <p role="status" className="p-8">
        Checking your account…
      </p>
    );
  if (status === "unauthorized") return <Navigate to="/login" replace />;
  if (status === "forbidden") return <Navigate to="/dashboard" replace />;
  return <Outlet context={{ user }} />;
}
