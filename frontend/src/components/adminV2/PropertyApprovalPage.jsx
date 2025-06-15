import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, CircularProgress, Paper, Typography, Stack } from '@mui/material';
import { propertyService } from '../../services/api';

function PropertyApprovalPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [refreshToggle, setRefreshToggle] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await propertyService.getPaginatedProperties(1, { publication_status: 'pending', page_size: 100 });
      const list = data.results || data;
      const formatted = list.map((p) => ({ id: p.id, name: p.name, owner: p.owner_details?.username, price: p.price, size: p.size }));
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
  }, [refreshToggle]);

  const handleStatusChange = async (id, status) => {
    try {
      await propertyService.setPropertyStatus(id, status);
      setRefreshToggle((v) => !v);
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Nombre', flex: 1 },
    { field: 'owner', headerName: 'Propietario', width: 150 },
    { field: 'price', headerName: 'Precio', width: 120, valueFormatter: ({ value }) => `US$ ${Number(value).toLocaleString()}` },
    { field: 'size', headerName: 'Tamaño (ha)', width: 120 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 220,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button color="success" variant="contained" size="small" onClick={() => handleStatusChange(params.id, 'approved')}>Aprobar</Button>
          <Button color="error" variant="outlined" size="small" onClick={() => handleStatusChange(params.id, 'rejected')}>Rechazar</Button>
        </Stack>
      ),
    },
  ];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Propiedades Pendientes de Aprobación</Typography>
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
      </Paper>
    </Box>
  );
}

export default PropertyApprovalPage; 