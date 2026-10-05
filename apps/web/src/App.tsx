import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ToastProvider } from "./ToastContext";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/student/Dashboard";
import { CourseShowcase } from "./pages/student/CourseShowcase";
import { MyEnrollments } from "./pages/student/MyEnrollments";
import { ApplicationPage } from "./pages/student/ApplicationPage";
import { Documents } from "./pages/student/Documents";
import { Grades } from "./pages/student/Grades";
import { MyCertificates } from "./pages/student/MyCertificates";
import { Profile } from "./pages/student/Profile";
import { Overview } from "./pages/admin/Overview";
import { AdminCourses } from "./pages/admin/Courses";
import { AdminApplications } from "./pages/admin/Applications";
import { PersonalFiles } from "./pages/admin/PersonalFiles";
import { Attestation } from "./pages/admin/Attestation";
import { AdminCertificates } from "./pages/admin/Certificates";
import { Templates } from "./pages/admin/Templates";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
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
            <Route path="/student" element={<Dashboard />} />
            <Route path="/student/courses" element={<CourseShowcase />} />
            <Route path="/student/applications" element={<MyEnrollments />} />
            <Route path="/student/applications/:enrollmentId" element={<ApplicationPage />} />
            <Route path="/student/documents" element={<Documents />} />
            <Route path="/student/grades" element={<Grades />} />
            <Route path="/student/certificates" element={<MyCertificates />} />
            <Route path="/student/profile" element={<Profile />} />
          </Route>

          <Route
            element={
              <RequireAuth role="admin">
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/admin" element={<Overview />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/files" element={<PersonalFiles />} />
            <Route path="/admin/attestation" element={<Attestation />} />
            <Route path="/admin/certificates" element={<AdminCertificates />} />
            <Route path="/admin/templates" element={<Templates />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
