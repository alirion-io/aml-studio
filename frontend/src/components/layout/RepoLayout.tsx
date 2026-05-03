/**
 * AML Studio — Repository Workspace Layout
 * Wraps all repository-scoped pages with the sidebar, top bar, breadcrumb,
 * and unpushed-changes banner.
 */

import React, { useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  Typography,
  useTheme,
  IconButton,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useStore, useT } from '../../store/store';
import { PushPanel } from '../push/PushPanel';
import {
  KIND_PLURAL_LABELS,
  KIND_URL_SEGMENTS,
  type ArtefactKind,
} from '../../types/artefact';
import { kindColors } from '../../theme/tokens';

const URL_SEGMENT_TO_KIND = Object.entries(KIND_URL_SEGMENTS).reduce<Record<string, ArtefactKind>>(
  (acc, [k, segment]) => {
    acc[segment] = k as ArtefactKind;
    return acc;
  },
  {}
);

const SECTION_LABEL: Record<string, string> = {
  overview: 'Overview',
  'pull-requests': 'Pull requests',
  graph: 'Dependency graph',
  settings: 'Settings',
};

export const RepoLayout: React.FC = () => {
  const theme = useTheme();
  const { repoId } = useParams<{ repoId: string }>();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const repositories = useStore((s) => s.repositories);
  const openPushPanel = useStore((s) => s.openPushPanel);
  const closePushPanel = useStore((s) => s.closePushPanel);
  const isPushPanelOpen = useStore((s) => s.isPushPanelOpen);

  const activeRepo = repositories.find((r) => r.id === repoId);
  const stagedCount = activeRepo?.stagedChanges?.length ?? 0;
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Build breadcrumb items from the path
  const segments = location.pathname.split('/').filter(Boolean); // [repoId, section, artefactId, sub?]
  const sectionSegment = segments[1];
  const subSegment = segments[2];
  const subSubSegment = segments[3]; // "edit" | "history" | "dependencies" | undefined
  const isArtefactSegment = sectionSegment ? URL_SEGMENT_TO_KIND[sectionSegment] : undefined;

  const SUB_SEGMENT_LABEL: Record<string, string> = {
    edit: 'Edit',
    history: 'History',
    dependencies: 'Dependencies',
  };

  const sectionLabel = sectionSegment
    ? isArtefactSegment
      ? KIND_PLURAL_LABELS[URL_SEGMENT_TO_KIND[sectionSegment]]
      : SECTION_LABEL[sectionSegment] ?? sectionSegment
    : undefined;

  const sectionPath = sectionSegment ? `/${repoId}/${sectionSegment}` : undefined;

  let leafLabel: string | undefined;
  let leafPath: string | undefined; // set when leafLabel should be a link (i.e. a sub-page is active)
  if (isArtefactSegment && subSegment && repoId) {
    if (subSegment === 'new') {
      leafLabel = `New ${KIND_PLURAL_LABELS[URL_SEGMENT_TO_KIND[sectionSegment]].slice(0, -1)}`;
    } else {
      const artefact = activeRepo?.artefacts.find(
        (a) => a.id === subSegment && a.kind === URL_SEGMENT_TO_KIND[sectionSegment]
      );
      leafLabel = artefact?.displayName || subSegment;
      // When there's a sub-page (edit/history/…), the artefact name becomes a link
      if (subSubSegment) {
        leafPath = `/${repoId}/${sectionSegment}/${subSegment}`;
      }
    }
  }

  const subLeafLabel = subSubSegment ? (SUB_SEGMENT_LABEL[subSubSegment] ?? subSubSegment) : undefined;

  return (
    <Box sx={{ display: 'flex' }}>
      <TopBar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '56px',
          height: 'calc(100vh - 56px)',
          backgroundColor: theme.palette.background.default,
          overflowY: 'auto',
        }}
      >
        {/* Breadcrumb */}
        {sectionLabel && (
          <Box
            sx={{
              px: 4,
              pt: 2,
              pb: 0.5,
              backgroundColor: theme.palette.background.default,
            }}
          >
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" sx={{ color: theme.palette.text.disabled }} />}
              aria-label="breadcrumb"
              sx={{ fontSize: '12px' }}
            >
              <MuiLink
                component="button"
                onClick={() => navigate(`/${repoId}/overview`)}
                underline="hover"
                color="text.secondary"
                sx={{ fontSize: '12px' }}
              >
                {activeRepo?.name ?? repoId}
              </MuiLink>
              {sectionPath && sectionPath !== `/${repoId}/overview` && (
                leafLabel ? (
                  <MuiLink
                    component="button"
                    onClick={() => navigate(sectionPath)}
                    underline="hover"
                    color="text.secondary"
                    sx={{ fontSize: '12px' }}
                  >
                    {sectionLabel}
                  </MuiLink>
                ) : (
                  <Typography color="text.primary" sx={{ fontSize: '12px', fontWeight: 500 }}>{sectionLabel}</Typography>
                )
              )}
              {leafLabel && (
                leafPath ? (
                  <MuiLink
                    component="button"
                    onClick={() => navigate(leafPath!)}
                    underline="hover"
                    color="text.secondary"
                    sx={{ fontSize: '12px' }}
                  >
                    {leafLabel}
                  </MuiLink>
                ) : (
                  <Typography color="text.primary" sx={{ fontSize: '12px', fontWeight: 500 }}>
                    {leafLabel}
                  </Typography>
                )
              )}
              {subLeafLabel && (
                <Typography color="text.primary" sx={{ fontSize: '12px', fontWeight: 500 }}>
                  {subLeafLabel}
                </Typography>
              )}
            </Breadcrumbs>
          </Box>
        )}

        {/* Kind colour gradient accent — shown on all artefact-kind pages */}
        {isArtefactSegment && (
          <Box
            sx={{
              height: '3px',
              background: `linear-gradient(to right, ${kindColors[isArtefactSegment]}, transparent)`,
            }}
          />
        )}

        {/* Unpushed changes banner — dismissible */}
        {stagedCount > 0 && !bannerDismissed && (
          <Alert
            severity="info"
            icon={false}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Button
                  size="small"
                  color="inherit"
                  onClick={openPushPanel}
                  sx={{ whiteSpace: 'nowrap', fontSize: '12px' }}
                >
                  {t.reviewAndPublish}
                </Button>
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Close"
                  sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{
              borderRadius: 0,
              py: 0.5,
              fontSize: '13px',
              backgroundColor: theme.palette.info.main + '1A',
              color: theme.palette.info.main,
              '& .MuiAlert-action': { alignItems: 'center', pt: 0 },
            }}
          >
            {t.unpushedChangesBanner(stagedCount)}
          </Alert>
        )}

        <Outlet />
      </Box>

      {/* Push panel slide-over */}
      {isPushPanelOpen && repoId && <PushPanel repoId={repoId} onClose={closePushPanel} />}
    </Box>
  );
};
