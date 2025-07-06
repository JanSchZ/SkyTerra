import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Box, List, ListItem, ListItemIcon, ListItemText, useTheme, IconButton, Tooltip } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PsychologyIcon from '@mui/icons-material/Psychology'; // Sam AI icon

const drawerWidth = 240;
const collapsedDrawerWidth = 60;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Propiedades', icon: <BusinessIcon />, path: '/admin/properties' },
    { text: 'Tickets', icon: <ConfirmationNumberIcon />, path: '/admin/tickets' },
    { text: 'Cupones', icon: <LocalOfferIcon />, path: '/admin/coupons' },
    { text: 'Usuarios', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Sam', icon: <PsychologyIcon />, path: '/admin/ai-management' }, // Sam AI assistant
    { text: 'Ajustes', icon: <SettingsIcon />, path: '/admin/settings' },
];

const AdminLayout = () => {
    const theme = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleToggle = () => {
        setIsCollapsed(!isCollapsed);
    };

    const activeLinkStyle = {
        backgroundColor: theme.palette.action.selected,
        color: theme.palette.text.primary,
        '& .MuiListItemIcon-root': {
            color: theme.palette.text.primary,
        },
        '& .MuiListItemText-primary': {
            fontWeight: 'bold',
        },
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Box
                component="nav"
                sx={{
                    width: isCollapsed ? collapsedDrawerWidth : drawerWidth,
                    flexShrink: 0,
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    backgroundColor: theme.palette.background.paper, 
                    borderRight: `1px solid ${theme.palette.divider}`,
                    position: 'relative',
                }}
            >
                <List sx={{ pt: 2 }}>
                    {menuItems.map((item) => (
                        <Tooltip title={isCollapsed ? item.text : ''} placement="right" key={item.text}>
                            <ListItem
                                button
                                component={NavLink}
                                to={item.path}
                                end={item.path.endsWith('/dashboard')}
                                sx={{
                                    mb: 1,
                                    mx: isCollapsed ? 0 : 2,
                                    borderRadius: 2,
                                    width: 'auto',
                                    color: theme.palette.text.primary,
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                    },
                                    '&.active': activeLinkStyle,
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: 'inherit', justifyContent: 'center' }}>{item.icon}</ListItemIcon>
                                {!isCollapsed && <ListItemText primary={item.text} />}
                            </ListItem>
                        </Tooltip>
                    ))}
                </List>
                <IconButton
                    onClick={handleToggle}
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: isCollapsed ? (collapsedDrawerWidth - 28) / 2 : drawerWidth - 40,
                        backgroundColor: theme.palette.background.default,
                        border: `1px solid ${theme.palette.divider}`,
                        '&:hover': { backgroundColor: theme.palette.action.hover },
                        transition: 'left 0.2s ease-in-out',
                    }}
                >
                    {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </IconButton>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: `calc(100% - ${isCollapsed ? collapsedDrawerWidth : drawerWidth}px)`,
                    backgroundColor: 'background.default',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout;