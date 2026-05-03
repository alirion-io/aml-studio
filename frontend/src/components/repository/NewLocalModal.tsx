/**
 * AML Studio — New Local Repository Modal (P-02b)
 * Creates a local-only repository with no Git remote.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useStore, useT } from '../../store/store';
import type { Repository } from '../../types/artefact';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const NewLocalModal: React.FC<Props> = ({ open, onClose }) => {
  const t = useT();
  const navigate = useNavigate();
  const addRepository = useStore((s) => s.addRepository);
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const addToast = useStore((s) => s.addToast);

  const [name, setName] = useState('');

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleCreate = () => {
    const id = crypto.randomUUID();
    const repo: Repository = {
      id,
      name: name.trim(),
      provider: 'local',
      isLocal: true,
      syncStatus: 'not-connected',
      reviewWorkflowEnabled: false,
      artefacts: [],
      stagedChanges: [],
    };
    addRepository(repo);
    setActiveRepo(id);
    addToast({ type: 'success', message: `Local repository "${name.trim()}" created.` });
    handleClose();
    navigate(`/${id}/overview`);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 300 }}>
        {t.newLocalTitle}
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label={t.newLocalNameLabel}
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText={t.newLocalNameHelp}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleCreate(); }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>{t.cancel}</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          {t.createLocalRepository}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
