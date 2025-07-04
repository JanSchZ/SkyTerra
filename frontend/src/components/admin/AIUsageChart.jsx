import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { Typography, CircularProgress } from '@mui/material';

const AIUsageChart = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsageData = async () => {
            try {
                const response = await api.get('/ai/logs/');
                // Procesar los datos para el gráfico
                const processedData = response.data.reduce((acc, log) => {
                    const date = new Date(log.timestamp).toLocaleDateString();
                    if (!acc[date]) {
                        acc[date] = { date, tokens_input: 0, tokens_output: 0 };
                    }
                    acc[date].tokens_input += log.tokens_input;
                    acc[date].tokens_output += log.tokens_output;
                    return acc;
                }, {});
                setData(Object.values(processedData));
            } catch (err) {
                setError('Error al cargar los datos de uso.');
            }
            setLoading(false);
        };
        fetchUsageData();
    }, []);

    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tokens_input" fill="#8884d8" name="Tokens de Entrada" />
                <Bar dataKey="tokens_output" fill="#82ca9d" name="Tokens de Salida" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default AIUsageChart;
