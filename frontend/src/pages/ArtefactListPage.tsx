/**
 * AML Studio — Artefact List Page (P-04)
 * Used for all 7 artefact kinds via URL param routing.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardActionArea,
  CardContent,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Menu,
  Tooltip,
  Divider,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, useT } from '../store/store';
import { shadows } from '../theme/tokens';
import type { Artefact, ArtefactKind } from '../types/artefact';
import { KIND_PLURAL_LABELS, KIND_URL_SEGMENTS } from '../types/artefact';
import { KindBadge } from '../components/shared/KindBadge';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

interface Props {
  kind: ArtefactKind;
}

const ArtefactCard: React.FC<{
  artefact: Artefact;
  repoId: string;
  onEdit: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  onViewDependencies: () => void;
  onClick: () => void;
}> = ({ artefact, onEdit, onDelete, onViewHistory, onViewDependencies, onClick }) => {
  const theme = useTheme();
  const t = useT();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const hasError = artefact.validationErrors.some((e) => e.severity === 'error');
  const hasWarning = artefact.validationErrors.some((e) => e.severity === 'warning');

  return (
    <Card
      sx={{
        mb: 1.5,
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: shadows.cardHover,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        <CardActionArea onClick={onClick} sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: '10px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <KindBadge kind={artefact.kind} />
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', fontWeight: 500, color: theme.palette.text.primary }}
              >
                {artefact.id}
              </Typography>
              {artefact.versionLabel && (
                <Typography variant="caption" color="text.secondary">
                  {artefact.versionLabel}
                </Typography>
              )}
              {(hasError || hasWarning) && (
                <Tooltip title={artefact.validationErrors.map((e) => e.message).join('\n')}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center' }} tabIndex={0} aria-label={hasError ? 'Has validation errors' : 'Has validation warnings'}>
                    {hasError ? (
                      <ErrorIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                    ) : (
                      <WarningAmberIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                    )}
                  </Box>
                </Tooltip>
              )}
            </Box>

            {artefact.displayName && artefact.displayName !== artefact.id && (
              <Typography
                variant="body1"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '90%',
                  mb: 0.5,
                }}
              >
                {artefact.displayName}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {artefact.owner && (
                <Typography variant="caption" color="text.secondary">
                  owner: {artefact.owner}
                </Typography>
              )}
              {artefact.owner && <Typography variant="caption" color="text.secondary">·</Typography>}
              <StatusBadge status={artefact.status as 'active' | 'draft' | 'deprecated' | 'disabled'} />
              {artefact.isDirty && (() => {
                const hasErrors = artefact.validationErrors.some(e => e.severity === 'error');
                const color = hasErrors ? theme.palette.error.main : theme.palette.warning.main;
                return <Chip label="Modified" size="small" sx={{ fontSize: '10px', height: '18px', backgroundColor: color + '1A', color }} />;
              })()}
            </Box>

            {artefact.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                {artefact.tags.slice(0, 5).map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ fontSize: '10px', height: '18px' }} />
                ))}
                {artefact.tags.length > 5 && (
                  <Typography variant="caption" color="text.secondary">
                    +{artefact.tags.length - 5} {t.more}
                  </Typography>
                )}
              </Box>
            )}

            {(hasError || hasWarning) && (
              <Box sx={{ mt: 0.75 }}>
                {artefact.validationErrors.map((e, i) => (
                  <Typography
                    key={i}
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontSize: '10px',
                      lineHeight: 1.5,
                      color: e.severity === 'error' ? theme.palette.error.main : theme.palette.warning.main,
                    }}
                  >
                    {e.message}
                  </Typography>
                ))}
              </Box>
            )}
          </CardContent>
        </CardActionArea>

        {/* Edit button and overflow menu — flexed beside the action area */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.25, p: 1, flexShrink: 0 }}>
          <Tooltip title={t.edit}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label={t.edit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }} aria-label="More actions">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); onClick(); }}>{t.open}</MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onEdit(); }}>{t.edit}</MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onViewHistory(); }}>{t.viewHistory}</MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onViewDependencies(); }}>{t.viewDependencies}</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); onDelete(); }} sx={{ color: theme.palette.error.main }}>
          {t.delete}
        </MenuItem>
      </Menu>
    </Card>
  );
};

export const ArtefactListPage: React.FC<Props> = ({ kind }) => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const t = useT();

  const repositories = useStore((s) => s.repositories);
  const deleteArtefactLocally = useStore((s) => s.deleteArtefactLocally);
  const addToast = useStore((s) => s.addToast);

  const repo = repositories.find((r) => r.id === repoId);
  const allArtefacts = repo?.artefacts.filter((a) => a.kind === kind) ?? [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Artefact | null>(null);

  const allOwners = useMemo(() => [...new Set(allArtefacts.map((a) => a.owner).filter(Boolean))], [allArtefacts]);
  const allTags = useMemo(() => [...new Set(allArtefacts.flatMap((a) => a.tags))], [allArtefacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allArtefacts.filter((a) => {
      const matchSearch = !q || [a.id, a.displayName, a.owner, ...a.tags].some((v) => v?.toLowerCase().includes(q));
      const matchStatus = !statusFilter || a.status === statusFilter;
      const matchOwner = !ownerFilter || a.owner === ownerFilter;
      const matchTags = !tagsFilter || a.tags.includes(tagsFilter);
      return matchSearch && matchStatus && matchOwner && matchTags;
    });
  }, [allArtefacts, search, statusFilter, ownerFilter, tagsFilter]);

  const hasFilters = search || statusFilter || ownerFilter || tagsFilter;

  const kindLabel = KIND_PLURAL_LABELS[kind];
  const urlSegment = KIND_URL_SEGMENTS[kind];

  const handleDelete = useCallback((a: Artefact) => {
    if (!repoId) return;
    deleteArtefactLocally(repoId, a.id);
    addToast({ type: 'info', message: t.toastArtefactDeleted(a.id) });
    setDeleteTarget(null);
  }, [repoId, deleteArtefactLocally, addToast, t]);

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h1">{kindLabel}</Typography>
          <Typography variant="body2" color="text.secondary">
            {allArtefacts.length} {kindLabel.toLowerCase()} in {repo?.name ?? ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/${repoId}/${urlSegment}/new/edit`)}
        >
          {t.newArtefact(KIND_PLURAL_LABELS[kind].slice(0, -1))}
        </Button>
      </Box>

      {/* Search & filters */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder={`Search ${kindLabel.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>{t.filterStatus}</InputLabel>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label={t.filterStatus}>
              <MenuItem value="">{t.allStatuses}</MenuItem>
              <MenuItem value="active">{t.statusActive}</MenuItem>
              <MenuItem value="draft">{t.statusDraft}</MenuItem>
              <MenuItem value="deprecated">{t.statusDeprecated}</MenuItem>
              <MenuItem value="disabled">{t.statusDisabled}</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>{t.filterOwner}</InputLabel>
            <Select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} label={t.filterOwner}>
              <MenuItem value="">{t.allOwners}</MenuItem>
              {allOwners.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>{t.filterTags}</InputLabel>
            <Select value={tagsFilter} onChange={(e) => setTagsFilter(e.target.value)} label={t.filterTags}>
              <MenuItem value="">{t.allTags}</MenuItem>
              {allTags.map((tag) => <MenuItem key={tag} value={tag}>{tag}</MenuItem>)}
            </Select>
          </FormControl>

          {hasFilters && (
            <Button size="small" onClick={() => { setSearch(''); setStatusFilter(''); setOwnerFilter(''); setTagsFilter(''); }}>
              {t.clearFilters}
            </Button>
          )}
        </Box>
      </Box>

      {/* Artefact cards */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          {allArtefacts.length === 0 ? (
            <>
              <Typography variant="h2" sx={{ mb: 1 }}>{t.emptyKindTitle(kindLabel)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t.emptyKindDescription(kindLabel)}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/${repoId}/${urlSegment}/new/edit`)}
              >
                {t.newArtefact(KIND_PLURAL_LABELS[kind].slice(0, -1))}
              </Button>
            </>
          ) : (
            <>
              <Typography color="text.secondary" sx={{ mb: 1 }}>{t.noResultsForFilters}</Typography>
              <Button size="small" onClick={() => { setSearch(''); setStatusFilter(''); setOwnerFilter(''); setTagsFilter(''); }}>
                {t.resetFilters}
              </Button>
            </>
          )}
        </Box>
      ) : (
        <>
          {filtered.map((artefact) => (
            <ArtefactCard
              key={artefact.id}
              artefact={artefact}
              repoId={repoId!}
              onClick={() => navigate(`/${repoId}/${urlSegment}/${artefact.id}`)}
              onEdit={() => navigate(`/${repoId}/${urlSegment}/${artefact.id}/edit`)}
              onDelete={() => setDeleteTarget(artefact)}
              onViewHistory={() => navigate(`/${repoId}/${urlSegment}/${artefact.id}/history`)}
              onViewDependencies={() => navigate(`/${repoId}/${urlSegment}/${artefact.id}/dependencies`)}
            />
          ))}
          <Typography variant="caption" color="text.secondary">
            Showing {filtered.length} of {allArtefacts.length} {kindLabel.toLowerCase()}
          </Typography>
        </>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget ? t.deleteArtefactTitle(deleteTarget.id) : ''}
        description={deleteTarget ? t.deleteArtefactBody(deleteTarget.id) : ''}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};
