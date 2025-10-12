import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Button, Chip, Tabs, Tab, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { propertyService, savedSearchService, favoritesService } from '../../services/api';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import SearchIcon from '@mui/icons-material/Search';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SellerPropertiesManager from './SellerPropertiesManager';
import UserProfile from './UserProfile';

/**
 * Seller/User Dashboard V2
 * Apple-style Liquid Glass placeholder.
 * TODO: Replace placeholders with real data as endpoints become available.
 */
export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [myProperties, setMyProperties] = useState(null);
  
  const [savedSearches, setSavedSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingFavs, setLoadingFavs] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await propertyService.getUserProperties();
        setMyProperties(data.results || data);
      } catch (err) {
        console.error('Error cargando propiedades del usuario', err);
        setMyProperties([]);
      } finally {
        
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    async function loadSaved() {
      try {
        const data = await savedSearchService.getAll();
        setSavedSearches(data.results || data);
      } catch (e) {
        console.error('error loaded saved searches', e);
      }
    }
    loadSaved();
  }, []);

  useEffect(()=>{
    async function loadFavs(){
      try{
        const data = await favoritesService.list();
        setFavorites(data);
      }catch(e){ console.error('error loading favs',e); setFavorites([]); }
      finally{ setLoadingFavs(false); }
    }
    loadFavs();
  },[]);

  const renderDocStatusChip = (property) => {
    if (!property.documents || property.documents.length === 0) {
      return <Chip label="Sin documentos" size="small" color="default" />;
    }
    const statuses = property.documents.map((d) => d.status);
    if (statuses.includes('rejected')) {
      return <Chip label="Rechazados" size="small" color="error" />;
    }
    if (statuses.includes('pending')) {
      return <Chip label="Pendientes" size="small" color="warning" />;
    }
    return <Chip label="Aprobados" size="small" />;
  };

  // Helper for property card (shared between lists)
  const PropertyCard = ({ prop }) => (
    <Paper
      variant="glass"
      sx={{ p:2, cursor:'pointer', '&:hover': { boxShadow: 3 }}}
      onClick={()=>{
        localStorage.setItem('skipAutoFlight','true');
        navigate(`/property/${prop.id}`);
      }}
    >
      <Typography variant="subtitle1" sx={{fontWeight:500}}>{prop.name}</Typography>
      <Typography variant="body2" sx={{color:'text.secondary', mb:1}}>
        {prop.listing_type === 'rent' ? `Arriendo: $${Number(prop.rent_price||0).toLocaleString()}` : `Venta: $${Number(prop.price||0).toLocaleString()}`}
      </Typography>
      {renderDocStatusChip(prop)}
    </Paper>
  );

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Hola{user ? `, ${user.first_name}` : ''} 👋
      </Typography>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(e,v)=>setTab(v)}
        textColor="primary"
        indicatorColor="primary"
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<DashboardCustomizeIcon />} iconPosition="start" label="Resumen" />
        <Tab icon={<HomeWorkIcon />} iconPosition="start" label="Mis Propiedades" />
        <Tab icon={<SearchIcon />} iconPosition="start" label="Búsquedas Guardadas" />
        <Tab icon={<FavoriteIcon />} iconPosition="start" label="Favoritos" />
        <Tab icon={<AccountCircleIcon />} iconPosition="start" label="Mi Perfil" />
      </Tabs>

      {/* Tab Panels */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Card: Resumen de Publicaciones */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper variant="glass" sx={{ p: 3 }}>
              <Typography variant="subtitle1" color="text.secondary">
                Publicaciones Activas
              </Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>
                {myProperties ? myProperties.length : 0}
              </Typography>
              <Button fullWidth size="small" sx={{ mt: 2 }} disabled>
                Ver detalles próximamente
              </Button>
            </Paper>
          </Grid>

          {/* Card: Analíticas */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper variant="glass" sx={{ p: 3 }}>
              <Typography variant="subtitle1" color="text.secondary">
                Visitas (30 días)
              </Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>
                0
              </Typography>
              <Button fullWidth size="small" sx={{ mt: 2 }} disabled>
                Gráfico próximamente
              </Button>
            </Paper>
          </Grid>

          {/* Card: Búsquedas Guardadas */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper variant="glass" sx={{ p: 3 }}>
              <Typography variant="subtitle1" color="text.secondary">Búsquedas Guardadas</Typography>
              <Typography variant="h3" sx={{ mt: 1 }}>{savedSearches.length}</Typography>
              <Button fullWidth size="small" sx={{ mt: 2 }} onClick={()=>setTab(2)} disabled={savedSearches.length===0}>Ver</Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Mis Propiedades Panel */}
      {tab === 1 && (
        <SellerPropertiesManager onError={()=>{}} />
      )}

      {/* Saved Searches Panel */}
      {tab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb:2 }}>Búsquedas Guardadas</Typography>
          {savedSearches.length === 0 ? (
            <Typography variant="body2">No hay búsquedas guardadas.</Typography>
          ) : (
            <Grid container spacing={2}>
              {savedSearches.map((s)=> (
                <Grid item xs={12} md={6} lg={4} key={s.id}>
                  <Paper variant="glass" sx={{ p:2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight:500 }}>{s.name || 'Búsqueda'}</Typography>
                    <Typography variant="body2" sx={{ color:'text.secondary', mb:1 }}>Criterios: {JSON.stringify(s.criteria)}</Typography>
                    <Button size="small" variant="outlined" onClick={()=>navigate('/search?fromSaved='+s.id)}>Buscar</Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Favorites Panel */}
      {tab === 3 && (
        <Box>
          <Typography variant="h5" sx={{ mb:2 }}>Favoritos</Typography>
          {loadingFavs ? <CircularProgress /> : favorites.length === 0 ? (
            <Typography variant="body2">No tienes propiedades favoritas.</Typography>
          ) : (
            <Grid container spacing={2}>
              {favorites.map((fav)=> (
                <Grid item xs={12} md={6} lg={4} key={fav.id}>
                  <PropertyCard prop={fav.property || fav} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* User Profile Panel */}
      {tab === 4 && (
        <UserProfile user={user} />
      )}
    </Box>
  );
} 
