/**
 * AML Studio — Kind Badge Component
 * Displays an artefact kind with its brand colour as a pill chip.
 * Pairs colour with a leading icon so the kind is decodable without colour
 * (a11y) and provides a default tooltip describing what the kind is.
 */

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import type { ArtefactKind } from '../../types/artefact';
import { KIND_LABELS } from '../../types/artefact';
import { kindChipColors, kindColors } from '../../theme/theme';
import { useTheme } from '@mui/material';

interface KindBadgeProps {
  kind: ArtefactKind;
  size?: 'small' | 'medium';
  /** Override default tooltip text. Pass `false` to disable the tooltip. */
  tooltip?: string | false;
}

const KIND_ICONS: Record<ArtefactKind, React.ComponentType<{ sx?: object; fontSize?: 'small' | 'medium' }>> = {
  agent: SmartToyOutlinedIcon,
  tool: BuildOutlinedIcon,
  kb: LibraryBooksOutlinedIcon,
  iam: VpnKeyOutlinedIcon,
  model: MemoryOutlinedIcon,
  collection: FolderSpecialOutlinedIcon,
  guardrail: GppGoodOutlinedIcon,
};

const KIND_DESCRIPTIONS: Record<ArtefactKind, string> = {
  agent: 'An agent definition: instructions, tools, model, and guardrails an LLM uses to act on a task.',
  tool: 'A callable capability the agent can invoke (HTTP, function, MCP, etc.).',
  kb: 'A knowledge base — documents or vectors the agent retrieves from at runtime.',
  iam: 'An IAM role describing the credentials and permissions an agent runs with.',
  model: 'A model configuration: provider, parameters, and prompts.',
  collection: 'A memory collection groups agents that share long-term memory.',
  guardrail: 'A policy that constrains an agent\'s inputs or outputs.',
};

export const KindBadge: React.FC<KindBadgeProps> = ({ kind, size = 'small', tooltip }) => {
  const theme = useTheme();
  const chipColor = kindChipColors[theme.palette.mode][kind];
  const bgColor = kindColors[kind]; // base colour for the tinted bg (decorative)
  const label = KIND_LABELS[kind];
  const Icon = KIND_ICONS[kind];

  const chip = (
    <Chip
      icon={<Icon sx={{ fontSize: size === 'small' ? 13 : 15, color: chipColor }} />}
      label={label}
      size={size}
      sx={{
        backgroundColor: `${bgColor}1A`, // ~10% opacity tint
        color: chipColor,
        border: 'none',
        borderRadius: '999px',
        fontWeight: 500,
        fontSize: size === 'small' ? '11px' : '12px',
        height: size === 'small' ? '22px' : '26px',
        '& .MuiChip-label': { px: 0.75 },
        '& .MuiChip-icon': { ml: 0.75, mr: -0.25, color: chipColor },
      }}
    />
  );

  if (tooltip === false) return chip;
  const tip = tooltip ?? KIND_DESCRIPTIONS[kind];
  return <Tooltip title={tip} arrow>{chip}</Tooltip>;
};
