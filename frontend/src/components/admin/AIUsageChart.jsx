import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { Paper, Typography, CircularProgress, Box } from '@mui/material';

const AIUsageChart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsageData = async () => {
            try {
                // Usar endpoint agregado de estadísticas, con fallback a logs crudos
                let daily = [];
                try {
                    const stats = await api.get('/ai/logs/usage_stats/?days=30');
                    daily = stats.data?.daily || [];
                } catch (_) {
                    const response = await api.get('/ai/logs/');
                    const processed = response.data.reduce((acc, log) => {
                        const date = new Date(log.timestamp).toLocaleDateString();
                        if (!acc[date]) acc[date] = { date, tokens_input: 0, tokens_output: 0 };
                        acc[date].tokens_input += log.tokens_input;
                        acc[date].tokens_output += log.tokens_output;
                        return acc;
                    }, {});
                    daily = Object.values(processed);
                }
                setData(daily);
            } catch (err) {
                setError('Error al cargar los datos de uso.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsageData();
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>;
    if (error) return <Paper sx={{ p:2 }}><Typography color="error">{error}</Typography></Paper>;

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Uso de IA (30 días)</Typography>
            <Box sx={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_tokens_input" fill="#8884d8" name="Tokens de Entrada" />
                        <Bar dataKey="total_tokens_output" fill="#82ca9d" name="Tokens de Salida" />
                        {/* Fallback para clave anterior si viene del procesado local */}
                        <Bar dataKey="tokens_input" fill="#8884d8" name="Tokens de Entrada" hide />
                        <Bar dataKey="tokens_output" fill="#82ca9d" name="Tokens de Salida" hide />
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
};

export default AIUsageChart;
