import React from 'react';
import { Card, CardContent, Typography, Box, Button, List, ListItem, ListItemIcon, ListItemText, Divider, Chip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const PricingCard = ({ title, price, price_period, features, isFeatured = false, priceId }) => {
  const navigate = useNavigate();

  const handleSelectPlan = () => {
    navigate('/checkout', { state: { plan: { title, price, priceId, price_period } } });
  };

  return (
    <motion.div whileHover={{ y: -10, scale: 1.02 }} style={{ height: '100%' }}>
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isFeatured ? '#f5f9ff' : 'white',
          border: '1px solid',
          borderColor: isFeatured ? 'primary.main' : 'grey.300',
          borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden',
          p: 2,
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: isFeatured 
              ? '0 12px 24px rgba(0, 123, 255, 0.2)' 
              : '0 8px 16px rgba(0,0,0,0.12)',
          }
        }}
      >
        {isFeatured && (
          <Chip 
            label="Recomendado" 
            color="primary" 
            size="small" 
            sx={{ 
              position: 'absolute', 
              top: 16, 
              right: 16,
              fontWeight: 'bold',
            }} 
          />
        )}
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: { xs: 1, md: 2 } }}>
          <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {title}
            </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1.5 }}>
            <Typography variant="h4" component="p" sx={{ fontWeight: 'bold', color: isFeatured ? 'primary.dark' : 'primary.main' }}>
                {price}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>
                {price_period}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <List sx={{ flexGrow: 1 }}>
            {features.map((feature, index) => (
              <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'success.light' }}>
                  <CheckCircleOutlineIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={feature} sx={{ '& .MuiListItemText-primary': { fontSize: '0.95rem' } }} />
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 'auto', pt: 3 }}>
            <Button 
              fullWidth 
              variant={isFeatured ? 'contained' : 'outlined'} 
              color="primary"
              size="large"
              onClick={handleSelectPlan}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 'bold', 
                py: 1.5,
                textTransform: 'none',
                fontSize: '1.1rem',
              }}
            >
              Seleccionar Plan
            </Button>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PricingCard;
