import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Typography, Container, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Alert,
  TablePagination, TableSortLabel, Chip
} from '@mui/material';

const headCells = [
  { id: 'id', label: 'ID', numeric: true },
  { id: 'subject', label: 'Asunto', numeric: false },
  { id: 'status', label: 'Estado', numeric: false },
  { id: 'priority', label: 'Prioridad', numeric: false },
  { id: 'user', label: 'Usuario', numeric: false },
  { id: 'assigned_to', label: 'Asignado a', numeric: false },
  { id: 'created_at', label: 'Creado', numeric: false },
];

const statusColors = {
  new: 'warning',
  in_progress: 'info',
  on_hold: 'secondary',
  resolved: 'success',
  closed: 'default'
};

function EnhancedTableHead({ order, orderBy, onRequestSort }) {
  const createSortHandler = property => event => onRequestSort(event, property);
  return (
    <TableHead>
      <TableRow sx={{ '& th': { color: (theme) => theme.palette.text.secondary, backgroundColor: (theme) => theme.palette.grey[100] } }}>
        {headCells.map(cell => (
          <TableCell key={cell.id} align={cell.numeric ? 'right' : 'left'}>
            <TableSortLabel
              active={orderBy === cell.id}
              direction={orderBy === cell.id ? order : 'asc'}
              onClick={createSortHandler(cell.id)}
              sx={{ '&.Mui-active': { color: '#E5E8F0' }, '& .MuiTableSortLabel-icon': { color: '#E5E8F0 !important' } }}
            >
              {cell.label}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [orderBy, setOrderBy] = useState('created_at');
  const [order, setOrder] = useState('desc');

  const fetchTickets = useCallback(() => {
    setLoading(true);
    setError(null);
    axios.get('/api/admin/tickets/', {
      params: {
        page: page + 1,
        page_size: rowsPerPage,
        ordering: `${order === 'desc' ? '-' : ''}${orderBy}`
      },
      headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
    })
      .then(res => {
        setTickets(res.data.results || []);
        setTotal(res.data.count || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching tickets:', err);
        setError('Error fetching tickets. ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      });
  }, [page, rowsPerPage, orderBy, order]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = e => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const formatDate = str => (str ? new Date(str).toLocaleString() : 'N/A');

  return (
    <Box sx={{ flexGrow: 1, py: 3 }}>
      <Container maxWidth="xl">
        <Paper elevation={1} sx={{ p: 3, backgroundColor: (theme) => theme.palette.background.paper, color: (theme) => theme.palette.text.primary, borderRadius: '12px' }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
            Tickets de Soporte
          </Typography>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress color="info" />
            </Box>
          )}
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          {!loading && !error && (
            <TableContainer>
              <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
                <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
                <TableBody>
                  {tickets.map(ticket => (
                    <TableRow key={ticket.id} hover sx={{ '& td': { color: (theme) => theme.palette.text.primary, borderColor: (theme) => theme.palette.divider } }}>
                      <TableCell sx={{ color: '#8faacc' }}>{ticket.id}</TableCell>
                      <TableCell>{ticket.subject}</TableCell>
                      <TableCell>
                        <Chip label={ticket.status} color={statusColors[ticket.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell>{ticket.priority}</TableCell>
                      <TableCell>{ticket.user}</TableCell>
                      <TableCell>{ticket.assigned_to || '—'}</TableCell>
                      <TableCell>{formatDate(ticket.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!loading && !error && tickets.length === 0 && (
            <Typography sx={{ mt: 3, textAlign: 'center', color: '#8faacc' }}>No tickets found.</Typography>
          )}
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{ '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select, & .MuiTablePagination-selectIcon': { color: (theme) => theme.palette.text.secondary } }}
          />
        </Paper>
      </Container>
    </Box>
  );
} 