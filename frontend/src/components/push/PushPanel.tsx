/**
 * AML Studio — Push Panel (P-08)
 * Right slide-over panel for reviewing and publishing staged changes.
 * For local repos: shows a "local only" note and disables the publish button.
 *
 * Changes vs. the previous version:
 *   • The expanded preview is now an actual line-level diff for "modified"
 *     files (computed via utils/diff.ts), not a full dump of the new file.
 *   • Added/removed counts surfaced per file as red/green badges.
 *   • Replaced the binary "shared / per-file message" Switch with a
 *     ToggleButtonGroup so the two modes are visible at a glance.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Chip,
  Divider,
  Alert,
  Tooltip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  List,
  ListItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import { useNavigate } from 'react-router-dom';
import { useStore, useT } from '../../store/store';
import { pushChanges } from '../../api/api';
import type { StagedChange, ArtefactKind } from '../../types/artefact';
import { KIND_URL_SEGMENTS } from '../../types/artefact';
import { kindChipColors, kindColors } from '../../theme/tokens';
import { diffLines, summariseDiff, withContext, type DiffLine } from '../../utils/diff';

const PANEL_WIDTH = 640;
const PANEL_WIDTH_RESPONSIVE = { xs: '100vw', sm: `${PANEL_WIDTH}px` };

interface Props {
  repoId: string;
  onClose: () => void;
}

const ChangeIcon: React.FC<{ type: StagedChange['changeType'] }> = ({ type }) => {
  const theme = useTheme();
  if (type === 'added') return <AddCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />;
  if (type === 'modified') return <EditIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />;
  return <DeleteIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />;
};

const DiffView: React.FC<{ change: StagedChange }> = ({ change }) => {
  const theme = useTheme();
  const t = useT();

  // For 'added' files, show the full content as additions; for 'removed',
  // show the full original as removals; for 'modified', compute a real diff.
  const lines = useMemo((): DiffLine[] => {
    if (change.changeType === 'added') {
      return (change.newContent ?? '').split('\n').map((text, i): DiffLine => ({ op: 'added', text, newNumber: i + 1 }));
    }
    if (change.changeType === 'deleted') {
      return (change.originalContent ?? '').split('\n').map((text, i): DiffLine => ({ op: 'removed', text, oldNumber: i + 1 }));
    }
    const full = diffLines(change.originalContent ?? '', change.newContent ?? '');
    return withContext(full, 3);
  }, [change]);

  const { added, removed } = useMemo(() => summariseDiff(lines), [lines]);

  if (lines.length === 0) {
    return (
      <Box sx={{ mt: 1, p: 1.5, fontSize: '12px', color: theme.palette.text.secondary, fontStyle: 'italic' }}>
        No textual changes.
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        {added > 0 && <Chip size="small" label={`+${added}`} sx={{ height: 18, fontSize: 10, backgroundColor: theme.palette.success.main + '22', color: theme.palette.success.main }} />}
        {removed > 0 && <Chip size="small" label={`−${removed}`} sx={{ height: 18, fontSize: 10, backgroundColor: theme.palette.error.main + '22', color: theme.palette.error.main }} />}
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {t.diffPreviousLabel} → {t.diffNextLabel}
        </Typography>
      </Box>
      <Box
        sx={{
          maxHeight: 280,
          overflowY: 'auto',
          backgroundColor: theme.palette.background.default,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '12px',
        }}
      >
        {lines.map((l, i) => {
          const bg =
            l.op === 'added'
              ? theme.palette.success.main + '14'
              : l.op === 'removed'
                ? theme.palette.error.main + '14'
                : 'transparent';
          const fg =
            l.op === 'added'
              ? theme.palette.success.main
              : l.op === 'removed'
                ? theme.palette.error.main
                : theme.palette.text.primary;
          const sigil = l.op === 'added' ? '+' : l.op === 'removed' ? '-' : ' ';
          return (
            <Box
              key={i}
              sx={{
                display: 'grid',
                gridTemplateColumns: '36px 36px 16px 1fr',
                px: 0.5,
                backgroundColor: bg,
                color: fg,
                whiteSpace: 'pre',
              }}
            >
              <Box sx={{ color: theme.palette.text.disabled, textAlign: 'right', pr: 0.5, userSelect: 'none' }}>
                {l.oldNumber ?? ''}
              </Box>
              <Box sx={{ color: theme.palette.text.disabled, textAlign: 'right', pr: 0.5, userSelect: 'none' }}>
                {l.newNumber ?? ''}
              </Box>
              <Box sx={{ textAlign: 'center', userSelect: 'none', opacity: 0.7 }}>{sigil}</Box>
              <Box sx={{ overflowX: 'auto' }}>{l.text}</Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export const PushPanel: React.FC<Props> = ({ repoId, onClose }) => {
  const theme = useTheme();
  const t = useT();
  const navigate = useNavigate();

  const repositories = useStore((s) => s.repositories);
  const clearStagedChanges = useStore((s) => s.clearStagedChanges);
  const discardStagedChange = useStore((s) => s.discardStagedChange);
  const addToast = useStore((s) => s.addToast);
  const closePushPanel = useStore((s) => s.closePushPanel);

  const repo = repositories.find((r) => r.id === repoId);
  const stagedChanges = repo?.stagedChanges ?? [];

  const [messageMode, setMessageMode] = useState<'shared' | 'per-file'>('shared');
  const [sharedMessage, setSharedMessage] = useState('');
  const [perFileMessages, setPerFileMessages] = useState<Record<string, string>>({});
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);

  const sharedMode = messageMode === 'shared';

  // Check for artefacts with errors
  const artefactsWithErrors = stagedChanges.filter((c) => {
    const a = repo?.artefacts.find((x) => x.id === c.artefactId);
    return a?.validationErrors.some((e) => e.severity === 'error');
  });

  const allMessagesPresent = sharedMode
    ? sharedMessage.trim().length > 0
    : stagedChanges.every((c) => (perFileMessages[c.artefactId] ?? '').trim().length > 0);

  const canPublish =
    artefactsWithErrors.length === 0 &&
    stagedChanges.length > 0 &&
    !repo?.isLocal &&
    allMessagesPresent;

  const handlePublish = useCallback(async () => {
    if (!repo || !canPublish) return;
    setIsPublishing(true);

    const fileMappedChanges = stagedChanges
      .filter((c) => c.changeType !== 'deleted')
      .map((c) => ({
        path: c.filePath,
        content: c.newContent ?? '',
        commitMessage: sharedMode ? sharedMessage : (perFileMessages[c.artefactId] ?? ''),
      }));

    try {
      await pushChanges(repoId, fileMappedChanges, repo?.reviewWorkflowEnabled ?? false);
      clearStagedChanges(repoId);
      addToast({ type: 'success', message: t.toastPublishSuccess });
      closePushPanel();
    } catch {
      addToast({ type: 'error', message: t.toastPushFailed });
    } finally {
      setIsPublishing(false);
    }
  }, [repo, stagedChanges, canPublish, sharedMode, sharedMessage, perFileMessages, clearStagedChanges, repoId, addToast, closePushPanel, t]);

  const toggleDiff = (artefactId: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(artefactId)) next.delete(artefactId);
      else next.add(artefactId);
      return next;
    });
  };

  return (
    <Drawer
      anchor="right"
      open
      variant="temporary"
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: PANEL_WIDTH_RESPONSIVE,
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box>
          <Typography variant="h2">{t.publishChanges}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t.filesReadyToPublish(stagedChanges.length)}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label={t.close}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Empty state */}
      {stagedChanges.length === 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Typography color="text.secondary">{t.noChangesTitle}</Typography>
          <Typography variant="body2" color="text.disabled">{t.noChangesBody}</Typography>
        </Box>
      )}

      {stagedChanges.length > 0 && (
        <>
          {/* Alerts */}
          <Box sx={{ px: 3, pt: 2 }}>
            {repo?.isLocal && (
              <Alert severity="info" sx={{ mb: 1.5, fontSize: '13px' }}>
                {t.pushLocalNote}
              </Alert>
            )}
            {artefactsWithErrors.length > 0 && (
              <Alert
                severity="error"
                sx={{ mb: 1.5, fontSize: '13px' }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    sx={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      const first = artefactsWithErrors[0];
                      navigate(`/${repoId}/${KIND_URL_SEGMENTS[first.kind as ArtefactKind]}/${first.artefactId}/edit`);
                      onClose();
                    }}
                  >
                    {t.editToFix}
                  </Button>
                }
              >
                {t.cannotPublishErrors}
              </Alert>
            )}
            {repo?.reviewWorkflowEnabled && !repo?.isLocal && (
              <Alert severity="info" sx={{ mb: 1.5, fontSize: '13px' }}>
                {t.reviewWorkflowNote}
              </Alert>
            )}
          </Box>

          {/* Commit message mode toggle */}
          <Box sx={{ px: 3, pb: 1 }}>
            <ToggleButtonGroup
              value={messageMode}
              exclusive
              size="small"
              onChange={(_, v) => v && setMessageMode(v)}
              aria-label="commit message mode"
            >
              <ToggleButton value="shared" sx={{ fontSize: 12, py: 0.5 }}>{t.allFilesSharedMessage}</ToggleButton>
              <ToggleButton value="per-file" sx={{ fontSize: 12, py: 0.5 }}>{t.perFileMessages}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Shared commit message */}
          {sharedMode && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '11px', fontWeight: 500, color: 'text.secondary' }}>
                {t.commitMessage}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. Update agent definitions for v1.2"
                value={sharedMessage}
                onChange={(e) => setSharedMessage(e.target.value)}
                required
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
            </Box>
          )}

          <Divider />

          {/* File list — scrollable */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <List dense disablePadding>
              {stagedChanges.map((change) => {
                const a = repo?.artefacts.find((x) => x.id === change.artefactId);
                const hasError = a?.validationErrors.some((e) => e.severity === 'error');
                const kindBgColor = kindColors[change.kind as ArtefactKind] ?? '#888';
                const kindColor = (kindChipColors[theme.palette.mode][change.kind as ArtefactKind]) ?? kindBgColor;
                const isDiffOpen = expandedDiffs.has(change.artefactId);

                return (
                  <ListItem
                    key={change.artefactId}
                    disablePadding
                    sx={{
                      px: 3,
                      py: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {/* File row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                      <ChangeIcon type={change.changeType} />
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {change.filePath}
                      </Typography>
                      <Chip
                        label={change.kind}
                        size="small"
                        sx={{ fontSize: '10px', height: '18px', backgroundColor: `${kindBgColor}1A`, color: kindColor, borderRadius: '999px' }}
                      />
                      {hasError && (
                        <Chip label="Errors" size="small" color="error" sx={{ fontSize: '10px', height: '18px' }} />
                      )}
                      <Tooltip title={isDiffOpen ? t.diffViewClose : t.diffView}>
                        <IconButton size="small" onClick={() => toggleDiff(change.artefactId)} aria-label={isDiffOpen ? t.diffViewClose : t.diffView}>
                          {isDiffOpen ? <VisibilityOffOutlinedIcon sx={{ fontSize: 14 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t.discardChange}>
                        <IconButton
                          size="small"
                          onClick={() => discardStagedChange(repoId, change.artefactId)}
                          aria-label={t.discardChange}
                          sx={{ color: theme.palette.text.disabled, '&:hover': { color: theme.palette.error.main } }}
                        >
                          <UndoIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Per-file commit message */}
                    {!sharedMode && (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Commit message…"
                        value={perFileMessages[change.artefactId] ?? ''}
                        onChange={(e) => setPerFileMessages((p) => ({ ...p, [change.artefactId]: e.target.value }))}
                        slotProps={{ htmlInput: { maxLength: 1000 } }}
                        sx={{ mt: 0.75 }}
                      />
                    )}

                    {/* Diff preview */}
                    {isDiffOpen && <DiffView change={change} />}
                  </ListItem>
                );
              })}
            </List>
          </Box>

          {/* Publish footer */}
          <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            {repo && !repo.isLocal && repo.defaultBranch && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <CallMergeIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
                <Typography variant="caption" color="text.secondary">
                  {t.pushingToPrefix}{' '}
                  <Box component="span" sx={{ fontFamily: '"JetBrains Mono", monospace', color: theme.palette.text.primary }}>
                    {repo.reviewWorkflowEnabled ? t.pushingToNewBranchPR : repo.defaultBranch}
                  </Box>
                </Typography>
              </Box>
            )}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handlePublish}
              disabled={!canPublish || isPublishing}
            >
              {isPublishing ? <CircularProgress size={18} color="inherit" /> : t.publishButton(stagedChanges.length)}
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
};
