import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, CircularProgress, Paper, Typography, Stack, Select, MenuItem, FormControl, InputLabel, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { propertyService } from '../../services/api';
import { tourService } from '../../services/api';
import UploadTourDialog from '../tours/UploadTourDialog';

function PropertyManagementPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [tours, setTours] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters = { page_size: 100 };
      if (statusFilter !== 'all') {
        filters.publication_status = statusFilter;
      }
      const data = await propertyService.getPaginatedProperties(1, filters);
      const list = data.results || data;
      const formatted = list.map((p) => ({
        id: p.id,
        name: p.name,
        owner: p.owner_details?.username || p.owner_username || p.owner || '—',
        price: p.price,
        size: p.size,
        publication_status: p.publication_status,
      }));
      setRows(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, refreshToggle]);

  const handleStatusChange = async (id, status) => {
    try {
      await propertyService.setPropertyStatus(id, status);
      setRefreshToggle((v) => !v);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!rowToDelete) return;
    try {
      await propertyService.deleteProperty(rowToDelete.id);
      setDeleteDialogOpen(false);
      setRowToDelete(null);
      setRefreshToggle((v) => !v);
    } catch (err) {
      console.error(err);
    }
  };

  const openDetailDialog = async (propertyId) => {
    try {
      const data = await propertyService.getProperty(propertyId);
      setSelectedProperty(data);
      // Cargar tours asociados
      try {
        const arr = await tourService.getPropertyTours(propertyId);
        setTours(arr);
      } catch (e) {
        console.error('Error obteniendo tours', e);
      }
      setDetailOpen(true);
    } catch (e) {
      console.error('Error obteniendo detalles de propiedad', e);
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Nombre', flex: 1 },
    { field: 'owner', headerName: 'Propietario', width: 150 },
    { field: 'publication_status', headerName: 'Estado', width: 130, renderCell: ({ value }) => {
        const colorMap = { pending: 'warning', approved: 'success', rejected: 'error' };
        const labelMap = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
        return <Chip label={labelMap[value] || value} color={colorMap[value] || 'default'} size="small" />;
      } },
    { field: 'price', headerName: 'Precio', width: 120, valueFormatter: ({ value }) => `US$ ${Number(value).toLocaleString()}` },
    { field: 'size', headerName: 'Tamaño (ha)', width: 120 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 320,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          {params.row.publication_status !== 'approved' && (
            <Button color="success" variant="contained" size="small" onClick={() => handleStatusChange(params.id, 'approved')}>Aprobar</Button>
          )}
          {params.row.publication_status !== 'rejected' && (
            <Button color="warning" variant="outlined" size="small" onClick={() => handleStatusChange(params.id, 'rejected')}>Rechazar</Button>
          )}
          <Button color="info" variant="text" size="small" onClick={() => openDetailDialog(params.id)}>Detalles</Button>
          <Button color="error" variant="text" size="small" onClick={() => { setRowToDelete(params.row); setDeleteDialogOpen(true); }}>Eliminar</Button>
        </Stack>
      ),
    },
  ];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Administrar Propiedades</Typography>

      <FormControl sx={{ minWidth: 180, mb: 2 }} size="small">
        <InputLabel id="status-filter-label">Filtrar por estado</InputLabel>
        <Select
          labelId="status-filter-label"
          value={statusFilter}
          label="Filtrar por estado"
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="all">Todas</MenuItem>
          <MenuItem value="pending">Pendientes</MenuItem>
          <MenuItem value="approved">Aprobadas</MenuItem>
          <MenuItem value="rejected">Rechazadas</MenuItem>
        </Select>
      </FormControl>

      <Paper variant="outlined" sx={{ height: 600, width: '100%', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', p:1 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          sx={{
            '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(25,118,210,0.07)' },
            '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(25,118,210,0.04)' },
          }}
          pageSizeOptions={[10, 25, 50]}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          localeText={{ noRowsLabel: 'No se encontraron propiedades' }}
        />
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Eliminar Propiedad</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar la propiedad "{rowToDelete?.name}" (ID: {rowToDelete?.id})? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles de Propiedad</DialogTitle>
        <DialogContent dividers>
          {selectedProperty ? (
            <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
              <Typography variant="h6">{selectedProperty.name}</Typography>
              <Typography variant="body2">ID: {selectedProperty.id}</Typography>
              <Typography variant="body2">Precio: US$ {Number(selectedProperty.price).toLocaleString()}</Typography>
              <Typography variant="body2">Tamaño: {selectedProperty.size} ha</Typography>
              <Typography variant="body2">Estado: {selectedProperty.publication_status}</Typography>
              <Typography variant="subtitle1" sx={{ mt:2 }}>Tours 360°</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap' }}>
                {tours.length === 0 && <Typography variant="body2">No hay tours para esta propiedad</Typography>}
                {tours.map((tour)=>(
                  <Button key={tour.id} href={tour.url} target="_blank" variant="outlined" size="small">{tour.name || 'Tour'}</Button>
                ))}
              </Stack>
              {tours.length > 0 && (
                <Box sx={{ mt:2, height:400, borderRadius:2, overflow:'hidden' }}>
                  <iframe src={tours[0].url} title="Preview tour" style={{width:'100%', height:'100%', border:0}} allowFullScreen />
                </Box>
              )}
              <Button variant="outlined" size="small" sx={{ mt:2, alignSelf:'flex-start' }} onClick={()=>setUploadDialogOpen(true)}>Subir nuevo tour</Button>
            </Box>
          ) : (
            <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:200 }}><CircularProgress /></Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <UploadTourDialog 
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        propertyId={selectedProperty?.id}
        onUploaded={async () => {
          if (!selectedProperty) return;
          try {
            const arr = await tourService.getPropertyTours(selectedProperty.id);
            setTours(arr);
          } catch(e){console.error(e);}
        }}
      />
    </Box>
  );
}

export default PropertyManagementPage; 