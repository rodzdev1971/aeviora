import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import Intake from "./pages/Intake";
import Profile from "./pages/Profile";

import ProtectedRoute from "./components/protectedroute";
import DashboardLayout from "./components/dashboardlayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          // <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          // </ProtectedRoute>
        }
      />

      <Route
        path="/records"
        element={
          // <ProtectedRoute>
            <DashboardLayout>
              <Records />
            </DashboardLayout>
          // </ProtectedRoute>
        }
      />

      <Route
        path="/intake"
        element={
          // <ProtectedRoute>
            <DashboardLayout>
              <Intake />
            </DashboardLayout>
          // </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          // <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          // </ProtectedRoute>
        }
      />
    </Routes>
  );
}