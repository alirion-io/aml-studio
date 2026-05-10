/**
 * AML Studio — Pull Requests Page (P-09)
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Link,
  Alert,
  CircularProgress,
  useTheme,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useParams } from 'react-router-dom';
import { useStore, useT } from '../store/store';
import { listPullRequests, type PullRequest } from '../api/api';
import { relativeTime } from '../utils/relativeTime';

function isSafeUrl(url: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(url).protocol); }
  catch { return false; }
}

export const PullRequestsPage: React.FC = () => {
  const theme = useTheme();
  const { repoId } = useParams<{ repoId: string }>();
  const t = useT();

  const repositories = useStore((s) => s.repositories);
  const addToast = useStore((s) => s.addToast);
  const repo = repositories.find((r) => r.id === repoId);

  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLocalOnly = !repo || repo.isLocal || repo.provider === 'local';

  const fetchPRs = async () => {
    if (!repo || isLocalOnly) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPullRequests(repoId!);
      setPrs(data as PullRequest[]);
      setLastRefreshed(new Date().toISOString());
    } catch {
      setError(t.errorLoadPRs);
      addToast({ type: 'error', message: t.errorLoadPRs });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLocalOnly) fetchPRs();
  }, [repoId]);

  const openPRs = prs.filter((p) => p.state === 'open');
  const closedPRs = prs.filter((p) => p.state !== 'open');

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h1" sx={{ fontWeight: 300 }}>{t.pullRequestsTitle}</Typography>
          {lastRefreshed && (
            <Typography variant="body2" color="text.secondary">
              {t.pullRequestsSubtitle(repo?.name ?? '', relativeTime(lastRefreshed))}
            </Typography>
          )}
        </Box>
        {!isLocalOnly && (
          <Button
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
            onClick={fetchPRs}
            disabled={loading}
            size="small"
          >
            {t.refresh}
          </Button>
        )}
      </Box>

      {/* Local-only state */}
      {isLocalOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t.notConnectedPRs}
        </Alert>
      )}

      {/* Review workflow disabled notice */}
      {!isLocalOnly && !repo?.reviewWorkflowEnabled && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" href={`/${repoId}/settings`}>
              {t.goToSettings}
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {t.reviewWorkflowDisabledNotice}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !isLocalOnly && openPRs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" gutterBottom>{t.noPullRequests}</Typography>
          <Typography variant="body2" color="text.disabled">{t.noPullRequestsDescription}</Typography>
        </Box>
      )}

      {/* Open PRs */}
      {openPRs.map((pr) => (
        <Card
          key={pr.number}
          elevation={0}
          sx={{ mb: 1.5, border: `1px solid ${theme.palette.divider}` }}
        >
          <CardContent sx={{ pb: '12px !important' }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', color: theme.palette.info.main, fontWeight: 600, mt: '3px', flexShrink: 0 }}>
                #{pr.number}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={isSafeUrl(pr.htmlUrl) ? pr.htmlUrl : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body1"
                  sx={{ fontWeight: 400, color: theme.palette.text.primary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}
                >
                  {pr.title}
                </Link>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  {t.openedBy} {pr.author} · {relativeTime(pr.createdAt)}
                </Typography>
              </Box>
              <Link href={isSafeUrl(pr.htmlUrl) ? pr.htmlUrl : '#'} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '13px', flexShrink: 0 }}>
                {repo?.provider === 'bitbucket' ? t.viewOnBitbucket : t.viewOnGitHub}
              </Link>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Closed PRs count */}
      {closedPRs.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {t.closedPRs(closedPRs.length)}
          </Typography>
        </>
      )}
    </Box>
  );
};
