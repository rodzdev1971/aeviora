import { Routes, Route, RouterProvider, createBrowserRouter } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import MainDashboard from "./pages/MainDashboard";
import Records from "./pages/Records";
import Intake from "./pages/Intake";
import Profile from "./pages/Profile";

import ProtectedRoute from "./components/protectedroute";
import DashboardLayout from "./components/dashboardlayout";
// import DashboardLayout1 from "./components/dashboardlayout1";
// import { Children } from "react";

// const routes =[
//   {path:'/', element:<Home />},
//   {path:'register', element:<Register />},
//   {path:'login', element:<Login />},
//   {element:<ProtectedRoute />,
//     children: [
//       {path:'dashboard', element:<DashboardLayout />,
//         Children:[
//           {index:true, element:<MainDashboard />},
//           {path:'intake', element:<Intake />},
//           {path:'records',element:<Records />},
//           {path:'profile',element:<Profile />}
//         ]
//       }
//     ]
//   }
// ]

// const router = createBrowserRouter(routes, {basename:'/aeviora'})

export default function App() {

  return (
    // <div>
    //   <RouterProvider router={router} />
    // </div>

    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      {/* <Route path="test" element={<DashboardLayout />} /> */}

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
            <Route path='dashboard' element={<MainDashboard />}/>
            <Route path='intake' element={<Intake />}/>
            <Route path='records' element={<Records />} />
            <Route path='profile' element={<Profile />} />
        </Route>
      </Route>

      {/* <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MainDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Records />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/intake"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Intake />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      /> */}
    </Routes>
  );
}