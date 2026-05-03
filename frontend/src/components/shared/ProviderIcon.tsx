/**
 * AML Studio — Provider Icon
 * Inline SVGs for the supported providers so the visuals are consistent across
 * platforms (the previous emoji-based icons rendered differently per OS).
 */

import React from 'react';
import { Box } from '@mui/material';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';

type Provider = 'github' | 'bitbucket' | 'local' | 'public';

interface Props {
  provider: Provider;
  size?: number;
  /** Optional explicit colour. Defaults to currentColor for inline SVGs. */
  color?: string;
}

const GitHubMark: React.FC<{ size: number; color?: string }> = ({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color ?? 'currentColor'}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.55 0-.27-.01-.99-.02-1.94-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.71 0-1.26.45-2.29 1.18-3.1-.12-.3-.51-1.49.11-3.1 0 0 .96-.31 3.16 1.18a10.95 10.95 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.61.23 2.8.11 3.1.74.81 1.18 1.84 1.18 3.1 0 4.44-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16 0 1.56-.02 2.81-.02 3.19 0 .31.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

const BitbucketMark: React.FC<{ size: number; color?: string }> = ({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color ?? 'currentColor'}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2.65 3a.5.5 0 0 0-.5.59l2.85 16.81c.07.41.42.7.82.7h13.6c.31 0 .58-.22.64-.53L23.05 3.59a.5.5 0 0 0-.5-.59H2.65zm12.04 11.7H9.34l-1.06-5.55h7.43l-1.02 5.55z" />
  </svg>
);

export const ProviderIcon: React.FC<Props> = ({ provider, size = 18, color }) => {
  const sx = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: color ?? 'inherit' };

  if (provider === 'github') return <Box sx={sx}><GitHubMark size={size} color={color} /></Box>;
  if (provider === 'bitbucket') return <Box sx={sx}><BitbucketMark size={size} color={color ?? '#2684FF'} /></Box>;
  if (provider === 'local') return <Box sx={sx}><StorageOutlinedIcon sx={{ fontSize: size }} /></Box>;
  return <Box sx={sx}><PublicOutlinedIcon sx={{ fontSize: size }} /></Box>;
};
