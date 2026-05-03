/**
 * AML Studio — Status Badge Component
 * Displays an artefact lifecycle status with both a colour cue and an icon
 * so the status is decodable without relying on colour alone (a11y).
 */

import React from 'react';
import { Chip, useTheme } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { ArtefactStatus } from '../../types/artefact';
import { semanticTokens } from '../../theme/tokens';

interface StatusBadgeProps {
  status: ArtefactStatus | 'in-review';
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const theme = useTheme();

  const isLight = theme.palette.mode === 'light';
  // Chip pattern uses ${color}1A bg (10% tint on theme surface). Light-mode needs
  // darker shades so text meets 4.5:1 on the near-white tinted chip background;
  // dark mode needs lighter shades so text meets 4.5:1 on the near-dark tinted bg.
  const config: Record<string, { color: string; label: string; Icon: React.ComponentType<{ sx?: object }> }> = {
    active:     { color: isLight ? '#1a6b4e' : theme.palette.success.main, label: 'Active', Icon: CheckCircleOutlineIcon },
    draft:      { color: isLight ? '#8a5400' : theme.palette.warning.main, label: 'Draft', Icon: EditOutlinedIcon },
    deprecated: { color: theme.palette.text.secondary, label: 'Deprecated', Icon: ArchiveOutlinedIcon },
    disabled:   { color: theme.palette.text.disabled, label: 'Disabled', Icon: BlockOutlinedIcon },
    'in-review':{ color: isLight ? semanticTokens.light.review : semanticTokens.dark.review, label: 'In Review', Icon: VisibilityOutlinedIcon },
  };

  const { color, label, Icon } = config[status] ?? config['draft'];
  const iconSize = size === 'small' ? 13 : 15;

  return (
    <Chip
      icon={<Icon sx={{ fontSize: iconSize, color }} />}
      label={label}
      size={size}
      sx={{
        backgroundColor: `${color}1A`,
        color: color,
        border: 'none',
        borderRadius: '999px',
        fontWeight: 500,
        fontSize: size === 'small' ? '11px' : '12px',
        height: size === 'small' ? '22px' : '26px',
        '& .MuiChip-label': { px: 0.75 },
        '& .MuiChip-icon': { ml: 0.75, mr: -0.25, color },
      }}
    />
  );
};
