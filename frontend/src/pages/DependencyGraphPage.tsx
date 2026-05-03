/**
 * AML Studio — Dependency Graph Page (P-10)
 * Full-repository dependency graph view.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useT } from '../store/store';
import { DependencyGraph } from '../components/graph/DependencyGraph';

export const DependencyGraphPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const t = useT();

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h1" sx={{ fontWeight: 300, mb: 2 }}>{t.dependencyGraph}</Typography>
      <Box sx={{ flex: 1 }}>
        <DependencyGraph repoId={repoId!} />
      </Box>
    </Box>
  );
};
