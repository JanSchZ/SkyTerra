import React, { useMemo } from 'react';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

const STATE_CONFIG = {
  done: { label: 'Completado', color: 'success' },
  active: { label: 'En curso', color: 'primary' },
  pending: { label: 'Pendiente', color: 'default' },
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return value;
  }
};

const formatDuration = (entry) => {
  if (entry?.duration_days != null) {
    if (entry.duration_days >= 1) {
      return `${entry.duration_days.toFixed(1)} días`;
    }
    if (entry.duration_hours != null) {
      return `${entry.duration_hours.toFixed(1)} h`;
    }
  }
  if (entry?.duration_hours != null) {
    return `${entry.duration_hours.toFixed(1)} h`;
  }
  return '—';
};

const formatExpected = (entry) => {
  if (entry?.expected_days != null) {
    if (entry.expected_days >= 1) {
      return `${entry.expected_days.toFixed(1)} días`;
    }
    if (entry.expected_hours != null) {
      return `${entry.expected_hours.toFixed(0)} h`;
    }
  }
  if (entry?.expected_hours != null) {
    return `${entry.expected_hours.toFixed(0)} h`;
  }
  return '—';
};

const WorkflowTimeline = ({ timeline = [], dense = false, elevation = 0 }) => {
  const rows = useMemo(() => timeline ?? [], [timeline]);

  if (!rows.length) {
    return null;
  }

  return (
    <Paper elevation={elevation} sx={{ mt: dense ? 1 : 2, borderRadius: 2 }}>
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Etapa</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Inicio</TableCell>
              <TableCell>Fin</TableCell>
              <TableCell>Duración</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>Último evento</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((entry) => {
              const state = STATE_CONFIG[entry.state] || STATE_CONFIG.pending;
              const currentEvent = entry.current_event || null;
              const lastMessage = currentEvent?.message || '';
              const substate = currentEvent?.substate_label || currentEvent?.substate || '—';
              return (
                <TableRow key={entry.key} hover>
                  <TableCell>
                    <Typography variant={dense ? 'body2' : 'body1'} fontWeight={600}>
                      {entry.label}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={state.label}
                      color={state.color}
                      size={dense ? 'small' : 'medium'}
                      variant={entry.state === 'pending' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>{formatDate(entry.started_at)}</TableCell>
                  <TableCell>{formatDate(entry.completed_at)}</TableCell>
                  <TableCell>{formatDuration(entry)}</TableCell>
                  <TableCell>{formatExpected(entry)}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant={dense ? 'caption' : 'body2'} sx={{ fontWeight: 600 }}>
                        {substate}
                      </Typography>
                      {lastMessage ? (
                        <Tooltip title={lastMessage} placement="top">
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {lastMessage}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {entry.state === 'pending' ? 'Pendiente de comenzar' : 'Sin comentarios'}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default WorkflowTimeline;
