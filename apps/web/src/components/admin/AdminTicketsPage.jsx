import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  InputAdornment,
  Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOffOutlined';
import { styled } from '@mui/material/styles';
import { adminService } from '../../services/api';

const priorityColors = {
  urgent: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const statusOrder = [
  { key: 'new', label: 'Nuevos' },
  { key: 'in_progress', label: 'En progreso' },
  { key: 'on_hold', label: 'En espera' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'closed', label: 'Cerrados' },
];

const StyledCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
  },
}));

const EmptyState = ({ title, description }) => (
  <Box
    sx={{
      border: '1px dashed rgba(148,163,184,0.4)',
      borderRadius: 12,
      padding: 3,
      textAlign: 'center',
      color: 'rgba(71,85,105,0.9)',
      background: 'rgba(148,163,184,0.08)',
    }}
  >
    <ChatBubbleOutlineIcon sx={{ fontSize: 32, mb: 1 }} />
    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    <Typography variant="body2">{description}</Typography>
  </Box>
);

const AdminTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assignUpdating, setAssignUpdating] = useState(false);
  const [staffUsers, setStaffUsers] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [draggedTicketId, setDraggedTicketId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [boardError, setBoardError] = useState('');

  const loadTickets = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const { results } = await adminService.fetchTickets({ pageSize: 200 });
      setTickets(results);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      console.error('Error loading tickets', err);
      setError(err?.message || 'No se pudieron cargar los tickets.');
      setTickets([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const staff = await adminService.fetchStaffUsers();
      setStaffUsers(staff);
    } catch (err) {
      console.warn('No se pudieron cargar los usuarios staff', err);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    loadStaff();
  }, [loadTickets, loadStaff]);

  const handleOpenDialog = async (ticket) => {
    setDialogOpen(true);
    setDialogError('');
    setResponseMessage('');
    setSelectedTicket(ticket);

    try {
      setDialogLoading(true);
      const fresh = await adminService.fetchTicket(ticket.id);
      setSelectedTicket(fresh);
    } catch (err) {
      console.error('Error fetching ticket detail', err);
      setDialogError('No se pudo cargar el detalle del ticket.');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTicket(null);
    setResponseMessage('');
    setDialogError('');
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseMessage.trim()) return;
    try {
      setSavingResponse(true);
      await adminService.respondTicket(selectedTicket.id, responseMessage.trim());
      const fresh = await adminService.fetchTicket(selectedTicket.id);
      setSelectedTicket(fresh);
      setResponseMessage('');
      await loadTickets();
    } catch (err) {
      console.error('Error sending response', err);
      setDialogError(err?.message || 'No se pudo registrar la respuesta.');
    } finally {
      setSavingResponse(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || selectedTicket.status === newStatus) return;
    try {
      setStatusUpdating(true);
      await adminService.updateTicket(selectedTicket.id, { status: newStatus });
      const fresh = await adminService.fetchTicket(selectedTicket.id);
      setSelectedTicket(fresh);
      await loadTickets();
    } catch (err) {
      console.error('Error updating status', err);
      setDialogError(err?.message || 'No se pudo actualizar el estado del ticket.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssignChange = async (assignedId) => {
    if (!selectedTicket) return;
    const normalized = assignedId === 'none' ? null : Number(assignedId);
    if (Number.isNaN(normalized)) return;
    if (
      (normalized === null && !selectedTicket.assigned_to_user_id) ||
      (normalized !== null && normalized === selectedTicket.assigned_to_user_id)
    ) {
      return;
    }
    try {
      setAssignUpdating(true);
      await adminService.updateTicket(selectedTicket.id, { assigned_to_id: normalized });
      const fresh = await adminService.fetchTicket(selectedTicket.id);
      setSelectedTicket(fresh);
      await loadTickets();
    } catch (err) {
      console.error('Error assigning ticket', err);
      setDialogError(err?.message || 'No se pudo actualizar la asignación.');
    } finally {
      setAssignUpdating(false);
    }
  };

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
        return false;
      }
      if (assignedFilter === 'unassigned' && ticket.assigned_to_user_id) {
        return false;
      }
      if (
        assignedFilter !== 'all' &&
        assignedFilter !== 'unassigned' &&
        ticket.assigned_to_user_id !== Number(assignedFilter)
      ) {
        return false;
      }
      if (!query) return true;
      const haystack = `${ticket.subject || ''} ${ticket.description || ''} ${ticket.user || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [tickets, priorityFilter, assignedFilter, searchTerm]);

  const filtersActive = useMemo(
    () => Boolean(searchTerm.trim() || priorityFilter !== 'all' || assignedFilter !== 'all'),
    [searchTerm, priorityFilter, assignedFilter]
  );

  const filteredCount = filteredTickets.length;
  const totalTickets = tickets.length;

  const assigneeOptions = useMemo(
    () =>
      staffUsers.map((staff) => ({
        id: staff.id,
        label:
          staff.first_name || staff.last_name
            ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
            : staff.email || staff.username || `Usuario ${staff.id}`,
      })),
    [staffUsers]
  );

  const groupedTickets = useMemo(() => {
    const groups = statusOrder.reduce((acc, item) => {
      acc[item.key] = [];
      return acc;
    }, {});

    filteredTickets.forEach((ticket) => {
      if (groups[ticket.status]) {
        groups[ticket.status].push(ticket);
      } else {
        groups.new.push(ticket);
      }
    });
    return groups;
  }, [filteredTickets]);

  const handleDragStart = (event, ticketId) => {
    setDraggedTicketId(ticketId);
    setBoardError('');
    event.dataTransfer.setData('text/plain', String(ticketId));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTicketId(null);
    setDragOverStatus(null);
  };

  const handleDragEnter = (status) => {
    setDragOverStatus(status);
  };

  const handleDragLeave = (status) => {
    setDragOverStatus((current) => (current === status ? null : current));
  };

  const handleDrop = async (event, targetStatus) => {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    const ticketId = Number(data);
    if (!ticketId || Number.isNaN(ticketId)) {
      handleDragEnd();
      return;
    }
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket || ticket.status === targetStatus) {
      handleDragEnd();
      return;
    }

    handleDragEnd();
    const previousStatus = ticket.status;
    setTickets((current) =>
      current.map((item) => (item.id === ticketId ? { ...item, status: targetStatus } : item))
    );

    try {
      await adminService.updateTicket(ticketId, { status: targetStatus });
      if (dialogOpen && selectedTicket?.id === ticketId) {
        setSelectedTicket((current) => (current ? { ...current, status: targetStatus } : current));
      }
      await loadTickets({ silent: true });
    } catch (err) {
      console.error('Error moviendo ticket', err);
      setBoardError('No se pudo mover el ticket. Intenta nuevamente.');
      setTickets((current) =>
        current.map((item) => (item.id === ticketId ? { ...item, status: previousStatus } : item))
      );
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setAssignedFilter('all');
  };

  const renderTicketCard = (ticket) => {
    const createdAt = new Date(ticket.created_at);
    const userInitial = ticket.user?.charAt(0)?.toUpperCase() ?? '?';
    const isDragging = draggedTicketId === ticket.id;
    const handleCardClick = () => {
      if (draggedTicketId !== null) return;
      handleOpenDialog(ticket);
    };
    return (
      <StyledCard
        key={ticket.id}
        onClick={handleCardClick}
        draggable
        onDragStart={(event) => handleDragStart(event, ticket.id)}
        onDragEnd={handleDragEnd}
        sx={{ opacity: isDragging ? 0.6 : 1 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              bgcolor: 'rgba(59,130,246,0.12)',
              color: 'rgba(30,64,175,0.9)',
              fontSize: 14,
              width: 40,
              height: 40,
            }}
          >
            {userInitial}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {ticket.subject}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Reportado por {ticket.user || 'usuario'} ·{' '}
              {createdAt.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`Prioridad ${ticket.priority}`}
            color={priorityColors[ticket.priority] || 'default'}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<AssignmentIndIcon fontSize="inherit" />}
            label={ticket.assigned_to || 'Sin asignar'}
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        </Stack>

        <Typography variant="body2" sx={{ color: 'rgba(30,41,59,0.8)' }}>
          {ticket.description?.slice(0, 180) || 'Sin descripción'}
          {ticket.description && ticket.description.length > 180 ? '…' : ''}
        </Typography>
      </StyledCard>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Soporte y tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona solicitudes de clientes, asigna responsables y responde desde una sola vista.
            {lastRefresh && (
              <Box component="span" sx={{ display: 'block', fontSize: 12, mt: 0.5 }}>
                Última actualización: {lastRefresh.toLocaleTimeString('es-CL')}
              </Box>
            )}
          </Typography>
        </Box>
        <Box sx={{ marginLeft: 'auto' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadTickets()}
            disabled={loading}
          >
            Actualizar
          </Button>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', lg: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ flexWrap: 'wrap' }}
        >
          <TextField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por asunto, descripción o cliente…"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', md: 320 } }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
            <InputLabel id="priority-filter-label">Prioridad</InputLabel>
            <Select
              labelId="priority-filter-label"
              label="Prioridad"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="urgent">Urgente</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="medium">Media</MenuItem>
              <MenuItem value="low">Baja</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
            <InputLabel id="assigned-filter-label">Asignado</InputLabel>
            <Select
              labelId="assigned-filter-label"
              label="Asignado"
              value={assignedFilter}
              onChange={(event) => setAssignedFilter(event.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="unassigned">Sin asignar</MenuItem>
              {assigneeOptions.map((option) => (
                <MenuItem key={option.id} value={String(option.id)}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}
        >
          <Typography variant="caption" color="text.secondary">
            Mostrando {filteredCount} de {totalTickets} tickets
          </Typography>
          <Button
            variant="text"
            startIcon={<FilterAltOffIcon />}
            onClick={handleClearFilters}
            disabled={!filtersActive}
          >
            Limpiar
          </Button>
        </Stack>
      </Stack>

      {boardError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {boardError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {statusOrder.map(({ key, label }) => (
            <Grid item xs={12} md={6} lg={4} key={key}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {label}
                </Typography>
                <Chip label={groupedTickets[key]?.length || 0} size="small" />
              </Stack>
              <Stack
                spacing={2}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, key)}
                onDragEnter={() => handleDragEnter(key)}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    handleDragLeave(key);
                  }
                }}
                sx={{
                  p: 1,
                  minHeight: 180,
                  borderRadius: 2,
                  border:
                    dragOverStatus === key
                      ? '1px dashed rgba(59,130,246,0.5)'
                      : '1px dashed rgba(148,163,184,0.25)',
                  backgroundColor: dragOverStatus === key ? 'rgba(59,130,246,0.08)' : 'transparent',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
              >
                {groupedTickets[key]?.length
                  ? groupedTickets[key].map(renderTicketCard)
                  : (
                    <EmptyState
                      title="Sin tickets"
                      description={`No hay tickets marcados como "${label.toLowerCase()}".`}
                    />
                  )}
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTicket ? `Ticket #${selectedTicket.id} · ${selectedTicket.subject}` : 'Ticket'}
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 280 }}>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}

          {dialogLoading || !selectedTicket ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Stack spacing={2} mb={3}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {selectedTicket.description || 'Sin descripción proporcionada.'}
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="ticket-status-label">Estado</InputLabel>
                    <Select
                      labelId="ticket-status-label"
                      label="Estado"
                      value={selectedTicket.status}
                      onChange={(event) => handleStatusChange(event.target.value)}
                      disabled={statusUpdating}
                    >
                      {statusOrder.map(({ key, label }) => (
                        <MenuItem key={key} value={key}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id="ticket-assigned-label">Asignado a</InputLabel>
                    <Select
                      labelId="ticket-assigned-label"
                      label="Asignado a"
                      value={selectedTicket.assigned_to_user_id ?? 'none'}
                      onChange={(event) => handleAssignChange(event.target.value)}
                      disabled={assignUpdating}
                    >
                      <MenuItem value="none">Sin asignar</MenuItem>
                      {staffUsers.map((staff) => (
                        <MenuItem key={staff.id} value={staff.id}>
                          {staff.first_name || staff.last_name
                            ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
                            : staff.email || staff.username}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <Divider />

                <Typography variant="subtitle1">Conversación</Typography>
                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                  <Stack spacing={1.5}>
                    {selectedTicket.responses.map((response) => {
                      const createdAt = new Date(response.created_at);
                      return (
                        <Paper
                          key={response.id}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(15,23,42,0.03)' }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {response.user_admin || 'Admin'} ·{' '}
                            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                              {createdAt.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                            </Box>
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 1 }}>
                            {response.message}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Stack>
                ) : (
                  <EmptyState
                    title="Sin respuestas registradas"
                    description="Aún no hay comentarios de seguimiento para este ticket."
                  />
                )}
              </Stack>

              <Box component="form" onSubmit={(event) => { event.preventDefault(); handleSendResponse(); }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Registrar respuesta
                </Typography>
                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  placeholder="Escribe una respuesta para el cliente o el equipo…"
                  value={responseMessage}
                  onChange={(event) => setResponseMessage(event.target.value)}
                  disabled={savingResponse}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cerrar</Button>
          <Button
            variant="contained"
            onClick={handleSendResponse}
            disabled={savingResponse || !responseMessage.trim()}
          >
            {savingResponse ? 'Enviando…' : 'Enviar respuesta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTicketsPage;
