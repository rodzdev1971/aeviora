import { Navigate} from "react-router-dom";
import DashboardLayout from './dashboardlayout';
export default function ProtectedRoute(){
  const isAuthenticated = sessionStorage.getItem("aeviora_session") === "active";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />
}