import React from 'react';
import { Box, Typography, Paper, Button, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    padding: theme.spacing(3),
    height: 'calc(100vh - 120px)',
    overflowY: 'auto',
}));

const mockDocuments = [
    { id: 1, name: 'Contrato Compraventa Fundo Los Aromos', user: 'Usuario 15', date: '2023-10-28', type: 'Contrato' },
    { id: 2, name: 'Plano Loteo El Arrayán', user: 'Usuario 22', date: '2023-10-27', type: 'Plano' },
    { id: 3, name: 'Certificado de Dominio Vigente Parcela #5', user: 'Usuario 4', date: '2023-10-26', type: 'Certificado' },
    { id: 4, name: 'Escritura Pública Terreno Orilla de Río', user: 'Usuario 31', date: '2023-10-25', type: 'Escritura' },
];

const AdminDocumentsReviewPage = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#192a56' }}>
                Revisión de Documentos
            </Typography>
            <GlassPaper>
                <List>
                    {mockDocuments.map((doc, index) => (
                        <React.Fragment key={doc.id}>
                            <ListItem
                                secondaryAction={
                                    <Box>
                                        <Button
                                            variant="outlined"
                                            color="success"
                                            startIcon={<CheckCircleIcon />}
                                            sx={{ mr: 1 }}
                                        >
                                            Aprobar
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<CancelIcon />}
                                        >
                                            Rechazar
                                        </Button>
                                    </Box>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar>
                                        <FolderIcon />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={doc.name}
                                    secondary={`Subido por ${doc.user} el ${doc.date}`}
                                />
                            </ListItem>
                            {index < mockDocuments.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            </GlassPaper>
        </Box>
    );
};

export default AdminDocumentsReviewPage; 