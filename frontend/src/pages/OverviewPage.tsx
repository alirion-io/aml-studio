/**
 * AML Studio — Repository Overview Page (P-03)
 */

import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Collapse,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Link,
  useTheme,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ErrorIcon from '@mui/icons-material/Error';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useStore, useT } from '../store/store';
import { ARTEFACT_KINDS, KIND_PLURAL_LABELS, KIND_URL_SEGMENTS } from '../types/artefact';
import { kindColors, kindChipColors } from '../theme/tokens';
import { relativeTime } from '../utils/relativeTime';
import { AddRepositoryModal } from '../components/repository/AddRepositoryModal';

function isSafeUrl(url: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(url).protocol); }
  catch { return false; }
}

export const OverviewPage: React.FC = () => {
  const theme = useTheme();
  const { repoId } = useParams<{ repoId: string }>();
  const t = useT();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);

  const repositories = useStore((s) => s.repositories);
  const openPushPanel = useStore((s) => s.openPushPanel);
  const loadArtefactsFromFiles = useStore((s) => s.loadArtefactsFromFiles);
  const addToast = useStore((s) => s.addToast);

  const repo = repositories.find((r) => r.id === repoId);
  if (!repo) return null;

  const mode = theme.palette.mode as 'light' | 'dark';
  const artefactCounts = ARTEFACT_KINDS.map((kind) => ({
    kind,
    label: KIND_PLURAL_LABELS[kind],
    count: repo.artefacts.filter((a) => a.kind === kind).length,
    path: `/${repoId}/${KIND_URL_SEGMENTS[kind]}`,
    dotColor: kindColors[kind],
    textColor: kindChipColors[mode][kind],
  }));

  const MAX_STAGED_PREVIEW = 5;
  const staged = repo.stagedChanges;

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const parsed: { path: string; content: string }[] = [];
    for (const file of files) {
      const content = await file.text();
      // webkitRelativePath includes the top-level selected folder name as the first segment;
      // strip it so paths are relative to the repo root (e.g. "agents/my-agent.agent.md").
      let path = file.name;
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        path = parts.slice(1).join('/') || file.name;
      }
      parsed.push({ path, content });
    }
    loadArtefactsFromFiles(repo.id, parsed);
    addToast({ type: 'success', message: `Imported ${parsed.length} file${parsed.length === 1 ? '' : 's'}.` });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleDownloadZip = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    repo.artefacts.forEach((a) => zip.file(a.filePath, a.rawContent));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${repo.name}-aml-artefacts.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const providerName = repo.provider === 'github' ? 'GitHub' : repo.provider === 'bitbucket' ? 'Bitbucket' : 'Local';

  const statusConfig: Record<string, { label: string; color: string; Icon: React.ComponentType<{ sx?: object }> | null }> = {
    'up-to-date': { label: 'Up to date', color: theme.palette.success.main, Icon: CheckCircleIcon },
    behind: { label: repo.syncBehindCount ? `${repo.syncBehindCount} behind` : 'Behind', color: theme.palette.warning.main, Icon: ArrowDownwardIcon },
    ahead: { label: `${repo.syncAheadCount ?? repo.stagedChanges.length} unpushed`, color: theme.palette.info.main, Icon: ArrowUpwardIcon },
    conflict: { label: 'Conflict — resolve before syncing', color: theme.palette.error.main, Icon: ErrorIcon },
    'not-connected': { label: 'Not connected', color: theme.palette.text.secondary, Icon: CloudOffIcon },
    syncing: { label: 'Syncing…', color: theme.palette.primary.main, Icon: null },
  };
  const sc = statusConfig[repo.syncStatus] ?? statusConfig['not-connected'];

  return (
    <Box sx={{ p: 4, maxWidth: 720, mx: 'auto' }}>
      {/* Page header */}
      <Typography variant="h1" sx={{ mb: 0.5 }}>{t.overview}</Typography>
      <Typography variant="body2" color="text.secondary">
        {repo.fullName ?? repo.name}
        {!repo.isLocal && ` · ${providerName}`}
        {repo.lastSyncedAt && ` · ${t.lastSynced} ${relativeTime(repo.lastSyncedAt)}`}
      </Typography>

      {/* ── Lead: Sync status ── */}
      <Box
        sx={{
          mt: 3,
          p: 2.5,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '8px',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {repo.isLocal ? (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudOffIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{t.notConnectedGit}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t.filesStoredLocally}
              </Typography>
            </Box>
            <Button size="small" variant="outlined" onClick={() => setConnectOpen(true)} sx={{ flexShrink: 0 }}>
              {t.connectToGit}
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  icon={sc.Icon ? <sc.Icon sx={{ fontSize: 13, color: sc.color }} /> : undefined}
                  label={sc.label}
                  size="small"
                  sx={{
                    backgroundColor: `${sc.color}1A`,
                    color: sc.color,
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: sc.color },
                  }}
                />
                {repo.defaultBranch && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {repo.defaultBranch}
                  </Typography>
                )}
                {repo.htmlUrl && (
                  <Link href={isSafeUrl(repo.htmlUrl) ? repo.htmlUrl : '#'} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                    {t.viewOn(providerName)}
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </Link>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" startIcon={<ArrowDownwardIcon fontSize="small" />}>
                  {t.pull}
                </Button>
                {staged.length > 0 && (
                  <Button variant="contained" size="small" endIcon={<ArrowUpwardIcon fontSize="small" />} onClick={openPushPanel}>
                    {t.reviewAndPublish}
                  </Button>
                )}
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* ── Artefacts summary row ── */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', color: theme.palette.text.secondary }}>
          {t.artefacts}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {artefactCounts.map(({ kind, label, count, path, dotColor, textColor }) => (
            <Box
              key={kind}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer' }}
              onClick={() => navigate(path)}
            >
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: count === 0 ? 'text.secondary' : 'text.primary' }}>
                {label}:{' '}
                <Box component="strong" sx={{ color: count === 0 ? undefined : textColor }}>
                  {count}
                </Box>
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Local changes ── */}
      {staged.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', color: theme.palette.text.secondary }}>
              {t.localChanges}
            </Typography>
          </Box>
          <List dense disablePadding sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '6px', overflow: 'hidden' }}>
            {staged.slice(0, MAX_STAGED_PREVIEW).map((c, i) => (
              <ListItem
                key={c.artefactId}
                disablePadding
                sx={{ px: 2, py: 0.75, borderBottom: i < Math.min(staged.length, MAX_STAGED_PREVIEW) - 1 ? `1px solid ${theme.palette.divider}` : 'none' }}
              >
                <ListItemText
                  primary={c.filePath}
                  slotProps={{ primary: { sx: { fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' } } }}
                />
              </ListItem>
            ))}
            {staged.length > MAX_STAGED_PREVIEW && (
              <ListItem disablePadding sx={{ px: 2, py: 0.75 }}>
                <ListItemText
                  primary={`+ ${staged.length - MAX_STAGED_PREVIEW} ${t.more}`}
                  slotProps={{ primary: { sx: { fontSize: '12px', color: 'text.secondary' } } }}
                />
              </ListItem>
            )}
          </List>
        </Box>
      )}

      {/* ── Data section (import / export) — collapsed by default ── */}
      <Box sx={{ mt: 3 }}>
        <Box
          onClick={() => setDataOpen((v) => !v)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            userSelect: 'none',
            '&:hover': { opacity: 0.75 },
          }}
        >
          <ExpandMoreIcon
            sx={{
              fontSize: 18,
              color: theme.palette.text.secondary,
              transform: dataOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.15s ease-out',
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', color: theme.palette.text.secondary }}>
            {t.dataSection}
          </Typography>
        </Box>

        <Collapse in={dataOpen}>
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5, pl: 0.5 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{t.importTitle}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t.importDescription}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" startIcon={<UploadIcon fontSize="small" />} onClick={() => fileInputRef.current?.click()}>
                  {t.importFiles}
                </Button>
                <Button variant="outlined" size="small" startIcon={<FolderOpenIcon fontSize="small" />} onClick={() => folderInputRef.current?.click()}>
                  {t.importFolder}
                </Button>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{t.downloadZipTitle}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t.downloadZipDescription}</Typography>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon fontSize="small" />} onClick={handleDownloadZip}>
                {t.downloadZip}
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>

      <input ref={fileInputRef} type="file" multiple accept=".md" style={{ display: 'none' }} onChange={handleImportFiles} />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is not in React's typings
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={handleImportFiles}
      />

      <AddRepositoryModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </Box>
  );
};
