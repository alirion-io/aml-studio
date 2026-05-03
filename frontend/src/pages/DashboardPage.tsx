/**
 * AML Studio — Dashboard Page (P-01)
 * The entry point showing all repositories.
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ErrorIcon from '@mui/icons-material/Error';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useStore, useT } from '../store/store';
import type { Repository } from '../types/artefact';
import { ARTEFACT_KINDS, KIND_PLURAL_LABELS } from '../types/artefact';
import { relativeTime } from '../utils/relativeTime';
import { TopBar } from '../components/layout/TopBar';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { ProviderIcon } from '../components/shared/ProviderIcon';
import { AddRepositoryModal } from '../components/repository/AddRepositoryModal';
import { NewLocalModal } from '../components/repository/NewLocalModal';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';

const SyncBadge: React.FC<{ repo: Repository }> = ({ repo }) => {
  const theme = useTheme();

  const configs: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    'up-to-date': { icon: <CheckCircleIcon sx={{ fontSize: 14 }} />, color: theme.palette.success.main, label: 'Up to date' },
    'behind': { icon: <ArrowDownwardIcon sx={{ fontSize: 14 }} />, color: theme.palette.warning.main, label: repo.syncBehindCount ? `${repo.syncBehindCount} behind — Pull to update` : 'Behind' },
    'ahead': { icon: <ArrowUpwardIcon sx={{ fontSize: 14 }} />, color: theme.palette.info.main, label: `${repo.syncAheadCount ?? repo.stagedChanges.length} unpushed changes` },
    'conflict': { icon: <ErrorIcon sx={{ fontSize: 14 }} />, color: theme.palette.error.main, label: 'Conflict — resolve before syncing' },
    'not-connected': { icon: <CloudOffIcon sx={{ fontSize: 14 }} />, color: theme.palette.text.secondary, label: 'Not connected to Git' },
    'syncing': { icon: null, color: theme.palette.primary.main, label: 'Syncing…' },
  };

  const { icon, color, label } = configs[repo.syncStatus] ?? configs['not-connected'];

  return (
    <Chip
      icon={icon as React.ReactElement}
      label={label}
      size="small"
      sx={{
        backgroundColor: `${color}1A`,
        color,
        borderRadius: '999px',
        fontSize: '11px',
        '& .MuiChip-icon': { color },
      }}
    />
  );
};

const RepoCard: React.FC<{
  repo: Repository;
  onOpen: () => void;
  onDisconnect: () => void;
  onDownloadZip: () => void;
}> = ({ repo, onOpen, onDisconnect, onDownloadZip }) => {
  const theme = useTheme();
  const t = useT();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const counts = ARTEFACT_KINDS.map((kind) => ({
    label: KIND_PLURAL_LABELS[kind],
    count: repo.artefacts.filter((a) => a.kind === kind).length,
  }));

  return (
    <Card
      sx={{
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: '0 1px 3px rgba(14, 26, 31, 0.06), 0 1px 2px rgba(14, 26, 31, 0.04)',
          transform: 'translateY(-1px)',
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardActionArea onClick={onOpen} sx={{ flexGrow: 1, alignItems: 'flex-start' }}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h3" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'inline-flex' }}>
                  <ProviderIcon provider={repo.provider} size={16} />
                </Box>
                <Tooltip title={repo.fullName ?? repo.name}>
                  <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                    {repo.name}
                  </span>
                </Tooltip>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {repo.isLocal ? t.localOnly : (repo.fullName ?? '')}
              </Typography>
              {repo.lastSyncedAt && (
                <Typography variant="caption" color="text.secondary">
                  {t.lastSynced}: {relativeTime(repo.lastSyncedAt)}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={0.5}>
            {counts.map(({ label, count }) => (
              <Grid size={6} key={label}>
                <Typography variant="caption" sx={{ color: count === 0 ? theme.palette.text.secondary : theme.palette.text.primary, opacity: count === 0 ? 0.55 : 1 }}>
                  {label.split(' ')[0]}: <strong>{count}</strong>
                </Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </CardActionArea>

      <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SyncBadge repo={repo} />
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
          sx={{ ml: 1 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); onOpen(); }}>{t.open}</MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onDownloadZip(); }}>{t.download} ZIP</MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { setAnchorEl(null); onDisconnect(); }}
          sx={{ color: theme.palette.error.main }}
        >
          {t.disconnect}
        </MenuItem>
      </Menu>
    </Card>
  );
};

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const t = useT();
  const repositories = useStore((s) => s.repositories);
  const removeRepository = useStore((s) => s.removeRepository);
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const addToast = useStore((s) => s.addToast);

  const [disconnectTarget, setDisconnectTarget] = useState<Repository | null>(null);
  const [addRepoOpen, setAddRepoOpen] = useState(false);
  const [newLocalOpen, setNewLocalOpen] = useState(false);

  const handleOpen = (repo: Repository) => {
    setActiveRepo(repo.id);
    navigate(`/${repo.id}/overview`);
  };

  const handleDownloadZip = async (repo: Repository) => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    repo.artefacts.forEach((a) => {
      zip.file(a.filePath, a.rawContent);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${repo.name}-aml-artefacts.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDisconnectConfirm = () => {
    if (disconnectTarget) {
      removeRepository(disconnectTarget.id);
      setDisconnectTarget(null);
      addToast({ type: 'info', message: `${disconnectTarget.name} disconnected.` });
    }
  };

  return (
    <>
      <TopBar />
    <Box
      sx={{
        mt: '56px',
        minHeight: 'calc(100vh - 56px)',
        backgroundColor: theme.palette.background.default,
        p: 4,
      }}
    >
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h1">{t.repositories}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t.repositoryCount(repositories.length)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddRepoOpen(true)}>
            {t.addRepository}
          </Button>
          <Button variant="outlined" startIcon={<CreateNewFolderOutlinedIcon />} onClick={() => setNewLocalOpen(true)}>
            {t.newLocal}
          </Button>
        </Box>
      </Box>

      {/* Empty state */}
      {repositories.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: 2,
          }}
        >
          <Box
            component="img"
            src={theme.palette.mode === 'dark' ? './alirion-icon-transparent-dark.svg' : './alirion-icon-transparent-light.svg'}
            alt=""
            sx={{ width: 80, opacity: 0.3 }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
          />
          <Typography variant="h2">{t.welcomeTitle}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
            {t.welcomeDescription}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddRepoOpen(true)}>
              {t.addRepository}
            </Button>
            <Button variant="outlined" startIcon={<CreateNewFolderOutlinedIcon />} onClick={() => setNewLocalOpen(true)}>
              {t.newLocal}
            </Button>
          </Box>
        </Box>
      )}

      {/* Repository grid */}
      {repositories.length > 0 && (
        <Grid container spacing={2}>
          {repositories.map((repo) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={repo.id}>
              <RepoCard
                repo={repo}
                onOpen={() => handleOpen(repo)}
                onDisconnect={() => setDisconnectTarget(repo)}
                onDownloadZip={() => handleDownloadZip(repo)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modals */}
      <AddRepositoryModal open={addRepoOpen} onClose={() => setAddRepoOpen(false)} />
      <NewLocalModal open={newLocalOpen} onClose={() => setNewLocalOpen(false)} />

      {/* Disconnect confirm */}
      <ConfirmDialog
        open={Boolean(disconnectTarget)}
        title={disconnectTarget ? t.disconnectConfirmTitle(disconnectTarget.name) : ''}
        description={disconnectTarget ? t.disconnectConfirmBody(disconnectTarget.name) : ''}
        confirmLabel={t.disconnect}
        cancelLabel={t.cancel}
        destructive
        onConfirm={handleDisconnectConfirm}
        onCancel={() => setDisconnectTarget(null)}
      />
    </Box>
    </>
  );
};
