import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PendingIcon from '@mui/icons-material/PendingRounded';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';
import { propertyService, api } from '../../services/api';
import sectionsData from './dashboard/sectionsData';

const DEFAULT_CHART = sectionsData.slice(0, 30).map((item, index) => ({
  date: `2024-05-${String(index + 1).padStart(2, '0')}`,
  desktop: 100 + index * 5,
  mobile: 75 + index * 4,
}));

const RANGE_OPTIONS = [
  { label: 'Last 3 months', value: '90d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 7 days', value: '7d' },
];

const AdminDashboardPage = () => {
  const [timeRange, setTimeRange] = useState('90d');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [summary, setSummary] = useState(null);
  const [aiUsage, setAiUsage] = useState(null);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('moderation');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, usageResp, pendingResp] = await Promise.all([
        propertyService.getAdminSummary().catch((err) => {
          console.error('Resumen admin', err);
          return null;
        }),
        api.get('/ai/logs/usage_stats/?days=30').catch((err) => {
          console.error('IA usage', err);
          return null;
        }),
        propertyService.getPaginatedProperties(1, { publication_status: 'pending' }, 10).catch((err) => {
          console.error('Propiedades pendientes', err);
          return null;
        }),
      ]);

      setSummary(summaryData);
      setAiUsage(usageResp ? usageResp.data : null);
      setPendingProperties(pendingResp?.results || []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Error al cargar datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClicksData = useMemo(() => {
    const referenceDate = new Date();
    const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 90;
    const startDate = new Date(referenceDate);
    startDate.setDate(referenceDate.getDate() - days);

    // Preferimos clicks reales si el backend los provee
    const clicks = (summary?.clicks_by_day || []).map((item) => ({
      date: item.day || item.date,
      desktop: item.clicks || item.total || 0,
      mobile: Math.round((item.clicks || item.total || 0) * 0.6),
    }));
    // Fallback heurístico a partir de propiedades registradas (proporcional)
    const source = clicks.length ? clicks : (summary?.properties_by_day || []).map((item) => {
      const base = (item.count || item.total || 0) * 8; // ~8 clicks por alta como base
      return {
        date: item.day || item.date,
        desktop: Math.round(base * 0.6),
        mobile: Math.round(base * 0.4),
      };
    });

    const dataset = source.length ? source : DEFAULT_CHART;
    return dataset.filter((item) => new Date(item.date) >= startDate);
  }, [summary, timeRange]);

  const outlineRows = sectionsData;
  const moderationRows = pendingProperties;
  const focusRows = useMemo(() => sectionsData.filter((item) => item.status === 'Done'), []);
  const aiRows = useMemo(() => {
    const usage = aiUsage?.usage_by_model || [];
    if (!usage.length) return [];
    return usage.map((item, index) => ({
      id: index + 1,
      header: item['model_used__name'] || item.model_used?.name || 'Modelo IA',
      type: 'IA',
      status: `${item.request_count || 0} solicitudes`,
      target: `$${Number(item.total_cost || 0).toFixed(2)}`,
      limit: `${item.total_tokens_output || 0} tokens`,
      reviewer: `${Math.round(item.avg_response_time || 0)} ms`,
    }));
  }, [aiUsage]);

  const tabs = useMemo(
    () => [
      {
        key: 'moderation',
        label: 'Moderación',
        icon: <PendingIcon fontSize="small" />,
        rows: moderationRows,
      },
      {
        key: 'outline',
        label: 'Outline',
        icon: <FormatListBulletedIcon fontSize="small" />,
        rows: outlineRows,
      },
      {
        key: 'focus',
        label: 'Reportes',
        icon: <InsightsOutlinedIcon fontSize="small" />,
        rows: focusRows,
      },
      {
        key: 'ai',
        label: 'Sam',
        icon: <TrendingUpIcon fontSize="small" />,
        rows: aiRows,
      },
    ],
    [moderationRows, outlineRows, focusRows, aiRows]
  );

  useEffect(() => {
    if (activeTab === 'moderation' && moderationRows.length === 0) {
      const fallback = tabs.find((tab) => tab.rows.length > 0);
      if (fallback) setActiveTab(fallback.key);
    }
  }, [activeTab, moderationRows.length, tabs]);

  const currentTab = tabs.find((tab) => tab.key === activeTab) || tabs[0];
  const activeRows = currentTab?.rows || [];
  const totalPages = Math.ceil(activeRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return activeRows.slice(start, start + rowsPerPage);
  }, [activeRows, page, rowsPerPage]);

  const handlePrev = () => setPage((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setPage((prev) => Math.min(prev + 1, totalPages - 1));

  const refreshData = () => {
    setPage(0);
    loadData();
  };

  const kpiCards = useMemo(() => {
    const pending = summary?.pending_properties ?? 0;
    const publishedToday = summary?.published_today ?? 0;
    const tickets = summary?.open_tickets ?? 0;
    const totalRequests = aiUsage?.total_requests ?? 0;
    const totalCost = typeof aiUsage?.total_cost === 'number' ? aiUsage.total_cost : null;

    return [
      {
        label: 'Propiedades pendientes',
        value: pending.toLocaleString('es-CL'),
        trendLabel: pending > 0 ? `${pending} en espera` : 'Sin pendientes',
        trendIcon: pending > 0 ? <TrendingDownIcon fontSize="small" /> : <TrendingUpIcon fontSize="small" />,
        meta: 'Necesitan revisión editorial',
      },
      {
        label: 'Publicadas hoy',
        value: publishedToday.toLocaleString('es-CL'),
        trendLabel: publishedToday > 0 ? '+ actividad' : 'Sin novedades',
        trendIcon: <TrendingUpIcon fontSize="small" />,
        meta: 'Altas en las últimas 24h',
      },
      {
        label: 'Tickets abiertos',
        value: tickets.toLocaleString('es-CL'),
        trendLabel: tickets > 0 ? `${tickets} activos` : 'Todo resuelto',
        trendIcon: tickets > 0 ? <TrendingDownIcon fontSize="small" /> : <TrendingUpIcon fontSize="small" />,
        meta: 'Soporte a clientes y brokers',
      },
      {
        label: 'Uso de Sam (30d)',
        value: totalCost !== null ? `$${totalCost.toFixed(2)}` : '—',
        trendLabel: `${totalRequests.toLocaleString('es-CL')} solicitudes`,
        trendIcon: <TrendingUpIcon fontSize="small" />,
        meta: 'Tokens consumidos por la IA',
      },
    ];
  }, [summary, aiUsage]);

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
          <RefreshIcon fontSize="small" className="spin" /> Actualizando métricas...
        </div>
      )}
      <section className="admin-kpi-grid">
        {kpiCards.map((card) => (
          <article key={card.label} className="admin-kpi-card">
            <span className="label">{card.label}</span>
            <span className="value">{card.value}</span>
            <span className="trend">
              {card.trendIcon}
              {card.trendLabel}
            </span>
            <span className="meta">{card.meta}</span>
          </article>
        ))}
      </section>

      <section className="admin-panel">
        <header>
          <div className="admin-panel-title">
            <h3>Clicks en publicaciones</h3>
            <span>Total por rango seleccionado</span>
          </div>
          <div className="admin-chip-group">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`admin-chip${timeRange === option.value ? ' active' : ''}`}
                onClick={() => setTimeRange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={filteredClicksData} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDesktop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c1c1c1" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#f1f1f1" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorMobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d5d5d5" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="#f7f7f7" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
                }}
                stroke="rgba(16,16,16,0.45)"
              />
              <RechartsTooltip
                contentStyle={{
                  background: '#101010',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  color: '#ffffff',
                  padding: '12px 16px',
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-CL', { month: 'long', day: 'numeric' })}
              />
              <Area type="monotone" dataKey="desktop" stroke="#7b7b7b" fill="url(#colorDesktop)" strokeWidth={2} />
              <Area type="monotone" dataKey="mobile" stroke="#a2a2a2" fill="url(#colorMobile)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="admin-panel">
        <header>
          <div className="admin-panel-title">
            <h3>Revisión de propiedades</h3>
            <span>Solicitudes moderadas por el equipo editorial</span>
          </div>
        </header>

        <div className="admin-panel-tabs">
          <div className="admin-tab-bar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`admin-tab${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(0);
                }}
              >
                <span className="admin-tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.rows.length > 0 && <span className="admin-tab-badge">{tab.rows.length}</span>}
              </button>
            ))}
          </div>
          <div className="admin-tab-actions">
            <button type="button" className="admin-icon-button" onClick={refreshData} disabled={loading}>
              <RefreshIcon fontSize="small" className={loading ? 'spin' : ''} />
            </button>
            <button type="button" className="admin-chip admin-chip-ghost">Personalizar columnas</button>
            <button type="button" className="admin-chip admin-chip-dark">Añadir sección</button>
          </div>
        </div>

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

        <div className="admin-table-shell">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Header</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th style={{ textAlign: 'right' }}>Referencia</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, index) => {
                const rawStatus = (row.status || row.publication_status || row.review_status || 'En proceso').toString();
                const isAIRow = activeTab === 'ai';
                const statusClass = isAIRow || /done|approved|publicad/i.test(rawStatus) ? 'done' : 'progress';
                const StatusIcon = statusClass === 'done' ? DoneAllIcon : PendingIcon;
                const header = row.header || row.name || row.title || `Propiedad ${row.id}`;
                const type = row.type || row.publication_status || row.category || 'Pendiente';
                const priceValue = row.price ?? row.list_price ?? row.target;
                const formattedPrice = priceValue !== undefined && priceValue !== null && !Number.isNaN(Number(priceValue))
                  ? `$${Number(priceValue).toLocaleString('es-CL')}`
                  : row.size ?? row.surface ?? '-';
                const target = formattedPrice;
                const limit = row.limit || row.reference || row.owner?.username || row.owner_name || '-';
                const reviewer = row.reviewer || row.assigned_to || row.last_reviewed_by || row.reviewer_name || 'Sin asignar';
                const rowIdentifier = row.id ?? row.pk ?? page * rowsPerPage + index + 1;
                return (
                  <tr key={`${rowIdentifier}-${header}`}>
                    <td>{rowIdentifier.toString().padStart(2, '0')}</td>
                    <td style={{ fontWeight: 600 }}>{header}</td>
                    <td>{type}</td>
                    <td>
                      <span className={`admin-status ${statusClass}`}>
                        <StatusIcon fontSize="inherit" />
                        {isAIRow ? row.status : rawStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{target}</td>
                    <td style={{ textAlign: 'right' }}>{limit}</td>
                    <td>{reviewer}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="admin-table-footer">
            <div>{activeRows.length.toLocaleString('es-CL')} registros</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13 }}>Filas por página</span>
              <select
                value={rowsPerPage}
                onChange={(event) => {
                  setRowsPerPage(Number(event.target.value));
                  setPage(0);
                }}
              >
                {[10, 20, 30, 40].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={handlePrev} disabled={page === 0}>
                ←
              </button>
              <span style={{ fontSize: 13 }}>
                Página {page + 1} de {totalPages}
              </span>
              <button type="button" onClick={handleNext} disabled={page >= totalPages - 1}>
                →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
