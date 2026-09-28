import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import logoBlack from "../assets/logo-black.svg";
import "./Layout.css";

const STUDENT_NAV = [
  { to: "/student/courses", label: "Курсы ДПО" },
  { to: "/student/applications", label: "Мои заявки" },
];

const ADMIN_NAV = [
  { to: "/admin/courses", label: "Курсы ДПО" },
  { to: "/admin/files", label: "Личные дела" },
  { to: "/admin/contracts", label: "Договоры" },
  { to: "/admin/attestation", label: "Аттестация" },
  { to: "/admin/certificates", label: "Справки и сертификаты" },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === "admin" ? ADMIN_NAV : STUDENT_NAV;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logoBlack} alt="Московский Политех" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user?.fullName}</div>
            <div className="sidebar-user-role">{user?.role === "admin" ? "Администратор" : "Обучающийся"}</div>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
