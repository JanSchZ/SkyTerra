import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl, InputAdornment } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { api } from '../../services/api';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const AdminCouponsPage = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);
    const [currentCoupon, setCurrentCoupon] = useState(null);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const response = await api.get('/payments/coupons/');
            const data = response.data;
            setCoupons(Array.isArray(data) ? data : (data.results || []));
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleOpen = (coupon = null) => {
        setCurrentCoupon(coupon || {
            code: '',
            discount_type: 'percentage',
            value: 0,
            is_active: true,
            valid_from: new Date().toISOString().slice(0, 16),
            valid_to: new Date().toISOString().slice(0, 16),
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setCurrentCoupon(null);
    };

    const handleSave = async () => {
        try {
            if (currentCoupon.id) {
                await api.put(`/payments/coupons/${currentCoupon.id}/`, currentCoupon);
            } else {
                await api.post('/payments/coupons/', currentCoupon);
            }
            fetchCoupons();
            handleClose();
        } catch (err) {
            console.error(err);
            // Handle error display
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este cupón?')) {
            try {
                await api.delete(`/payments/coupons/${id}/`);
                fetchCoupons();
            } catch (err) {
                console.error(err);
            }
        }
    };


    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'code', headerName: 'Código', width: 150 },
        { field: 'discount_type', headerName: 'Tipo', width: 120 },
        { field: 'value', headerName: 'Valor', width: 120 },
        { field: 'is_active', headerName: 'Activo', width: 100, type: 'boolean' },
        { field: 'valid_from', headerName: 'Válido Desde', width: 180, type: 'dateTime', valueGetter: (value) => new Date(value) },
        { field: 'valid_to', headerName: 'Válido Hasta', width: 180, type: 'dateTime', valueGetter: (value) => new Date(value) },
        {
            field: 'actions',
            headerName: 'Acciones',
            width: 150,
            renderCell: (params) => (
                <>
                    <IconButton onClick={() => handleOpen(params.row)}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(params.row.id)}><DeleteIcon /></IconButton>
                </>
            ),
        },
    ];

    return (
        <Box sx={{ p: 3, height: 'calc(100vh - 64px)', width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">Administración de Cupones</Typography>
                <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => handleOpen()}>
                    Crear Cupón
                </Button>
            </Box>
            <DataGrid
                rows={coupons}
                columns={columns}
                loading={loading}
                autoHeight
                sx={{
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.02)' },
                    '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(0,0,0,0.01)' },
                    border: 'none',
                }}
            />
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{currentCoupon?.id ? 'Editar Cupón' : 'Crear Cupón'}</DialogTitle>
                <DialogContent>
                    {currentCoupon && (
                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label="Código"
                                value={currentCoupon.code}
                                onChange={(e) => setCurrentCoupon({ ...currentCoupon, code: e.target.value })}
                                fullWidth
                            />
                            <FormControl fullWidth>
                                <InputLabel>Tipo de Descuento</InputLabel>
                                <Select
                                    value={currentCoupon.discount_type}
                                    label="Tipo de Descuento"
                                    onChange={(e) => setCurrentCoupon({ ...currentCoupon, discount_type: e.target.value })}
                                >
                                    <MenuItem value="percentage">Porcentaje</MenuItem>
                                    <MenuItem value="fixed">Monto Fijo</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Valor"
                                type="number"
                                value={currentCoupon.value}
                                onChange={(e) => setCurrentCoupon({ ...currentCoupon, value: e.target.value })}
                                fullWidth
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">{currentCoupon.discount_type === 'percentage' ? '%' : 'UF'}</InputAdornment>,
                                }}
                            />
                            <TextField
                                label="Válido Desde"
                                type="datetime-local"
                                value={currentCoupon.valid_from}
                                onChange={(e) => setCurrentCoupon({ ...currentCoupon, valid_from: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Válido Hasta"
                                type="datetime-local"
                                value={currentCoupon.valid_to}
                                onChange={(e) => setCurrentCoupon({ ...currentCoupon, valid_to: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={currentCoupon.is_active}
                                        onChange={(e) => setCurrentCoupon({ ...currentCoupon, is_active: e.target.checked })}
                                    />
                                }
                                label="Activo"
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!currentCoupon?.code || currentCoupon.value <= 0}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminCouponsPage; 