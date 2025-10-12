import React, { useCallback, useEffect, useMemo, useState } from 'react';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { propertyService, api } from '../../services/api';

const AdminAnalyticsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [aiUsage, setAiUsage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryResp, usageResp] = await Promise.all([
        propertyService.getAdminSummary().catch((err) => {
          console.error('Analytics summary', err);
          return null;
        }),
        api.get('/ai/logs/usage_stats/?days=30').catch((err) => {
          console.error('Analytics ai usage', err);
          return null;
        }),
      ]);
      setSummary(summaryResp);
      setAiUsage(usageResp ? usageResp.data : null);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las métricas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pipelineData = useMemo(() => {
    const pending = summary?.pending_properties ?? 0;
    const published = summary?.published_today ?? 0;
    const tickets = summary?.open_tickets ?? 0;
    return [
      { stage: 'Pendientes', value: pending },
      { stage: 'Publicadas hoy', value: published },
      { stage: 'Tickets abiertos', value: tickets },
    ];
  }, [summary]);

  const usageByDay = useMemo(() => {
    const daily = aiUsage?.daily || [];
    if (!daily.length) return [];
    return daily.map((item) => ({
      date: item.date,
      tokens: item.total_tokens_output || 0,
      cost: Number(item.total_cost || 0),
    }));
  }, [aiUsage]);

  return (
    <div className="admin-dashboard-wrap">
      {loading && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'rgba(16,16,16,0.6)',
          }}
        >
          <RefreshIcon fontSize="small" className="spin" /> Procesando métricas…
        </div>
      )}

      <section className="admin-panel">
        <header>
          <div className="admin-panel-title">
            <h3>Funnel editorial</h3>
            <span>Estado general de publicaciones y soporte</span>
          </div>
          <button type="button" className="admin-icon-button" onClick={loadData} disabled={loading}>
            <RefreshIcon fontSize="small" className={loading ? 'spin' : ''} />
          </button>
        </header>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={pipelineData} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="stage" stroke="rgba(16,16,16,0.45)" tick={{ fontSize: 13 }} />
              <YAxis stroke="rgba(16,16,16,0.45)" tick={{ fontSize: 12 }} allowDecimals={false} />
              <RechartsTooltip
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ background: '#111111', color: '#ffffff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Bar dataKey="value" fill="#101010" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="admin-panel">
        <header>
          <div className="admin-panel-title">
            <h3>Actividad de Sam</h3>
            <span>Tokens y costo de la IA en los últimos 30 días</span>
          </div>
          <div className="admin-quick-actions">
            <TimelineOutlinedIcon fontSize="small" style={{ color: 'rgba(16,16,16,0.5)' }} />
          </div>
        </header>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff1f1',
              color: '#101010',
            }}
          >
            <ErrorOutlineIcon fontSize="small" />
            <span>{error}</span>
          </div>
        )}

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={usageByDay} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="aiTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c4c4c4" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#f4f4f4" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.08)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(16,16,16,0.45)" tickFormatter={(value) => new Date(value).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })} />
              <YAxis stroke="rgba(16,16,16,0.45)" tickFormatter={(value) => `${value.toLocaleString('es-CL')}`} />
              <RechartsTooltip
                contentStyle={{ background: '#101010', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
                formatter={(value, name) => {
                  if (name === 'tokens') return [`${Number(value).toLocaleString('es-CL')} tokens`, 'Tokens'];
                  if (name === 'cost') return [`$${Number(value).toFixed(2)}`, 'Costo'];
                  return [value, name];
                }}
              />
              <Area type="monotone" dataKey="tokens" stroke="#909090" fill="url(#aiTokens)" strokeWidth={2} />
              <Area type="monotone" dataKey="cost" stroke="#505050" fill="rgba(0,0,0,0.05)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="admin-panel">
        <header>
          <div className="admin-panel-title">
            <h3>Notas rápidas</h3>
            <span>Hallazgos destacados para el equipo</span>
          </div>
          <InsertChartOutlinedIcon fontSize="small" style={{ color: 'rgba(16,16,16,0.45)' }} />
        </header>
        <ul style={{ display: 'grid', gap: 12, listStyle: 'disc inside', fontSize: 14 }}>
          <li>Propiedades pendientes por revisión: {summary?.pending_properties ?? 0}</li>
          <li>Solicitudes IA en 30 días: {aiUsage?.total_requests ?? 0}</li>
          <li>Tickets abiertos: {summary?.open_tickets ?? 0}</li>
        </ul>
      </section>
    </div>
  );
};

export default AdminAnalyticsPage;
