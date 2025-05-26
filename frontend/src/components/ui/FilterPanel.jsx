import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Slider,
  TextField,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import StraightenIcon from '@mui/icons-material/Straighten';
import TuneIcon from '@mui/icons-material/Tune';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import MenuIcon from '@mui/icons-material/Menu';
import AISearchBar from './AISearchBar';
import CloseIcon from '@mui/icons-material/Close';

// Componente principal de filtros
const FilterPanel = ({ onApplyFilters, open, onClose, onOpen, currentFilters, externalFilters }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const initialPriceRange = [0, 500000];
  const initialSizeRange = [0, 200];
  const initialPropertyTypes = { farm: false, ranch: false, forest: false, lake: false };
  const initialFeatures = { hasWater: false, hasViews: false, has360Tour: false };

  const [priceRange, setPriceRange] = useState(initialPriceRange);
  const [sizeRange, setSizeRange] = useState(initialSizeRange);
  const [propertyTypes, setPropertyTypes] = useState(initialPropertyTypes);
  const [features, setFeatures] = useState(initialFeatures);

  // State for text input fields for price and size
  const [priceInput, setPriceInput] = useState({ min: initialPriceRange[0].toString(), max: initialPriceRange[1].toString() });
  const [sizeInput, setSizeInput] = useState({ min: initialSizeRange[0].toString(), max: initialSizeRange[1].toString() });

  // Update text inputs when slider range changes
  useEffect(() => {
    if (priceRange && Array.isArray(priceRange) && priceRange.length === 2) {
      setPriceInput({ 
        min: (priceRange[0] ?? 0).toString(), 
        max: (priceRange[1] ?? 500000).toString() 
      });
    }
  }, [priceRange]);

  useEffect(() => {
    if (sizeRange && Array.isArray(sizeRange) && sizeRange.length === 2) {
      setSizeInput({ 
        min: (sizeRange[0] ?? 0).toString(), 
        max: (sizeRange[1] ?? 200).toString() 
      });
    }
  }, [sizeRange]);

  // Efecto para actualizar el estado interno si los filtros globales cambian
  useEffect(() => {
    if (currentFilters) {
      setPriceRange(
        currentFilters.priceMin !== undefined && currentFilters.priceMax !== undefined 
        ? [currentFilters.priceMin, currentFilters.priceMax] 
        : initialPriceRange
      );
      setSizeRange(
        currentFilters.sizeMin !== undefined && currentFilters.sizeMax !== undefined
        ? [currentFilters.sizeMin, currentFilters.sizeMax]
        : initialSizeRange
      );

      const newPropertyTypes = { ...initialPropertyTypes };
      if (currentFilters.propertyTypes && Array.isArray(currentFilters.propertyTypes)) {
        currentFilters.propertyTypes.forEach(type => {
          if (newPropertyTypes.hasOwnProperty(type)) {
            newPropertyTypes[type] = true;
          }
        });
      }
      setPropertyTypes(newPropertyTypes);

      setFeatures({
        hasWater: !!currentFilters.hasWater,
        hasViews: !!currentFilters.hasViews,
        has360Tour: !!currentFilters.has360Tour
      });
    } else {
      // Si no hay currentFilters (o es null), resetea a los valores iniciales
      setPriceRange(initialPriceRange);
      setSizeRange(initialSizeRange);
      setPropertyTypes(initialPropertyTypes);
      setFeatures(initialFeatures);
    }
  }, [currentFilters]);
  
  // Efecto para actualizar el estado interno si los filtros de IA cambian
  useEffect(() => {
    if (externalFilters && externalFilters.suggestedFilters && Object.keys(externalFilters.suggestedFilters).length > 0) {
      const aiFilters = externalFilters.suggestedFilters;
      
      let changedByAI = false;

      if (aiFilters.propertyTypes && Array.isArray(aiFilters.propertyTypes)) {
        const newPT = { ...initialPropertyTypes };
        let ptChanged = false;
        aiFilters.propertyTypes.forEach(type => {
          if (initialPropertyTypes.hasOwnProperty(type)) {
            newPT[type] = true;
            if (propertyTypes[type] !== true) ptChanged = true;
          }
        });
        Object.keys(propertyTypes).forEach(type => {
          if (propertyTypes[type] === true && !newPT[type]) {
             newPT[type] = false;
             ptChanged = true;
          }
        });
        if (ptChanged) {
            setPropertyTypes(newPT);
            changedByAI = true;
        }
      }
      
      if (aiFilters.priceRange && Array.isArray(aiFilters.priceRange) && aiFilters.priceRange.length === 2) {
        const newPriceRange = [
          (aiFilters.priceRange[0] === null || aiFilters.priceRange[0] === undefined) ? initialPriceRange[0] : aiFilters.priceRange[0],
          (aiFilters.priceRange[1] === null || aiFilters.priceRange[1] === undefined) ? initialPriceRange[1] : aiFilters.priceRange[1]
        ];
        // Additional validation to ensure we have valid numbers
        if (!isNaN(newPriceRange[0]) && !isNaN(newPriceRange[1]) && 
            (priceRange[0] !== newPriceRange[0] || priceRange[1] !== newPriceRange[1])) {
            setPriceRange(newPriceRange);
            changedByAI = true;
        }
      }
      
      if (aiFilters.features && Array.isArray(aiFilters.features)) {
        const newFeaturesState = {
          hasWater: aiFilters.features.includes('hasWater'),
          hasViews: aiFilters.features.includes('hasViews'),
          has360Tour: aiFilters.features.includes('has360Tour')
        };
        if (features.hasWater !== newFeaturesState.hasWater || 
            features.hasViews !== newFeaturesState.hasViews || 
            features.has360Tour !== newFeaturesState.has360Tour) {
            setFeatures(newFeaturesState);
            changedByAI = true;
        }
      }
      
      if (changedByAI) {
        const filtersToApplyByAI = {
            priceMin: aiFilters.priceRange && aiFilters.priceRange[0] !== null ? aiFilters.priceRange[0] : initialPriceRange[0],
            priceMax: aiFilters.priceRange && aiFilters.priceRange[1] !== null ? aiFilters.priceRange[1] : initialPriceRange[1],
            sizeMin: sizeRange[0],
            sizeMax: sizeRange[1],
            propertyTypes: aiFilters.propertyTypes && aiFilters.propertyTypes.length > 0 
                            ? aiFilters.propertyTypes.filter(type => initialPropertyTypes.hasOwnProperty(type)) 
                            : [],
            hasWater: aiFilters.features ? aiFilters.features.includes('hasWater') : false,
            hasViews: aiFilters.features ? aiFilters.features.includes('hasViews') : false,
            has360Tour: aiFilters.features ? aiFilters.features.includes('has360Tour') : false,
        };
        if (onApplyFilters) {
            onApplyFilters(filtersToApplyByAI);
        }
      }
    }
  }, [externalFilters, onApplyFilters]);

  // Función para manejar cambios en el rango de precios (Slider)
  const handlePriceSliderChange = (event, newValue) => {
    setPriceRange(newValue);
    // setPriceInput({ min: newValue[0].toString(), max: newValue[1].toString() }); // Already handled by useEffect
  };
  
  // Función para manejar el "commit" del cambio de precios (cuando el usuario suelta el slider)
  const handlePriceSliderChangeCommitted = (event, newValue) => {
    setPriceRange(newValue); // Ensure final value is set
    handleApplyLocalFilters(); // Apply filters only when committed
  };

  // Función para manejar cambios en los inputs de precio
  const handlePriceInputChange = (event) => {
    const { name, value } = event.target;
    setPriceInput(prev => ({ ...prev, [name]: value }));
  };

  // Función para aplicar cambios de los inputs de precio (onBlur o Enter)
  const applyPriceInputChanges = () => {
    let newMin = parseInt(priceInput.min, 10);
    let newMax = parseInt(priceInput.max, 10);

    if (isNaN(newMin) || newMin < 0) newMin = 0;
    if (isNaN(newMax) || newMax < newMin) newMax = priceRange[1]; // or some other sensible default or newMin
    if (newMax > 5000000) newMax = 5000000; // Assuming a max cap like initial slider max

    setPriceRange([newMin, newMax]);
    handleApplyLocalFilters();
  };

  // Función para manejar cambios en el rango de tamaños (Slider)
  const handleSizeSliderChange = (event, newValue) => {
    setSizeRange(newValue);
    // setSizeInput({ min: newValue[0].toString(), max: newValue[1].toString() }); // Already handled by useEffect
  };

  // Función para manejar el "commit" del cambio de tamaños (cuando el usuario suelta el slider)
  const handleSizeSliderChangeCommitted = (event, newValue) => {
    setSizeRange(newValue); // Ensure final value is set
    handleApplyLocalFilters(); // Apply filters only when committed
  };

  // Función para manejar cambios en los inputs de tamaño
  const handleSizeInputChange = (event) => {
    const { name, value } = event.target;
    setSizeInput(prev => ({ ...prev, [name]: value }));
  };

  // Función para aplicar cambios de los inputs de tamaño (onBlur o Enter)
  const applySizeInputChanges = () => {
    let newMin = parseInt(sizeInput.min, 10);
    let newMax = parseInt(sizeInput.max, 10);

    if (isNaN(newMin) || newMin < 0) newMin = 0;
    if (isNaN(newMax) || newMax < newMin) newMax = sizeRange[1];
    if (newMax > 1000) newMax = 1000; // Assuming a max cap like initial slider max for size

    setSizeRange([newMin, newMax]);
    handleApplyLocalFilters();
  };

  // Función para manejar cambios en los tipos de propiedad
  const handlePropertyTypeChange = (event) => {
    setPropertyTypes({
      ...propertyTypes,
      [event.target.name]: event.target.checked
    });
    // MODIFICATION: Call handleApplyLocalFilters separately or after a short delay if desired
    // For now, direct application on checkbox change is fine as per previous logic.
    handleApplyLocalFilters(); 
  };

  // Función para manejar cambios en características
  const handleFeatureChange = (event) => {
    setFeatures({
      ...features,
      [event.target.name]: event.target.checked
    });
    handleApplyLocalFilters(); 
  };

  // Función para aplicar los filtros
  const handleApplyLocalFilters = () => {
    const filtersToApply = {
      priceMin: priceRange[0],
      priceMax: priceRange[1],
      sizeMin: sizeRange[0],
      sizeMax: sizeRange[1],
      propertyTypes: Object.keys(propertyTypes).filter(key => propertyTypes[key]),
      hasWater: features.hasWater,
      hasViews: features.hasViews,
      has360Tour: features.has360Tour
    };
    if (onApplyFilters) {
      onApplyFilters(filtersToApply);
    }
    if (isMobile && onClose) {
      onClose(); // Cerrar el drawer en móvil después de aplicar
    }
  };

  // Función para resetear los filtros
  const handleResetFilters = () => {
    setPriceRange(initialPriceRange);
    setSizeRange(initialSizeRange);
    setPropertyTypes(initialPropertyTypes);
    setFeatures(initialFeatures);
    
    if (onApplyFilters) {
      onApplyFilters({
        priceMin: initialPriceRange[0],
        priceMax: initialPriceRange[1],
        sizeMin: initialSizeRange[0],
        sizeMax: initialSizeRange[1],
        propertyTypes: [],
        hasWater: false,
        hasViews: false,
        has360Tour: false
      }); 
    }
  };

  // Formato para los valores de precio
  const priceValueFormat = (value) => {
    return `$${value.toLocaleString()}`;
  };

  // Formato para los valores de tamaño
  const sizeValueFormat = (value) => {
    return `${value} ha`;
  };

  const filterPanelWidth = 280;

  const filterContent = (
    <Box sx={{ 
      width: isMobile ? '100%' : (open ? filterPanelWidth : 0), // Control width for desktop collapse
      minWidth: isMobile ? 'auto' : (open ? filterPanelWidth : 0),
      backgroundColor: 'background.paper',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRight: isMobile ? 'none' : (open ? '1px solid rgba(0, 0, 0, 0.12)' : 'none'),
      overflow: 'hidden', // Hide content when collapsed
      transition: 'width 0.3s, min-width 0.3s' // Smooth transition for collapse
    }}>
      {/* Nuevo Header del Panel de Filtros */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', // Espacio entre icono/título y botón de cerrar
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
           {/* Icono de Filtros (sin texto) - ELIMINADO */}
          {/* <FilterListIcon sx={{ mr: 1 }} /> */}
          {/* El texto "FILTROS" ha sido removido intencionalmente */}
        </Box>
       
        {/* Botón de cerrar para desktop ELIMINADO */}
        {/* !isMobile && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        ) */}
      </Box>

      {/* Panel de filtros tradicionales */}
      {/* Se muestra siempre si el panel está abierto (open es true en desktop) */}
      <Box
        role="tabpanel"
        // hidden={searchTab !== 0} // No longer needed
        id="tabpanel-filters"
        aria-labelledby="tab-filters"
        sx={{ 
          flex: 1, 
          display: 'flex', // Always flex if panel is open
          flexDirection: 'column',
          opacity: open ? 1 : 0, // Fade content during collapse
          transition: 'opacity 0.2s linear'
        }}
      >
        {/* Header con ícono y texto "FILTROS" eliminado */}
        {/* Eliminamos el Box que contenía el ícono y el texto "FILTROS" */}
        
        <Box sx={{ px: 2, flex: 1, overflowY: 'auto' }}>
          {/* Tipo de Propiedad */}
          <Accordion 
            defaultExpanded={false}
            sx={{ 
              bgcolor: 'background.paper',
              '&:before': { display: 'none' }, 
              boxShadow: 'none',
              borderRadius: 2,
              mb: 1
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                py: 0,
                '& .MuiAccordionSummary-content': {
                  my: 1
                }
              }}
            >
              <HomeWorkIcon sx={{ mr: 1 }} />
              <Typography>Property Type</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={propertyTypes.farm} 
                      onChange={handlePropertyTypeChange} 
                      name="farm" 
                    />
                  }
                  label="Farm"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={propertyTypes.ranch} 
                      onChange={handlePropertyTypeChange} 
                      name="ranch" 
                    />
                  }
                  label="Ranch"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={propertyTypes.forest} 
                      onChange={handlePropertyTypeChange} 
                      name="forest" 
                    />
                  }
                  label="Forest"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={propertyTypes.lake} 
                      onChange={handlePropertyTypeChange} 
                      name="lake" 
                    />
                  }
                  label="Lake access"
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          {/* Precio */}
          <Accordion 
            defaultExpanded={false}
            sx={{ 
              bgcolor: 'background.paper',
              '&:before': { display: 'none' }, 
              boxShadow: 'none',
              borderRadius: 2,
              mb: 1
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                py: 0,
                '& .MuiAccordionSummary-content': {
                  my: 1
                }
              }}
            >
              <AttachMoneyIcon sx={{ mr: 1 }} />
              <Typography>Price</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={priceRange}
                  onChange={handlePriceSliderChange}
                  onChangeCommitted={handlePriceSliderChangeCommitted}
                  valueLabelDisplay="auto"
                  getAriaLabel={() => 'Rango de precios'}
                  min={0}
                  max={5000000}
                  step={10000}
                  valueLabelFormat={priceValueFormat}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <TextField 
                    label="Mín Precio"
                    name="min"
                    value={priceInput.min}
                    onChange={handlePriceInputChange}
                    onBlur={applyPriceInputChanges}
                    onKeyDown={(e) => e.key === 'Enter' && applyPriceInputChanges()}
                    size="small"
                    type="number"
                  />
                  <TextField 
                    label="Máx Precio"
                    name="max"
                    value={priceInput.max}
                    onChange={handlePriceInputChange}
                    onBlur={applyPriceInputChanges}
                    onKeyDown={(e) => e.key === 'Enter' && applyPriceInputChanges()}
                    size="small"
                    type="number"
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Tamaño de lote */}
          <Accordion 
            defaultExpanded={false}
            sx={{ 
              bgcolor: 'background.paper',
              '&:before': { display: 'none' }, 
              boxShadow: 'none',
              borderRadius: 2,
              mb: 1
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                py: 0,
                '& .MuiAccordionSummary-content': {
                  my: 1
                }
              }}
            >
              <StraightenIcon sx={{ mr: 1 }} />
              <Typography>Lot Size</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={sizeRange}
                  onChange={handleSizeSliderChange}
                  onChangeCommitted={handleSizeSliderChangeCommitted}
                  valueLabelDisplay="auto"
                  getAriaLabel={() => 'Rango de tamaño'}
                  min={0}
                  max={1000}
                  step={10}
                  valueLabelFormat={sizeValueFormat}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <TextField 
                    label="Mín Ha."
                    name="min"
                    value={sizeInput.min}
                    onChange={handleSizeInputChange}
                    onBlur={applySizeInputChanges}
                    onKeyDown={(e) => e.key === 'Enter' && applySizeInputChanges()}
                    size="small"
                    type="number"
                  />
                  <TextField 
                    label="Máx Ha."
                    name="max"
                    value={sizeInput.max}
                    onChange={handleSizeInputChange}
                    onBlur={applySizeInputChanges}
                    onKeyDown={(e) => e.key === 'Enter' && applySizeInputChanges()}
                    size="small"
                    type="number"
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Otros filtros (agua, vistas, etc.) */}
          <Accordion 
            defaultExpanded={false}
            sx={{ 
              bgcolor: 'background.paper',
              '&:before': { display: 'none' }, 
              boxShadow: 'none',
              borderRadius: 2,
              mb: 1
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                py: 0,
                '& .MuiAccordionSummary-content': {
                  my: 1
                }
              }}
            >
              <TuneIcon sx={{ mr: 1 }} />
              <Typography>More Filters</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={features.hasWater} 
                      onChange={handleFeatureChange} 
                      name="hasWater" 
                      icon={<WaterDropIcon />}
                      checkedIcon={<WaterDropIcon />}
                    />
                  }
                  label="Water Access"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={features.hasViews} 
                      onChange={handleFeatureChange}
                      name="hasViews"
                      icon={<VisibilityIcon />}
                      checkedIcon={<VisibilityIcon />}
                    />
                  }
                  label="Panoramic Views"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={features.has360Tour} 
                      onChange={handleFeatureChange}
                      name="has360Tour"
                      icon={<ViewInArIcon />}
                      checkedIcon={<ViewInArIcon />}
                    />
                  }
                  label="360° Tour Available"
                />
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Botones de acción */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(0, 0, 0, 0.12)'
        }}>
          <Button 
            variant="outlined" 
            onClick={handleResetFilters}
            sx={{ flex: 1, mr: 1 }}
          >
            Reset
          </Button>
        </Box>
      </Box>
    </Box>
  );

  // En dispositivos móviles, mostramos un drawer
  if (isMobile) {
    return (
      <>
        <Box 
          sx={{ 
            position: 'absolute', 
            left: 16, 
            top: isMobile ? 72 : 16, // Adjust top for mobile to be below AI search bar in header
            zIndex: 10,
            backgroundColor: 'background.paper',
            borderRadius: '50%',
            boxShadow: 3
          }}
        >
          <IconButton onClick={onOpen} size="large">
            <MenuIcon />
          </IconButton>
        </Box>
        
        <Drawer
          anchor="left"
          open={open} // This `open` is for the drawer on mobile
          onClose={onClose}
        >
          {filterContent} 
        </Drawer>
      </>
    );
  }

  // En escritorio, mostramos los filtros inline
  // `open` prop for desktop is controlled by App.jsx via NavBar toggle
  return filterContent;
};

export default FilterPanel; 