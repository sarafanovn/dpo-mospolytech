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
          <button className="icon-btn icon-btn-danger" onClick={handleLogout} aria-label="Выйти" title="Выйти">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 17v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
