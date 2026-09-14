import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

// export default function ProtectedRoute({ children }) {
export default function ProtectedRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("http://localhost:5000/api/patients/me", {
          credentials: "include",
        });

        if (!response.ok) {
          setStatus("unauthorized");
          return;
        }

        setStatus("authorized");
      } catch {
        setStatus("unauthorized");
      }
    }

    checkAuth();
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Checking secure session...
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/login" replace />;
  }

//   return children;
    return <Outlet />
}