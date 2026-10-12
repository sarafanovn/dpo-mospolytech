import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import logoWhite from "../assets/logo-white.svg";
import { Icon, type IconName } from "./Icon";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { to: "/student", label: "Главная", icon: "home", end: true },
  { to: "/student/courses", label: "Курсы ДПО", icon: "courses" },
  { to: "/student/applications", label: "Мои записи", icon: "edit" },
  { to: "/student/documents", label: "Документы", icon: "file" },
  { to: "/student/grades", label: "Успеваемость", icon: "grade" },
  { to: "/student/certificates", label: "Сертификаты ДПО", icon: "award" },
  { to: "/student/profile", label: "Профиль", icon: "user" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Обзор", icon: "home", end: true },
  { to: "/admin/courses", label: "Курсы ДПО", icon: "courses" },
  { to: "/admin/applications", label: "Заявки", icon: "list" },
  { to: "/admin/files", label: "Личные дела", icon: "file" },
  { to: "/admin/contracts", label: "Реестр договоров", icon: "template" },
  { to: "/admin/attestation", label: "Аттестация", icon: "grade" },
  { to: "/admin/certificates", label: "Справки и сертификаты", icon: "award" },
  { to: "/admin/templates", label: "Шаблоны документов", icon: "template" },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : STUDENT_NAV;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="portal">
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-brand">
          <img src={logoWhite} alt="Московский Политех" />
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name={item.icon} className="nav-icon" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini">
            <b>{user?.fullName}</b>
            <small>{isAdmin ? "Администратор системы" : (user?.branch ?? "Обучающийся")}</small>
          </div>
          <button className="logout-btn" onClick={handleLogout} aria-label="Выйти" title="Выйти">
            <Icon name="logout" size={20} />
          </button>
        </div>
      </aside>
      <div className={`sidebar-scrim${open ? " open" : ""}`} onClick={() => setOpen(false)} />
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setOpen((v) => !v)} aria-label="Меню">
              <Icon name="menu" size={20} />
            </button>
            <div className="breadcrumb">Портал ДПО / {isAdmin ? "Администратор" : "Обучающийся"}</div>
          </div>
          <span className="role-pill">{isAdmin ? "АДМИНИСТРАТОР" : "ОБУЧАЮЩИЙСЯ"}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
