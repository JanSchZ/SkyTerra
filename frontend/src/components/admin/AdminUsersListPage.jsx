import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Typography, Container, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Alert,
    TablePagination, TableSortLabel
} from '@mui/material';

const headCells = [
    { id: 'id', numeric: true, disablePadding: false, label: 'ID' },
    { id: 'username', numeric: false, disablePadding: false, label: 'Username' },
    { id: 'email', numeric: false, disablePadding: false, label: 'Email' },
    { id: 'date_joined', numeric: false, disablePadding: false, label: 'Date Joined' },
    { id: 'property_count', numeric: true, disablePadding: false, label: 'Property Count' },
    // Add is_staff, is_superuser if needed for admin view
    { id: 'is_staff', numeric: false, disablePadding: false, label: 'Staff Status' },
    { id: 'is_superuser', numeric: false, disablePadding: false, label: 'Superuser Status' },
];

function EnhancedTableHead(props) {
    const { order, orderBy, onRequestSort } = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow sx={{ "& th": { color: (theme) => theme.palette.text.secondary, backgroundColor: (theme) => theme.palette.grey[100] } }}>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                            sx={{
                                '&.Mui-active': { color: '#E5E8F0' },
                                '& .MuiTableSortLabel-icon': { color: '#E5E8F0 !important' },
                            }}
                        >
                            {headCell.label}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}


const AdminUsersListPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);
    const [orderBy, setOrderBy] = useState('date_joined');
    const [order, setOrder] = useState('desc');

    const fetchUsers = useCallback(() => {
        setLoading(true);
        setError(null);
        const params = {
            page: page + 1,
            page_size: rowsPerPage,
            ordering: `${order === 'desc' ? '-' : ''}${orderBy}`,
        };
        axios.get('/api/admin/users/', {
            params,
            headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
        })
        .then(res => {
            setUsers(res.data.results || []);
            setTotalUsers(res.data.count || 0);
            setLoading(false);
        })
        .catch(err => {
            console.error("Error fetching users:", err);
            setError('Error fetching users. ' + (err.response?.data?.detail || err.message));
            setLoading(false);
        });
    }, [page, rowsPerPage, order, orderBy]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        // Fetching will be triggered by useEffect due to orderBy/order change
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        // Fetching will be triggered by useEffect due to page change
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Reset to first page
        // Fetching will be triggered by useEffect due to rowsPerPage/page change
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <Box sx={{ flexGrow: 1, py: 3 }}>
            <Container maxWidth="xl">
                <Paper
                    elevation={1}
                    sx={{
                        p: 3,
                        backgroundColor: (theme) => theme.palette.background.paper,
                        color: (theme) => theme.palette.text.primary,
                        borderRadius: '12px',
                    }}
                >
                    <Typography variant="h4" component="h1" sx={{ fontFamily: 'Code Pro, sans-serif', fontWeight: 'bold', mb: 3, color: '#E5E8F0' }}>
                        Manage Users
                    </Typography>

                    {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="info" /></Box>}
                    {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

                    {!loading && !error && (
                        <TableContainer>
                            <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
                                <EnhancedTableHead
                                    order={order}
                                    orderBy={orderBy}
                                    onRequestSort={handleRequestSort}
                                />
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow
                                            hover
                                            key={user.id}
                                            sx={{ "& td": { color: (theme) => theme.palette.text.primary, borderColor: (theme) => theme.palette.divider } }}
                                        >
                                            <TableCell component="th" scope="row" sx={{ color: '#8faacc' }}>{user.id}</TableCell>
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{formatDate(user.date_joined)}</TableCell>
                                            <TableCell align="right">{user.property_count}</TableCell>
                                            <TableCell>{user.is_staff ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>{user.is_superuser ? 'Yes' : 'No'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    {!loading && !error && users.length === 0 && (
                         <Typography sx={{ textAlign: 'center', mt: 3, color: '#8faacc' }}>
                            No users found.
                         </Typography>
                    )}

                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={totalUsers}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{ 
                              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select, & .MuiTablePagination-selectIcon": {
                                  color: (theme) => theme.palette.text.secondary
                              }
                        }}
                    />
                </Paper>
            </Container>
        </Box>
    );
};

export default AdminUsersListPage;
