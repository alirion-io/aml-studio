/**
 * AML Studio — App.tsx
 * Root component: theme provider, routing tree, global overlays.
 */
import { useMemo } from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { buildTheme } from './theme/theme';
import { useStore } from './store/store';
import { ToastContainer } from './components/shared/ToastContainer';

import { DashboardPage } from './pages/DashboardPage';
import { OverviewPage } from './pages/OverviewPage';
import { ArtefactListPage } from './pages/ArtefactListPage';
import { ArtefactDetailPage } from './pages/ArtefactDetailPage';
import { ArtefactEditPage } from './pages/ArtefactEditPage';
import { DependencyGraphPage } from './pages/DependencyGraphPage';
import { PullRequestsPage } from './pages/PullRequestsPage';
import { SettingsPage } from './pages/SettingsPage';
import { RepoLayout } from './components/layout/RepoLayout';

// createHashRouter is a data router, required for useBlocker support
const router = createHashRouter([
  { path: '/', element: <DashboardPage /> },
  {
    path: '/:repoId',
    element: <RepoLayout />,
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },

      { path: 'agents', element: <ArtefactListPage kind="agent" /> },
      { path: 'tools', element: <ArtefactListPage kind="tool" /> },
      { path: 'knowledge-bases', element: <ArtefactListPage kind="kb" /> },
      { path: 'iam-roles', element: <ArtefactListPage kind="iam" /> },
      { path: 'models', element: <ArtefactListPage kind="model" /> },
      { path: 'collections', element: <ArtefactListPage kind="collection" /> },
      { path: 'guardrails', element: <ArtefactListPage kind="guardrail" /> },

      { path: 'agents/new/edit', element: <ArtefactEditPage kind="agent" /> },
      { path: 'tools/new/edit', element: <ArtefactEditPage kind="tool" /> },
      { path: 'knowledge-bases/new/edit', element: <ArtefactEditPage kind="kb" /> },
      { path: 'iam-roles/new/edit', element: <ArtefactEditPage kind="iam" /> },
      { path: 'models/new/edit', element: <ArtefactEditPage kind="model" /> },
      { path: 'collections/new/edit', element: <ArtefactEditPage kind="collection" /> },
      { path: 'guardrails/new/edit', element: <ArtefactEditPage kind="guardrail" /> },

      { path: 'agents/:artefactId', element: <ArtefactDetailPage kind="agent" /> },
      { path: 'agents/:artefactId/edit', element: <ArtefactEditPage kind="agent" /> },
      { path: 'agents/:artefactId/dependencies', element: <ArtefactDetailPage kind="agent" /> },
      { path: 'agents/:artefactId/history', element: <ArtefactDetailPage kind="agent" /> },

      { path: 'tools/:artefactId', element: <ArtefactDetailPage kind="tool" /> },
      { path: 'tools/:artefactId/edit', element: <ArtefactEditPage kind="tool" /> },
      { path: 'tools/:artefactId/dependencies', element: <ArtefactDetailPage kind="tool" /> },
      { path: 'tools/:artefactId/history', element: <ArtefactDetailPage kind="tool" /> },

      { path: 'knowledge-bases/:artefactId', element: <ArtefactDetailPage kind="kb" /> },
      { path: 'knowledge-bases/:artefactId/edit', element: <ArtefactEditPage kind="kb" /> },
      { path: 'knowledge-bases/:artefactId/dependencies', element: <ArtefactDetailPage kind="kb" /> },
      { path: 'knowledge-bases/:artefactId/history', element: <ArtefactDetailPage kind="kb" /> },

      { path: 'iam-roles/:artefactId', element: <ArtefactDetailPage kind="iam" /> },
      { path: 'iam-roles/:artefactId/edit', element: <ArtefactEditPage kind="iam" /> },
      { path: 'iam-roles/:artefactId/dependencies', element: <ArtefactDetailPage kind="iam" /> },
      { path: 'iam-roles/:artefactId/history', element: <ArtefactDetailPage kind="iam" /> },

      { path: 'models/:artefactId', element: <ArtefactDetailPage kind="model" /> },
      { path: 'models/:artefactId/edit', element: <ArtefactEditPage kind="model" /> },
      { path: 'models/:artefactId/dependencies', element: <ArtefactDetailPage kind="model" /> },
      { path: 'models/:artefactId/history', element: <ArtefactDetailPage kind="model" /> },

      { path: 'collections/:artefactId', element: <ArtefactDetailPage kind="collection" /> },
      { path: 'collections/:artefactId/edit', element: <ArtefactEditPage kind="collection" /> },
      { path: 'collections/:artefactId/dependencies', element: <ArtefactDetailPage kind="collection" /> },
      { path: 'collections/:artefactId/history', element: <ArtefactDetailPage kind="collection" /> },

      { path: 'guardrails/:artefactId', element: <ArtefactDetailPage kind="guardrail" /> },
      { path: 'guardrails/:artefactId/edit', element: <ArtefactEditPage kind="guardrail" /> },
      { path: 'guardrails/:artefactId/dependencies', element: <ArtefactDetailPage kind="guardrail" /> },
      { path: 'guardrails/:artefactId/history', element: <ArtefactDetailPage kind="guardrail" /> },

      { path: 'pull-requests', element: <PullRequestsPage /> },
      { path: 'graph', element: <DependencyGraphPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function App() {
  const themeMode = useStore((s) => s.preferences.themeMode);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolvedMode = themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : themeMode;
  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
      <ToastContainer />
    </ThemeProvider>
  );
}

export default App;

