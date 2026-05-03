/**
 * AML Studio — Confirmation Dialog
 * Generic destructive-action confirmation dialog.
 * Uses MUI Dialog — per design system §7.8.
 */

import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ fontWeight: 300, fontSize: '18px' }}>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText sx={{ fontSize: '14px' }}>{description}</DialogContentText>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button autoFocus onClick={onCancel} variant="outlined">
        {cancelLabel}
      </Button>
      <Button
        onClick={onConfirm}
        variant={destructive ? 'outlined' : 'contained'}
        color={destructive ? 'error' : 'primary'}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);
