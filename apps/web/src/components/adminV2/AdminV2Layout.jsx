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
  Avatar,
  TextField,
  InputAdornment,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
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
      <Toolbar sx={{ justifyContent: 'center', bgcolor: 'background.paper', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          SKYTERRA
        </Typography>
      </Toolbar>
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {navItems.map((item) => {
          const selected = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
          return (
            <ListItemButton
              key={item.text}
              component={RouterLink}
              to={item.path}
              selected={selected}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                ...(selected && { bgcolor: 'rgba(25,118,210,0.1)', '&:hover': { bgcolor: 'rgba(25,118,210,0.15)' } }),
              }}
            >
              <ListItemIcon sx={{ color: selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: selected ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ mt: 'auto' }} />
      <ListItemButton onClick={handleLogout} sx={{ p: 2 }}>
        <ListItemIcon>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItemButton>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <CssBaseline />

      {/* Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid rgba(0,0,0,0.08)' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top AppBar */}
        <AppBar position="static" color="inherit" elevation={1} sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: 'background.paper' }}>
          <Toolbar sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <IconButton color="inherit" edge="start" sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
              Admin Dashboard
            </Typography>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search…"
              sx={{ bgcolor: 'action.hover', borderRadius: 1, mr: 2, width: 240,
                '& .MuiInputBase-input': { color: 'text.primary' },
                '& fieldset': { border: 'none' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
          </Toolbar>
        </AppBar>

        {/* Routed pages */}
        <Box component="main" sx={{ p: 3, flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default AdminV2Layout;