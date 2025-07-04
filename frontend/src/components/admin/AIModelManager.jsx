import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button, CircularProgress, Switch } from '@mui/material';
import { api } from '../../services/api';

const AIModelManager = () => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await api.get('/ai/models/');
                setModels(response.data);
            } catch (err) {
                setError('Error al cargar los modelos de IA.');
            }
            setLoading(false);
        };
        fetchModels();
    }, []);

    const handleUpdate = async (modelId, data) => {
        try {
            await api.patch(`/ai/models/${modelId}/`, data);
        } catch (err) {
            setError('Error al actualizar el modelo.');
        }
    };

    const handleInputChange = (e, modelId, field) => {
        const newModels = models.map(m => {
            if (m.id === modelId) {
                return { ...m, [field]: e.target.value };
            }
            return m;
        });
        setModels(newModels);
    };

    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>Gestionar Modelos de IA</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Modelo</TableCell>
                            <TableCell>Precio Entrada (x1k tokens)</TableCell>
                            <TableCell>Precio Salida (x1k tokens)</TableCell>
                            <TableCell>Prompt del Sistema</TableCell>
                            <TableCell>Activo</TableCell>
                            <TableCell>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {models.map((model) => (
                            <TableRow key={model.id}>
                                <TableCell>{model.name}</TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        value={model.price_per_1k_tokens_input}
                                        onChange={(e) => handleInputChange(e, model.id, 'price_per_1k_tokens_input')}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        value={model.price_per_1k_tokens_output}
                                        onChange={(e) => handleInputChange(e, model.id, 'price_per_1k_tokens_output')}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        multiline
                                        rows={4}
                                        value={model.system_prompt}
                                        onChange={(e) => handleInputChange(e, model.id, 'system_prompt')}
                                        fullWidth
                                    />
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={model.is_active}
                                        onChange={(e) => handleUpdate(model.id, { is_active: e.target.checked })}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button onClick={() => handleUpdate(model.id, model)}>Guardar</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default AIModelManager;
