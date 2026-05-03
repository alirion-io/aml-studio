/**
 * AML Studio — Repository Overview Page (P-03)
 */

import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
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
import { useStore, useT } from '../store/store';
import { ARTEFACT_KINDS, KIND_PLURAL_LABELS, KIND_URL_SEGMENTS } from '../types/artefact';
import { kindColors } from '../theme/tokens';
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
  const [connectOpen, setConnectOpen] = React.useState(false);

  const repositories = useStore((s) => s.repositories);
  const openPushPanel = useStore((s) => s.openPushPanel);
  const loadArtefactsFromFiles = useStore((s) => s.loadArtefactsFromFiles);
  const addToast = useStore((s) => s.addToast);

  const repo = repositories.find((r) => r.id === repoId);
  if (!repo) return null;

  const artefactCounts = ARTEFACT_KINDS.map((kind) => ({
    kind,
    label: KIND_PLURAL_LABELS[kind],
    count: repo.artefacts.filter((a) => a.kind === kind).length,
    path: `/${repoId}/${KIND_URL_SEGMENTS[kind]}`,
    color: kindColors[kind],
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

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="h1">{t.overview}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {repo.fullName ?? repo.name}
            {!repo.isLocal && ` · ${providerName}`}
            {repo.lastSyncedAt && ` · ${t.lastSynced} ${relativeTime(repo.lastSyncedAt)}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!repo.isLocal && (
            <Button variant="outlined" size="small" startIcon={<ArrowDownwardIcon fontSize="small" />}>
              {t.pull}
            </Button>
          )}
          {staged.length > 0 && (
            <Button variant="contained" size="small" endIcon={<ArrowUpwardIcon fontSize="small" />} onClick={openPushPanel}>
              {t.publish}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
        {/* Artefacts panel */}
        <Card elevation={0}>
          <CardContent>
            <Typography variant="caption" sx={{ fontWeight: 400, fontSize: '11px', letterSpacing: '0.06em', color: theme.palette.text.secondary }}>
              ARTEFACTS
            </Typography>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              {artefactCounts.map(({ kind, label, count, path, color }) => (
                <Grid size={{ xs: 6, sm: 4 }} key={kind}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                    onClick={() => navigate(path)}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                    <Typography variant="body2" color={count === 0 ? 'text.secondary' : 'text.primary'}>
                      {label}:{' '}
                      <strong style={{ color: count === 0 ? undefined : color }}>
                        {count}
                      </strong>
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Sync status / Git connection */}
        <Card elevation={0}>
          <CardContent>
            {repo.isLocal ? (
              <>
                <Typography variant="caption" sx={{ fontWeight: 400, fontSize: '11px', letterSpacing: '0.06em', color: theme.palette.text.secondary }}>
                  GIT CONNECTION
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CloudOffIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                  <Typography variant="body2" color="text.secondary">
                    {t.notConnectedGit}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t.filesStoredLocally}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1.5 }}
                  onClick={() => setConnectOpen(true)}
                >
                  {t.connectToGit}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '11px', letterSpacing: '0.06em', color: theme.palette.text.secondary }}>
                  {t.syncStatus}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {(() => {
                    const statusConfig: Record<string, { label: string; color: string; Icon: React.ComponentType<{ sx?: object }> | null }> = {
                      'up-to-date': { label: 'Up to date', color: theme.palette.success.main, Icon: CheckCircleIcon },
                      behind: { label: repo.syncBehindCount ? `${repo.syncBehindCount} behind` : 'Behind', color: theme.palette.warning.main, Icon: ArrowDownwardIcon },
                      ahead: { label: `${repo.syncAheadCount ?? repo.stagedChanges.length} unpushed`, color: theme.palette.info.main, Icon: ArrowUpwardIcon },
                      conflict: { label: 'Conflict', color: theme.palette.error.main, Icon: ErrorIcon },
                      'not-connected': { label: 'Not connected', color: theme.palette.text.secondary, Icon: CloudOffIcon },
                      syncing: { label: 'Syncing…', color: theme.palette.primary.main, Icon: null },
                    };
                    const sc = statusConfig[repo.syncStatus] ?? statusConfig['not-connected'];
                    return (
                      <Chip
                        icon={sc.Icon ? <sc.Icon sx={{ fontSize: 13, color: sc.color }} /> : undefined}
                        label={sc.label}
                        size="small"
                        sx={{
                          backgroundColor: `${sc.color}1A`,
                          color: sc.color,
                          borderRadius: '999px',
                          fontSize: '11px',
                          '& .MuiChip-icon': { color: sc.color },
                        }}
                      />
                    );
                  })()}
                  {repo.defaultBranch && (
                    <Typography variant="caption" color="text.secondary">
                      Branch: {repo.defaultBranch}
                    </Typography>
                  )}
                </Box>
                {repo.htmlUrl && (
                  <Link href={isSafeUrl(repo.htmlUrl) ? repo.htmlUrl : '#'} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, mt: 1 }}>
                    {t.viewOn(providerName)}
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Local changes panel */}
        {staged.length > 0 && (
          <Card elevation={0}>
            <CardContent>
              <Typography variant="caption" sx={{ fontWeight: 400, fontSize: '11px', letterSpacing: '0.06em', color: theme.palette.text.secondary }}>
                {t.localChanges}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t.localChangesCount(staged.length)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <List dense disablePadding>
                {staged.slice(0, MAX_STAGED_PREVIEW).map((c) => (
                  <ListItem key={c.artefactId} disablePadding>
                    <ListItemText
                      primary={`• ${c.filePath}`}
                      slotProps={{ primary: { sx: { fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' } } }}
                    />
                  </ListItem>
                ))}
                {staged.length > MAX_STAGED_PREVIEW && (
                  <ListItem disablePadding>
                    <ListItemText
                      primary={`+ ${staged.length - MAX_STAGED_PREVIEW} more files`}
                      slotProps={{ primary: { sx: { fontSize: '0.75rem', color: 'text.secondary' } } }}
                    />
                  </ListItem>
                )}
              </List>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" size="small" endIcon={<ArrowUpwardIcon fontSize="small" />} onClick={openPushPanel}>
                  {t.reviewAndPublish}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Import & Export cards */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h3">{t.importTitle}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                  {t.importDescription}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadIcon fontSize="small" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t.importFiles}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FolderOpenIcon fontSize="small" />}
                  onClick={() => folderInputRef.current?.click()}
                  sx={{ ml: 1 }}
                >
                  {t.importFolder}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".md"
                  style={{ display: 'none' }}
                  onChange={handleImportFiles}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory is not in React's typings
                  webkitdirectory=""
                  style={{ display: 'none' }}
                  onChange={handleImportFiles}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card elevation={0}>
              <CardContent>
                <Typography variant="h3">{t.downloadZipTitle}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                  {t.downloadZipDescription}
                </Typography>
                <Button variant="outlined" size="small" startIcon={<DownloadIcon fontSize="small" />} onClick={handleDownloadZip}>
                  {t.downloadZip}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <AddRepositoryModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </Box>
  );
};
