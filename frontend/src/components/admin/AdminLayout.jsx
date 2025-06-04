import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, AppBar, CssBaseline, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeWorkIcon from '@mui/icons-material/HomeWork'; // Para Propiedades
import SupportAgentIcon from '@mui/icons-material/SupportAgent'; // Para Tickets de Soporte
import PeopleIcon from '@mui/icons-material/People'; // Para Usuarios
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'; // Icon for User Management
import SettingsIcon from '@mui/icons-material/Settings';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'; // Outlet para renderizar contenido de rutas hijas

const drawerWidth = 260;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin-dashboard' },
  { text: 'Propiedades', icon: <HomeWorkIcon />, path: '/admin-detailed-properties-list' }, // Updated path
  { text: 'Tickets de Soporte', icon: <SupportAgentIcon />, path: '/admin-tickets' },
  // { text: 'Usuarios', icon: <PeopleIcon />, path: '/admin-users' }, // Original generic users link
  { text: 'Gestionar Usuarios', icon: <ManageAccountsIcon />, path: '/admin-users-list' }, // New specific link
  { text: 'Configuración', icon: <SettingsIcon />, path: '/admin-settings' },
];

const AdminLayout = () => {
  const location = useLocation();

  const drawer = (
    <Box sx={{ overflow: 'auto', backgroundColor: '#182534', height: '100%', color: '#E5E8F0' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2, backgroundColor: '#101923' }}>
        <Typography variant="h5" component="div" sx={{ color: '#E5E8F0', fontFamily: 'Code Pro, sans-serif', fontWeight: 'bold' }}>
          SKYTERRA
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(143, 170, 204, 0.2)' }} />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={RouterLink} 
              to={item.path}
              selected={location.pathname.startsWith(item.path)}
              sx={{
                color: '#8faacc',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(75, 110, 150, 0.3)',
                  color: '#E5E8F0',
                  '& .MuiListItemIcon-root': {
                    color: '#E5E8F0',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(75, 110, 150, 0.1)',
                }
              }}
            >
              <ListItemIcon sx={{ color: '#8faacc' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontFamily: 'Clear Sans, sans-serif' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          backgroundColor: '#101923',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(143, 170, 204, 0.2)'
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'Code Pro, sans-serif', color: '#E5E8F0'}}>
            Panel de Administración
          </Typography>
          {/* Aquí podrían ir más elementos como búsqueda, perfil de usuario admin */}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', backgroundColor: '#182534', borderRight: 'none' },
        }}
      >
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          bgcolor: '#101923',
          p: 3, 
          width: `calc(100% - ${drawerWidth}px)` 
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout; 