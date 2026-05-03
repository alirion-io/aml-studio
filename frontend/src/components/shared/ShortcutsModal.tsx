/**
 * AML Studio — Keyboard shortcuts cheatsheet
 * Bound to "?" globally (TopBar) so users can discover the keyboard surface.
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useT } from '../../store/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
        height: 22,
        px: 0.75,
        borderRadius: '4px',
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        fontWeight: 500,
      }}
    >
      {children}
    </Box>
  );
};

const Row: React.FC<{ keys: React.ReactNode; description: string }> = ({ keys, description }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75 }}>
    <Typography variant="body2">{description}</Typography>
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>{keys}</Box>
  </Box>
);

export const ShortcutsModal: React.FC<Props> = ({ open, onClose }) => {
  const theme = useTheme();
  const t = useT();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t.shortcutsTitle ?? 'Keyboard shortcuts'}
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1.5 }}>
        <Typography variant="caption" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, color: theme.palette.text.secondary, mb: 0.5 }}>
          Global
        </Typography>
        <Row
          description="Search artefacts"
          keys={<><Kbd>{mod}</Kbd><Kbd>K</Kbd></>}
        />
        <Row
          description="Save current artefact"
          keys={<><Kbd>{mod}</Kbd><Kbd>S</Kbd></>}
        />
        <Row
          description="Show this cheatsheet"
          keys={<Kbd>?</Kbd>}
        />
        <Row
          description="Close dialogs / cancel"
          keys={<Kbd>Esc</Kbd>}
        />

        <Typography variant="caption" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, color: theme.palette.text.secondary, mt: 2, mb: 0.5 }}>
          Search
        </Typography>
        <Row
          description="Move between results"
          keys={<><Kbd>↑</Kbd><Kbd>↓</Kbd></>}
        />
        <Row
          description="Open the highlighted result"
          keys={<Kbd>↵</Kbd>}
        />
      </DialogContent>
    </Dialog>
  );
};
