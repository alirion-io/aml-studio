/**
 * AML Studio — Add Repository Modal (P-02a)
 * GitHub and Bitbucket providers shown but disabled unless backend is configured.
 * Public repository import by URL is always available.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Card,
  CardActionArea,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import { useNavigate } from 'react-router-dom';
import config from '../../config/config';
import { useStore, useT } from '../../store/store';
import { fetchPublicRepoContents } from '../../api/api';
import type { Repository } from '../../types/artefact';
import { ProviderIcon } from '../shared/ProviderIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AddRepositoryModal: React.FC<Props> = ({ open, onClose }) => {
  const theme = useTheme();
  const t = useT();
  const navigate = useNavigate();
  const addRepository = useStore((s) => s.addRepository);
  const loadArtefactsFromFiles = useStore((s) => s.loadArtefactsFromFiles);
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const addToast = useStore((s) => s.addToast);

  const [step, setStep] = useState<'choose' | 'public-url' | 'loading'>('choose');
  const [publicUrl, setPublicUrl] = useState('');
  const [rootPath, setRootPath] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setStep('choose');
    setPublicUrl('');
    setRootPath('');
    setError(null);
    onClose();
  };

  const handleImportPublic = async () => {
    setStep('loading');
    setError(null);
    const normalizedRoot = rootPath.trim().replace(/^\/+|\/+$/g, '') || undefined;
    try {
      const { files, owner, repo, defaultBranch } = await fetchPublicRepoContents(publicUrl.trim(), normalizedRoot);
      const repoId = crypto.randomUUID();
      const newRepo: Repository = {
        id: repoId,
        name: repo,
        fullName: `${owner}/${repo}`,
        provider: 'public',
        isLocal: false,
        defaultBranch,
        htmlUrl: publicUrl.trim(),
        rootPath: normalizedRoot,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'up-to-date',
        reviewWorkflowEnabled: true,
        artefacts: [],
        stagedChanges: [],
      };
      addRepository(newRepo);
      loadArtefactsFromFiles(repoId, files);
      setActiveRepo(repoId);

      const counts = `Found ${files.length} AML file${files.length === 1 ? '' : 's'}.`;
      addToast({ type: 'success', message: `${owner}/${repo} connected. ${counts}` });
      handleClose();
      navigate(`/${repoId}/overview`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import repository.';
      setError(msg);
      setStep('public-url');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 300 }}>
        {t.addRepositoryTitle}
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {step === 'choose' && (
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {t.chooseProvider}
            </Typography>

            {/* GitHub — disabled without backend */}
            <Tooltip title={!config.gitProvidersEnabled ? t.githubDisabledTooltip : ''}>
              <span>
                <Card sx={{ mb: 1.5, opacity: config.gitProvidersEnabled ? 1 : 0.55 }}>
                  <CardActionArea disabled={!config.gitProvidersEnabled}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ color: theme.palette.text.primary }}>
                        <ProviderIcon provider="github" size={24} color="currentColor" />
                      </Box>
                      <Box>
                        <Typography variant="h3">{t.github}</Typography>
                        <Typography variant="body2" color="text.secondary">{t.githubDomain}</Typography>
                      </Box>
                      {!config.gitProvidersEnabled && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', opacity: 0.7 }}>
                          Requires backend
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </span>
            </Tooltip>

            {/* Bitbucket — disabled without backend */}
            <Tooltip title={!config.gitProvidersEnabled ? t.bitbucketDisabledTooltip : ''}>
              <span>
                <Card sx={{ mb: 1.5, opacity: config.gitProvidersEnabled ? 1 : 0.55 }}>
                  <CardActionArea disabled={!config.gitProvidersEnabled}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ProviderIcon provider="bitbucket" size={24} />
                      <Box>
                        <Typography variant="h3">{t.bitbucket}</Typography>
                        <Typography variant="body2" color="text.secondary">{t.bitbucketDomain}</Typography>
                      </Box>
                      {!config.gitProvidersEnabled && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', opacity: 0.7 }}>
                          Requires backend
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </span>
            </Tooltip>

            {/* Public URL import */}
            <Card sx={{ mb: 1.5 }}>
              <CardActionArea onClick={() => setStep('public-url')}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinkIcon color="primary" />
                  <Box>
                    <Typography variant="h3">{t.importPublicTitle}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Import any public repository by URL — no login required
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              {t.gitCredentialsNote}
            </Typography>
          </Box>
        )}

        {step === 'public-url' && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t.importPublicTitle}
            </Typography>
            <TextField
              fullWidth
              label={t.importPublicUrlLabel}
              placeholder="https://github.com/owner/repo"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              helperText={t.importPublicUrlHelp}
              autoFocus
              slotProps={{ htmlInput: { maxLength: 256 } }}
            />
            <TextField
              fullWidth
              label={t.importPublicRootPathLabel}
              placeholder="agents/team-a"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              helperText={t.importPublicRootPathHelp}
              sx={{ mt: 2 }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}

        {step === 'loading' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading repository…
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scanning for AML files. This may take a moment.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>{t.cancel}</Button>
        {step === 'public-url' && (
          <Button
            variant="contained"
            onClick={handleImportPublic}
            disabled={!publicUrl.trim()}
          >
            {t.importPublicButton}
          </Button>
        )}
        {step === 'choose' && (
          <Button onClick={handleClose} variant="outlined">
            {t.close}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
