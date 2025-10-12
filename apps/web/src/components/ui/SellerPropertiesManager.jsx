import React, { useEffect, useState } from 'react';
import { Box, Chip, IconButton, Tooltip, CircularProgress, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
// Removed edit/publish/delete actions per request
import { propertyService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function SellerPropertiesManager({ onError }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await propertyService.getUserProperties();
      setRows(data.results || data);
    } catch (e) {
      console.error('error loading properties', e);
      if (onError) onError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    try {
      await propertyService.deleteProperty(id);
      setRows(prev=> prev.filter(r=>r.id!==id));
    } catch(e){ console.error(e); }
  };

  // Editing/publish actions disabled

  const columns = [
    { field: 'name', headerName: 'Nombre', flex: 1, minWidth: 150 },
    { field: 'listing_type', headerName: 'Modalidad', width: 110, valueGetter:(p)=> p.row.listing_type==='rent'? 'Arriendo':'Venta' },
    { field: 'price', headerName: 'Precio', width: 130, valueGetter:(p)=> p.row.listing_type==='rent'? `$${Number(p.row.rent_price||0).toLocaleString()}`:`$${Number(p.row.price||0).toLocaleString()}` },
    { field: 'views_30d', headerName: 'Visitas 30d', width: 110, headerAlign:'center', align:'center' },
    { field: 'publication_status', headerName: 'Estado', width: 120, renderCell:(params)=> (
        <Chip size="small" label={params.value==='published'?'Publicado':'Borrador'} />
      ) },
    { field: 'documents', headerName: 'Docs', width: 100, renderCell:(params)=> {
        const docs = params.value||[];
        const statuses = docs.map(d=>d.status);
        let label='Sin'; let color='default';
        if(statuses.includes('pending')) { label='Pend'; color='warning'; }
        if(statuses.includes('rejected')) { label='Rech'; color='error'; }
        if(statuses.length>0 && !statuses.includes('pending') && !statuses.includes('rejected')) { label='OK'; }
        return <Chip size="small" label={label} color={color}/>;
      } },
    { field: 'actions', headerName: 'Acciones', width: 100, sortable:false, renderCell:(params)=>{
        const row=params.row;
        return (
          <Box sx={{ display:'flex', gap:0.5 }}>
            <Tooltip title="Ver">
              <IconButton size="small" onClick={()=>navigate(`/property/${row.id}`)}><VisibilityIcon fontSize="small"/></IconButton>
            </Tooltip>
          </Box>
        );
      } }
  ];

  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
        <Typography variant="h5">Mis Propiedades</Typography>
      </Box>
      {loading ? (
        <Box sx={{ display:'flex', justifyContent:'center', p:4 }}><CircularProgress/></Box>
      ) : (
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10]}
          disableSelectionOnClick
          getRowId={(row)=>row.id}
          sx={{ border:0, '& .MuiDataGrid-columnHeaders':{backgroundColor:'rgba(255,255,255,0.08)'} }}
        />
      )}
    </Box>
  );
} 
