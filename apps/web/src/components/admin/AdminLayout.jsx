import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/DashboardRounded';
import ListAltIcon from '@mui/icons-material/ListAltRounded';
import AssessmentIcon from '@mui/icons-material/AssessmentRounded';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import LiveHelpIcon from '@mui/icons-material/LiveHelpOutlined';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import './adminDashboard.css';
import { authService } from '../../services/api';

const NAV_PRIMARY = [
  { label: 'Panel', path: '/admin/dashboard', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Propiedades', path: '/admin/properties', icon: <ListAltIcon fontSize="small" /> },
  { label: 'Analítica', path: '/admin/analytics', icon: <AssessmentIcon fontSize="small" /> },
  { label: 'Proyectos', path: '/admin/projects', icon: <FolderOutlinedIcon fontSize="small" /> },
  { label: 'Equipo', path: '/admin/users', icon: <PeopleAltOutlinedIcon fontSize="small" /> },
];

const NAV_SECONDARY = [
  { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon fontSize="small" /> },
  { label: 'Help Center', path: '/admin/help', icon: <LiveHelpIcon fontSize="small" /> },
];

const NAV_DOCUMENTS = [
  { label: 'Biblioteca de datos', path: '/admin/documents/data-library' },
  { label: 'Reportes', path: '/admin/documents/reports' },
  { label: 'Asistente IA', path: '/admin/documents/assistant' },
  { label: 'Más', path: '/admin/documents/more' },
];

const AdminLayout = () => {
  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const year = useMemo(() => new Date().getFullYear(), []);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1100) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const closeSidebar = () => setSidebarOpen(false);
  const rootClassName = `admin-shell ${sidebarOpen ? 'sidebar-open' : ''}`.trim();

  return (
    <div className={rootClassName}>
      <aside className="admin-shell-sidebar">
        <a href="#" className="admin-logo-link" aria-label="SkyTerra home">
          <span className="admin-logo-mark">ST</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>SkyTerra Ops</div>
            <div style={{ fontSize: 12, color: 'rgba(16,16,16,0.45)' }}>Admin Suite {year}</div>
          </div>
        </a>

        <div className="admin-nav-section">
          <div className="admin-nav-title">Main</div>
          <div className="admin-nav-list">
            <button
              type="button"
              className="admin-nav-item"
              style={{ justifyContent: 'space-between', background: '#101010', color: '#ffffff' }}
              onClick={closeSidebar}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="nav-icon" style={{ background: '#ffffff', color: '#101010' }}>
                  <AddCircleIcon fontSize="small" />
                </span>
                Acción rápida
              </span>
              <span className="nav-icon" style={{ width: 34, height: 34, background: '#ffffff', color: '#101010' }}>
                <MailOutlineIcon fontSize="small" />
              </span>
            </button>
            {NAV_PRIMARY.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="admin-nav-section">
          <div className="admin-nav-title">Support</div>
          <div className="admin-nav-list">
            {NAV_SECONDARY.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="admin-nav-section">
          <div className="admin-nav-title">Documents</div>
          <div className="admin-doc-list">
            {NAV_DOCUMENTS.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) => `admin-doc-link${isActive ? ' active' : ''}`}
                onClick={closeSidebar}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="admin-nav-section" style={{ marginTop: 'auto' }}>
          <div className="admin-nav-title">Account</div>
          <div className="admin-nav-item" style={{ padding: 14, gap: 14 }}>
            <div className="nav-icon" style={{ width: 42, height: 42, borderRadius: 14 }}>
              <img
                src="https://api.dicebear.com/7.x/initials/svg?seed=SkyTerra"
                alt="SkyTerra"
                style={{ width: 30, height: 30 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Administrador</div>
              <div style={{ fontSize: 12, color: 'rgba(198,207,255,0.6)' }}>admin@skyterra.cl</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="nav-icon"
              style={{ background: 'rgba(120,131,255,0.16)' }}
            >
              <LogoutIcon fontSize="small" />
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="admin-shell-overlay"
        onClick={closeSidebar}
        aria-label="Cerrar menú"
      ></button>

      <div className="admin-shell-main">
        <header className="admin-header">
          <button
            type="button"
            className="admin-inset-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
          >
            {sidebarOpen ? <ChevronLeftRoundedIcon fontSize="small" /> : <MenuRoundedIcon fontSize="small" />}
          </button>
          <div className="admin-header-titles">
            <div className="admin-header-title">Panel Operativo SkyTerra</div>
            <div className="admin-header-subtitle">
              Moderación, métricas y herramientas en tiempo real.
            </div>
          </div>
          <div className="admin-header-meta">
            <span className="admin-header-breadcrumb">Documentos · Inteligencia</span>
          </div>
          <div className="admin-header-actions" />
        </header>

        <div className="admin-dashboard-wrap">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
