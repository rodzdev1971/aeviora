import { t } from "../i18n/language.js";
import { useLanguage } from "../i18n/useLanguage.js";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { apiRequest } from "../util/api";

export default function ProtectedRoute({ requiredRole }) {
  useLanguage();
  const location = useLocation();
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
      <p role="status" className="p-8">{t("Checking your account…")}</p>
    );
  if (status === "unauthorized") return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (status === "forbidden") return <Navigate to="/dashboard" replace />;
  return <Outlet context={{ user }} />;
}
