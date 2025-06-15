import React from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import { authService } from '../../services/api';

const drawerWidth = 240;

const navItems = [
  { text: 'Overview', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Propiedades', icon: <HomeWorkIcon />, path: '/admin/properties' },
  { text: 'Analytics', icon: <BarChartIcon />, path: '/admin/analytics' },
];

function AdminV2Layout() {
  const location = useLocation();
  const theme = useTheme();

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          SKYTERRA
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={RouterLink}
            to={item.path}
            selected={location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <ListItemButton onClick={handleLogout} sx={{ p: 2 }}>
        <ListItemIcon>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItemButton>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      {/* Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: theme.palette.background.default }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default AdminV2Layout; 