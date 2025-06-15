import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Typography, Container, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Alert,
  TablePagination, TableSortLabel, Chip, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';

const headCells = [
  { id: 'id', label: 'ID', numeric: true },
  { id: 'property', label: 'Propiedad', numeric: false },
  { id: 'doc_type', label: 'Tipo', numeric: false },
  { id: 'description', label: 'Descripción', numeric: false },
  { id: 'uploaded_at', label: 'Subido', numeric: false },
  { id: 'status', label: 'Estado', numeric: false },
  { id: 'actions', label: 'Acciones', numeric: false, sortable: false }
];

const docTypeIcons = {
  deed: <DescriptionIcon fontSize="small" />,
  plan: <PictureAsPdfIcon fontSize="small" />,
  proof: <DescriptionIcon fontSize="small" />,
  other: <DescriptionIcon fontSize="small" />
};

const statusChipColor = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
};

function EnhancedTableHead({ order, orderBy, onRequestSort }) {
  const createSortHandler = property => event => onRequestSort(event, property);
  return (
    <TableHead>
      <TableRow sx={{ '& th': { color: (theme) => theme.palette.text.secondary, backgroundColor: (theme) => theme.palette.grey[100] } }}>
        {headCells.map(cell => (
          <TableCell key={cell.id} align={cell.numeric ? 'right' : 'left'}>
            {cell.sortable === false ? (
              cell.label
            ) : (
              <TableSortLabel
                active={orderBy === cell.id}
                direction={orderBy === cell.id ? order : 'asc'}
                onClick={createSortHandler(cell.id)}
                sx={{ '&.Mui-active': { color: '#E5E8F0' }, '& .MuiTableSortLabel-icon': { color: '#E5E8F0 !important' } }}
              >
                {cell.label}
              </TableSortLabel>
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

export default function AdminDocumentsReviewPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [orderBy, setOrderBy] = useState('uploaded_at');
  const [order, setOrder] = useState('desc');

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [currentDocToReject, setCurrentDocToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDocuments = useCallback(() => {
    setLoading(true);
    setError(null);
    axios.get('/api/documents/', {
      params: {
        page: page + 1,
        page_size: rowsPerPage,
        ordering: `${order === 'desc' ? '-' : ''}${orderBy}`,
        status: 'pending'
      },
      headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
    })
      .then(res => {
        setDocuments(res.data.results || []);
        setTotal(res.data.count || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching documents:', err);
        setError('Error fetching documents. ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      });
  }, [page, rowsPerPage, orderBy, order]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  const approveDocument = async doc => {
    try {
      await axios.post(`/api/documents/${doc.id}/approve/`, {}, {
        headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
      });
      fetchDocuments();
    } catch (err) {
      console.error('Error approving document:', err);
      alert('Error approving document: ' + (err.response?.data?.detail || err.message));
    }
  };

  const openRejectDialog = doc => {
    setCurrentDocToReject(doc);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!currentDocToReject) return;
    try {
      await axios.post(`/api/documents/${currentDocToReject.id}/reject/`, { reason: rejectReason }, {
        headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
      });
      setRejectDialogOpen(false);
      fetchDocuments();
    } catch (err) {
      console.error('Error rejecting document:', err);
      alert('Error rejecting document: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <Box sx={{ flexGrow: 1, py: 3 }}>
      <Container maxWidth="xl">
        <Paper elevation={1} sx={{ p: 3, backgroundColor: (theme) => theme.palette.background.paper, color: (theme) => theme.palette.text.primary, borderRadius: '12px' }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
            Revisión de Documentos de Propiedades
          </Typography>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress color="info" />
            </Box>
          )}
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          {!loading && !error && (
            <TableContainer>
              <Table sx={{ minWidth: 800 }} aria-labelledby="tableTitle">
                <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id} hover sx={{ '& td': { color: (theme) => theme.palette.text.primary, borderColor: (theme) => theme.palette.divider } }}>
                      <TableCell sx={{ color: '#8faacc' }}>{doc.id}</TableCell>
                      <TableCell>{doc.property_name || doc.property}</TableCell>
                      <TableCell>
                        {docTypeIcons[doc.doc_type]}
                        &nbsp;{doc.doc_type}
                      </TableCell>
                      <TableCell>{doc.description || '—'}</TableCell>
                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                      <TableCell>
                        <Chip label={doc.status} color={statusChipColor[doc.status]} size="small" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Aprobar">
                          <IconButton size="small" color="success" onClick={() => approveDocument(doc)}>
                            <CheckCircleOutlineIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rechazar">
                          <IconButton size="small" color="error" onClick={() => openRejectDialog(doc)}>
                            <HighlightOffIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver Archivo">
                          <IconButton size="small" component="a" href={doc.file} target="_blank" rel="noopener noreferrer">
                            <DescriptionIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!loading && !error && documents.length === 0 && (
            <Typography sx={{ mt: 3, textAlign: 'center', color: '#8faacc' }}>No se encontraron documentos pendientes.</Typography>
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

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Rechazar Documento</DialogTitle>
        <DialogContent>
          <DialogContentText>Ingresa la razón del rechazo:</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            multiline
            minRows={2}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleReject} color="error" variant="contained">Rechazar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 