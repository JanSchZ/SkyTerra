import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, AppBar, CssBaseline, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeWorkIcon from '@mui/icons-material/HomeWork'; // Para Propiedades
import SupportAgentIcon from '@mui/icons-material/SupportAgent'; // Para Tickets de Soporte
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'; // Icon for User Management
import SettingsIcon from '@mui/icons-material/Settings';
import DescriptionIcon from '@mui/icons-material/Description';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'; // Outlet para renderizar contenido de rutas hijas
import { alpha } from '@mui/material/styles';

const drawerWidth = 72;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Propiedades', icon: <HomeWorkIcon />, path: '/admin/properties' },
  { text: 'Tickets', icon: <SupportAgentIcon />, path: '/admin/tickets' },
  { text: 'Documentos', icon: <DescriptionIcon />, path: '/admin/documents' },
  { text: 'Usuarios', icon: <ManageAccountsIcon />, path: '/admin/users' },
  { text: 'Configuración', icon: <SettingsIcon />, path: '/admin/settings' },
];

const AdminLayout = () => {
  const location = useLocation();

  const drawer = (
    <Box sx={{ overflow: 'auto', backgroundColor: 'background.paper', height: '100%' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2, backgroundColor: 'background.paper' }}>
        <Typography variant="h6" component="div" sx={{ letterSpacing: 1, fontWeight: 700 }}>
          ST
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: (theme) => theme.palette.divider }} />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ justifyContent: 'center' }}>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={location.pathname.startsWith(item.path)}
              sx={{
                justifyContent: 'center',
                color: 'text.secondary',
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  color: (theme) => theme.palette.primary.main,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      {false && (
          <AppBar
            position="fixed"
            sx={{
              width: `calc(100% - ${drawerWidth}px)`,
              ml: `${drawerWidth}px`,
              backgroundColor: '#101923',
              boxShadow: 'none'
            }}
          >
            <Toolbar>
              <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'Code Pro, sans-serif', color: '#E5E8F0'}}>
                Panel de Administración
              </Typography>
              {/* Aquí podrían ir más elementos como búsqueda, perfil de usuario admin */}
            </Toolbar>
          </AppBar>
      )}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
            backgroundColor: 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: `calc(100% - ${drawerWidth}px)`,
        }}
      >
        <Toolbar /> {/* This Toolbar acts as a spacer for the removed fixed AppBar. Review if still needed or if p:3 is enough */} 
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout; 