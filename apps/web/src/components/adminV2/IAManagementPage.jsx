import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { aiManagementService } from '../../services/api';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function IAManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchAgents();
  }, []);

  const fetchTasks = async () => {
    const response = await aiManagementService.getTasks();
    setTasks(response);
  };

  const fetchAgents = async () => {
    const response = await aiManagementService.getAgents();
    setAgents(response);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpen = (item = null) => {
    setIsEditing(!!item);
    setCurrentItem(item || {});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentItem(null);
  };

  const handleSave = async () => {
    const service = tabValue === 0 ? aiManagementService : aiManagementService;
    const entity = tabValue === 0 ? 'Task' : 'Agent';
    const fetcher = tabValue === 0 ? fetchTasks : fetchAgents;
    
    try {
        if (isEditing) {
            if (entity === 'Task') {
                await service.updateTask(currentItem.id, currentItem);
            } else {
                await service.updateAgent(currentItem.id, currentItem);
            }
        } else {
            if (entity === 'Task') {
                await service.createTask(currentItem);
            } else {
                await service.createAgent(currentItem);
            }
        }
        fetcher();
        handleClose();
    } catch (error) {
        console.error(`Error saving ${entity}:`, error);
    }
  };
  
  const handleDelete = async (id) => {
    const service = tabValue === 0 ? aiManagementService : aiManagementService;
    const entity = tabValue === 0 ? 'Task' : 'Agent';
    const fetcher = tabValue === 0 ? fetchTasks : fetchAgents;

    if (window.confirm(`Are you sure you want to delete this ${entity}?`)) {
        try {
            if (entity === 'Task') {
                await service.deleteTask(id);
            } else {
                await service.deleteAgent(id);
            }
            fetcher();
        } catch (error) {
            console.error(`Error deleting ${entity}:`, error);
        }
    }
  };

  const renderList = (items, type) => (
    <List>
      {items.map(item => (
        <ListItem key={item.id} secondaryAction={
          <>
            <IconButton edge="end" aria-label="edit" onClick={() => handleOpen(item)}>
              <EditIcon />
            </IconButton>
            <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(item.id)}>
              <DeleteIcon />
            </IconButton>
          </>
        }>
          <ListItemText primary={item.name} secondary={item.description || `ID: ${item.id}`} />
        </ListItem>
      ))}
    </List>
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>AI Management</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Tasks" />
          <Tab label="Agents" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <Button startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Task</Button>
        {renderList(tasks, 'task')}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <Button startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Agent</Button>
        {renderList(agents, 'agent')}
      </TabPanel>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEditing ? 'Edit' : 'Add'} {tabValue === 0 ? 'Task' : 'Agent'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="standard"
            value={currentItem?.name || ''}
            onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="standard"
            value={currentItem?.description || ''}
            onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default IAManagementPage;
