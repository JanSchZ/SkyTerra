import React from 'react';
import { Box, Stack, Typography, Tooltip, Chip } from '@mui/material';

const STATE_COLORS = {
  done: 'success.main',
  active: 'primary.main',
  pending: 'grey.500',
};

const circleStyles = (theme, state) => {
  const color = STATE_COLORS[state] || STATE_COLORS.pending;
  return {
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: theme.palette[color] || color,
    border: state === 'active' ? `3px solid ${theme.palette.background.paper}` : 'none',
    boxShadow: state === 'active' ? `0 0 0 3px ${theme.palette.primary.light}55` : 'none',
    transition: 'all 0.2s ease',
  };
};

const connectorStyles = (theme, previousState) => {
  const baseColor = previousState === 'done' ? theme.palette.success.main : theme.palette.grey[600];
  return {
    flexGrow: 1,
    height: 2,
    background: `linear-gradient(90deg, ${baseColor}, ${theme.palette.grey[500]})`,
    opacity: previousState === 'pending' ? 0.3 : 1,
  };
};

const StatusBar = ({ status }) => {
  const nodes = status?.nodes ?? [];
  if (!nodes.length) return null;

  return (
    <Box
      sx={(theme) => ({
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(2),
        backgroundColor: theme.palette.background.paper,
      })}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {nodes.map((node, index) => (
              <React.Fragment key={node.key}>
                <Tooltip
                  arrow
                  placement="top"
                  title={
                    <Box>
                      <Typography variant="subtitle2">{node.label}</Typography>
                      {node.state === 'active' && status?.substate_label && (
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          {status.substate_label}
                        </Typography>
                      )}
                    </Box>
                  }
                >
                  <Box sx={(theme) => circleStyles(theme, node.state)} />
                </Tooltip>
                {index < nodes.length - 1 && (
                  <Box sx={(theme) => connectorStyles(theme, node.state)} />
                )}
              </React.Fragment>
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5} mt={2}>
            {nodes.map((node) => (
              <Typography
                key={node.key}
                variant="caption"
                sx={{ flex: 1, textAlign: 'center', color: 'text.secondary' }}
              >
                {node.label}
              </Typography>
            ))}
          </Stack>
        </Box>
        <Box sx={{ minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary">
            Estado actual
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {status?.substate_label || status?.node_label}
          </Typography>
          {status?.cta?.label && (
            <Chip
              sx={{ mt: 1 }}
              color={status?.cta?.action === 'open_feedback' ? 'warning' : 'primary'}
              size="small"
              label={status.cta.label}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default StatusBar;
