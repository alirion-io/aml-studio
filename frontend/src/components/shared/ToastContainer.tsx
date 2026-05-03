/**
 * AML Studio — Toast Notification System
 * Renders the toast stack at the top-right of the viewport.
 * Uses MUI Snackbar/Alert — per design system §7.9.
 */

import React from 'react';
import { Alert, Snackbar, Stack } from '@mui/material';
import { useStore } from '../../store/store';

export const ToastContainer: React.FC = () => {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: 72,
        right: 16,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ position: 'relative', top: 'auto', right: 'auto', transform: 'none' }}
        >
          <Alert
            severity={toast.type}
            onClose={() => removeToast(toast.id)}
            variant="filled"
            sx={{ width: '100%', fontFamily: 'Sora, sans-serif', fontSize: '13px' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};
