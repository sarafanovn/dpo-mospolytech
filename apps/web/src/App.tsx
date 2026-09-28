import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CourseList } from "./pages/student/CourseList";
import { MyApplications } from "./pages/student/MyApplications";
import { ApplicationWizard } from "./pages/student/ApplicationWizard";
import { Profile } from "./pages/student/Profile";
import { AdminCourses } from "./pages/admin/Courses";
import { PersonalFiles } from "./pages/admin/PersonalFiles";
import { Contracts } from "./pages/admin/Contracts";
import { Attestation } from "./pages/admin/Attestation";
import { AdminCertificates } from "./pages/admin/Certificates";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin/courses" : "/student/courses"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <RequireAuth role="student">
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/student/courses" element={<CourseList />} />
          <Route path="/student/applications" element={<MyApplications />} />
          <Route path="/student/applications/:enrollmentId" element={<ApplicationWizard />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>

        <Route
          element={
            <RequireAuth role="admin">
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/files" element={<PersonalFiles />} />
          <Route path="/admin/contracts" element={<Contracts />} />
          <Route path="/admin/attestation" element={<Attestation />} />
          <Route path="/admin/certificates" element={<AdminCertificates />} />
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
