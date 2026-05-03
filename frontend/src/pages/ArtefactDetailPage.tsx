/**
 * AML Studio — Artefact Detail Page (P-05)
 * Split-panel layout: compact list on left, detail on right.
 * Three tabs: Overview, Dependencies (agents/iam only), History.
 * Editing is handled by ArtefactEditPage (full-width, no panel).
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  useTheme,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import { useStore, useT } from '../store/store';
import type { ArtefactKind } from '../types/artefact';
import { KIND_PLURAL_LABELS, KIND_URL_SEGMENTS } from '../types/artefact';
import { KindBadge } from '../components/shared/KindBadge';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ArtefactOverviewTab } from '../components/artefact/ArtefactOverviewTab';
import { DependencyGraph } from '../components/graph/DependencyGraph';
import { ArtefactHistoryTab } from '../components/artefact/ArtefactHistoryTab';
import { UsedByTab } from '../components/artefact/UsedByTab';
import { ArtefactListPanel } from '../components/artefact/ArtefactListPanel';

interface Props {
  kind: ArtefactKind;
}

export const ArtefactDetailPage: React.FC<Props> = ({ kind }) => {
  const theme = useTheme();
  const { repoId, artefactId } = useParams<{ repoId: string; artefactId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  const repositories = useStore((s) => s.repositories);
  const repo = repositories.find((r) => r.id === repoId);

  const artefact = repo?.artefacts.find((a) => a.id === artefactId && a.kind === kind) ?? null;
  const allArtefacts = repo?.artefacts.filter((a) => a.kind === kind) ?? [];

  const hasDependencies = kind === 'agent' || kind === 'iam';
  const tabIndices = {
    overview: 0,
    dependencies: hasDependencies ? 1 : -1,
    usedBy: hasDependencies ? 2 : 1,
    history: hasDependencies ? 3 : 2,
  };

  const initialTab = (() => {
    const p = location.pathname;
    if (p.endsWith('/dependencies')) return hasDependencies ? tabIndices.dependencies : 0;
    if (p.endsWith('/history')) return tabIndices.history;
    return 0;
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [scrolled, setScrolled] = useState(false);
  const handleContentScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrolled((e.currentTarget as HTMLElement).scrollTop > 24);
  }, []);

  const urlSegment = KIND_URL_SEGMENTS[kind];
  const kindLabel = KIND_PLURAL_LABELS[kind];

  if (!repo) return null;
  if (!artefact) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Artefact not found: {artefactId}</Typography>
        <Button onClick={() => navigate(`/${repoId}/${urlSegment}`)} sx={{ mt: 2 }}>
          Back to {kindLabel}
        </Button>
      </Box>
    );
  }

  // Description from meta fields
  const fm = artefact.frontMatter;
  const description: string =
    (fm.meta?.description as string) ||
    (fm.meta?.summary as string) ||
    (fm.meta?.['one-line_summary'] as string) ||
    '';

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: compact artefact list panel */}
      <ArtefactListPanel
        kind={kind}
        artefacts={allArtefacts}
        selectedId={artefact.id}
        repoId={repoId!}
      />

      {/* Right: detail */}
      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ── Top info bar ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 3,
            pt: 2.5,
            pb: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            flexShrink: 0,
          }}
        >
          <KindBadge kind={kind} />
          <StatusBadge status={artefact.status as 'active' | 'draft' | 'deprecated' | 'disabled'} />
          {artefact.isDirty && (() => {
            const hasErrors = artefact.validationErrors.some(e => e.severity === 'error');
            const color = hasErrors ? theme.palette.error.main : theme.palette.warning.main;
            return (
              <Chip
                label="Modified"
                size="small"
                sx={{
                  fontSize: '11px',
                  height: '22px',
                  backgroundColor: `${color}1A`,
                  color,
                  fontWeight: 500,
                  borderRadius: '999px',
                }}
              />
            );
          })()}
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => navigate(`/${repoId}/${urlSegment}/${artefact.id}/edit`)}
            sx={{ fontSize: '13px' }}
          >
            {t.edit}
          </Button>
        </Box>

        {/* ── Artefact header ── */}
        <Box sx={{
          px: 3,
          pt: scrolled ? 1 : 2,
          pb: scrolled ? 0.75 : 1.5,
          flexShrink: 0,
          transition: 'padding 0.2s ease',
        }}>
          {/* Name */}
          <Typography variant="h1" sx={{
            fontWeight: 600,
            fontSize: scrolled ? '15px' : '24px',
            mb: scrolled ? 0.25 : 0.75,
            transition: 'font-size 0.2s ease, margin-bottom 0.2s ease',
            lineHeight: 1.3,
          }}>
            {artefact.displayName || artefact.id}
          </Typography>

          {/* id · version · owner */}
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '12px',
              color: theme.palette.text.secondary,
              mb: (!scrolled && description) ? 1.5 : 0,
              transition: 'margin-bottom 0.2s ease',
            }}
          >
            {artefact.id}
            {artefact.versionLabel && <span> · {artefact.versionLabel}</span>}
            {artefact.owner && <span> · {artefact.owner}</span>}
          </Typography>

          {/* Description — hidden when scrolled */}
          <Box sx={{
            maxHeight: scrolled ? 0 : '200px',
            opacity: scrolled ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-height 0.2s ease, opacity 0.15s ease',
          }}>
            {description && (
              <Typography
                variant="body1"
                sx={{ fontSize: '14px', lineHeight: 1.6, color: theme.palette.text.primary, mb: 1.5, mt: 0 }}
              >
                {description}
              </Typography>
            )}

            {/* Tags */}
            {artefact.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {artefact.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{ fontSize: '11px', height: '22px', borderRadius: '4px' }}
                  />
                ))}
              </Box>
            )}

            {/* Validation issues */}
            {artefact.validationErrors.length > 0 && (
              <Box sx={{ mt: artefact.tags.length > 0 ? 1 : 0 }}>
                {artefact.validationErrors.map((e, i) => (
                  <Typography
                    key={i}
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      color: e.severity === 'error' ? 'error.main' : 'warning.main',
                    }}
                  >
                    {e.message}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Tabs ── */}
        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 3, flexShrink: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': { fontSize: '13px', fontWeight: 400, textTransform: 'none', minHeight: 40, py: 0 },
            }}
          >
            <Tab label={t.tabOverview} />
            {hasDependencies && <Tab label={t.tabDependencies} />}
            <Tab label={t.tabUsedBy} />
            <Tab label={t.tabHistory} />
          </Tabs>
        </Box>

        {/* ── Tab content ── */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }} onScroll={handleContentScroll}>
          {activeTab === tabIndices.overview && (
            <ArtefactOverviewTab artefact={artefact} repoId={repoId!} />
          )}
          {hasDependencies && activeTab === tabIndices.dependencies && (
            <DependencyGraph repoId={repoId!} focusArtefactId={artefact.id} />
          )}
          {activeTab === tabIndices.usedBy && (
            <UsedByTab artefact={artefact} repoId={repoId!} />
          )}
          {activeTab === tabIndices.history && (
            <ArtefactHistoryTab artefact={artefact} repo={repo} />
          )}
        </Box>
      </Box>
    </Box>
  );
};
