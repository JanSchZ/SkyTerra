import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/DashboardRounded';
import ListAltIcon from '@mui/icons-material/ListAltRounded';
import AssessmentIcon from '@mui/icons-material/AssessmentRounded';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import LocalOfferIcon from '@mui/icons-material/LocalOfferOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import './adminDashboard.css';
import { authService } from '../../services/api';

const NAV_PRIMARY = [
  { label: 'Panel', path: '/admin/dashboard', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Aprobaciones', path: '/admin/approvals', icon: <FactCheckIcon fontSize="small" /> },
  { label: 'Operators', path: '/admin/operators', icon: <FlightTakeoffIcon fontSize="small" /> },
  { label: 'Publicaciones', path: '/admin/properties', icon: <ListAltIcon fontSize="small" /> },
  { label: 'Analítica', path: '/admin/analytics', icon: <AssessmentIcon fontSize="small" /> },
  { label: 'Tickets', path: '/admin/tickets', icon: <SupportAgentIcon fontSize="small" /> },
  { label: 'Sam', path: '/admin/ai-management', icon: <SmartToyOutlinedIcon fontSize="small" /> },
  { label: 'Equipo', path: '/admin/users', icon: <PeopleAltOutlinedIcon fontSize="small" /> },
  { label: 'Cupones', path: '/admin/coupons', icon: <LocalOfferIcon fontSize="small" /> },
];

const NAV_SECONDARY = [
  { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon fontSize="small" /> },
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
  const handleNavItemClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1100) {
      closeSidebar();
    }
  };
  const rootClassName = `admin-shell ${sidebarOpen ? 'sidebar-open' : ''}`.trim();

  return (
    <div className={rootClassName}>
      <aside className="admin-shell-sidebar">
        <div className="admin-logo-spacer" aria-hidden="true" />

        <div className="admin-nav-section">
          <div className="admin-nav-title">Main</div>
          <div className="admin-nav-list">
            {NAV_PRIMARY.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
                onClick={handleNavItemClick}
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
                onClick={handleNavItemClick}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
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
            <span className="admin-header-breadcrumb">Operaciones · Moderación</span>
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
