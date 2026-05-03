/**
 * AML Studio — Artefact History Tab (P-05 §History)
 * Shows Git commit history. For local repos: empty state.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/LockOutlined';
import type { Artefact, Repository } from '../../types/artefact';
import { useT } from '../../store/store';
import { absoluteDate, relativeTime } from '../../utils/relativeTime';

interface Props {
  artefact: Artefact;
  repo: Repository;
}

export const ArtefactHistoryTab: React.FC<Props> = ({ artefact, repo }) => {
  const t = useT();
  const theme = useTheme();

  if (repo.isLocal) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <LockIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">{t.historyNotAvailableLocal}</Typography>
      </Box>
    );
  }

  if (!artefact.history || artefact.history.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <HistoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">{t.noHistory}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t.commitHistory}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {artefact.history.map((commit, idx) => (
          <Box key={commit.sha} sx={{ display: 'flex', gap: 2, pb: 2 }}>
            {/* Timeline dot + line */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.25 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${theme.palette.primary.main}`, flexShrink: 0 }} />
              {idx < artefact.history!.length - 1 && (
                <Box sx={{ width: 1, flex: 1, backgroundColor: theme.palette.divider, mt: 0.5 }} />
              )}
            </Box>
            {/* Content */}
            <Box sx={{ flex: 1, pb: 0.5 }}>
              <Typography variant="body2">{commit.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                {commit.author} · {relativeTime(commit.date)} ({absoluteDate(commit.date)})
              </Typography>
              <Typography
                variant="caption"
                sx={{ ml: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', color: 'text.disabled' }}
              >
                {commit.sha.slice(0, 7)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
