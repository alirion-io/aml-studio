/**
 * AML Studio — Artefact List Panel
 * Compact side panel shown when an artefact is open in split-view.
 * Renders a searchable, filterable list of artefacts of the same kind.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import type { Artefact, ArtefactKind } from '../../types/artefact';
import { KIND_URL_SEGMENTS, KIND_PLURAL_LABELS } from '../../types/artefact';
import { kindColors } from '../../theme/tokens';
import { StatusBadge } from '../shared/StatusBadge';
import { useT } from '../../store/store';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

const KIND_ICONS: Record<ArtefactKind, SvgIconComponent> = {
  agent: SmartToyOutlinedIcon,
  tool: BuildOutlinedIcon,
  kb: LibraryBooksOutlinedIcon,
  iam: VpnKeyOutlinedIcon,
  model: MemoryOutlinedIcon,
  collection: FolderSpecialOutlinedIcon,
  guardrail: GppGoodOutlinedIcon,
};


interface PanelCardProps {
  artefact: Artefact;
  isSelected: boolean;
  repoId: string;
  kind: ArtefactKind;
}

const PanelCard: React.FC<PanelCardProps> = ({ artefact, isSelected, repoId, kind }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const KindIcon = KIND_ICONS[kind];
  const kindColor = kindColors[kind];
  const metaDesc: string | undefined =
    artefact.frontMatter?.meta?.description as string | undefined ??
    artefact.frontMatter?.meta?.summary as string | undefined;
  const preview = metaDesc
    ? (metaDesc.length > 110 ? metaDesc.slice(0, 110).trimEnd() + '…' : metaDesc)
    : '';

  return (
    <Box
      onClick={() => navigate(`/${repoId}/${KIND_URL_SEGMENTS[kind]}/${artefact.id}`)}
      sx={{
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: isSelected
          ? `${theme.palette.primary.main}14`
          : 'transparent',
        borderLeft: isSelected
          ? `3px solid ${theme.palette.primary.main}`
          : '3px solid transparent',
        '&:hover': {
          backgroundColor: isSelected
            ? `${theme.palette.primary.main}1f`
            : `${theme.palette.primary.main}08`,
        },
        transition: 'background-color 0.1s',
      }}
    >
      {/* Name + status */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
        <Typography
          sx={{
            fontSize: '14px',
            fontWeight: 600,
            color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
            lineHeight: 1.3,
            flex: 1,
            minWidth: 0,
          }}
        >
          {artefact.displayName || artefact.id}
          {artefact.isDirty && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: artefact.validationErrors.some(e => e.severity === 'error')
                  ? theme.palette.error.main
                  : theme.palette.warning.main,
                ml: 0.75,
                verticalAlign: 'middle',
                mb: '2px',
              }}
            />
          )}
        </Typography>
        <StatusBadge status={artefact.status as 'active' | 'draft' | 'deprecated' | 'disabled'} size="small" />
      </Box>

      {/* Kind + owner */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: preview ? 0.5 : 0 }}>
        <KindIcon sx={{ fontSize: '12px', color: kindColor }} />
        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: kindColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {KIND_PLURAL_LABELS[kind].slice(0, -1)}
        </Typography>
        {artefact.owner && (
          <>
            <Typography sx={{ fontSize: '11px', color: theme.palette.text.disabled }}>·</Typography>
            <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
              {artefact.owner}
            </Typography>
          </>
        )}
      </Box>

      {/* Body preview */}
      {preview && (
        <Typography
          sx={{
            fontSize: '11px',
            color: theme.palette.text.secondary,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {preview}
        </Typography>
      )}
    </Box>
  );
};

interface Props {
  kind: ArtefactKind;
  artefacts: Artefact[];
  selectedId: string | undefined;
  repoId: string;
}

export const ArtefactListPanel: React.FC<Props> = ({ kind, artefacts, selectedId, repoId }) => {
  const theme = useTheme();
  const t = useT();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allOwners = useMemo(() => [...new Set(artefacts.map((a) => a.owner).filter(Boolean) as string[])], [artefacts]);
  const allTags = useMemo(() => [...new Set(artefacts.flatMap((a) => a.tags))], [artefacts]);

  const activeFilterCount = [statusFilter, ownerFilter, tagsFilter].filter(Boolean).length;
  const hasFilters = search || statusFilter || ownerFilter || tagsFilter;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return artefacts.filter((a) => {
      const matchSearch = !q || [a.id, a.displayName, a.owner, ...a.tags].some((v) => v?.toLowerCase().includes(q));
      const matchStatus = !statusFilter || a.status === statusFilter;
      const matchOwner = !ownerFilter || a.owner === ownerFilter;
      const matchTags = !tagsFilter || a.tags.includes(tagsFilter);
      return matchSearch && matchStatus && matchOwner && matchTags;
    });
  }, [artefacts, search, statusFilter, ownerFilter, tagsFilter]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setOwnerFilter('');
    setTagsFilter('');
  };

  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Search + filter toggle */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={`Search…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16 }} color="action" />
                  </InputAdornment>
                ),
                sx: { fontSize: '13px' },
              },
            }}
          />
          <Tooltip title={filtersOpen ? 'Hide filters' : 'Show filters'}>
            <IconButton
              size="small"
              onClick={() => setFiltersOpen((v) => !v)}
              sx={{
                flexShrink: 0,
                color: activeFilterCount > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
              }}
            >
              <Badge
                badgeContent={activeFilterCount || undefined}
                color="primary"
                sx={{ '& .MuiBadge-badge': { fontSize: '9px', height: '14px', minWidth: '14px' } }}
              >
                <FilterListIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Collapsible filters */}
        {filtersOpen && (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '12px' }}>{t.filterStatus}</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label={t.filterStatus}
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="" sx={{ fontSize: '12px' }}>{t.allStatuses}</MenuItem>
                <MenuItem value="active" sx={{ fontSize: '12px' }}>{t.statusActive}</MenuItem>
                <MenuItem value="draft" sx={{ fontSize: '12px' }}>{t.statusDraft}</MenuItem>
                <MenuItem value="deprecated" sx={{ fontSize: '12px' }}>{t.statusDeprecated}</MenuItem>
                <MenuItem value="disabled" sx={{ fontSize: '12px' }}>{t.statusDisabled}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontSize: '12px' }}>{t.filterOwner}</InputLabel>
              <Select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                label={t.filterOwner}
                sx={{ fontSize: '12px' }}
              >
                <MenuItem value="" sx={{ fontSize: '12px' }}>{t.allOwners}</MenuItem>
                {allOwners.map((o) => <MenuItem key={o} value={o} sx={{ fontSize: '12px' }}>{o}</MenuItem>)}
              </Select>
            </FormControl>

            {allTags.length > 0 && (
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '12px' }}>{t.filterTags}</InputLabel>
                <Select
                  value={tagsFilter}
                  onChange={(e) => setTagsFilter(e.target.value)}
                  label={t.filterTags}
                  sx={{ fontSize: '12px' }}
                >
                  <MenuItem value="" sx={{ fontSize: '12px' }}>{t.allTags}</MenuItem>
                  {allTags.map((tag) => <MenuItem key={tag} value={tag} sx={{ fontSize: '12px' }}>{tag}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {hasFilters && (
              <Button size="small" onClick={clearFilters} sx={{ alignSelf: 'flex-start', fontSize: '11px', p: 0, minWidth: 0 }}>
                {t.clearFilters}
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* Count */}
      <Typography
        sx={{
          px: 2,
          pb: 0.75,
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: theme.palette.text.disabled,
          flexShrink: 0,
        }}
      >
        {filtered.length} {KIND_PLURAL_LABELS[kind].toUpperCase()}
      </Typography>

      {/* Scrollable list */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <Typography sx={{ px: 2, py: 4, fontSize: '12px', color: theme.palette.text.secondary, textAlign: 'center' }}>
            No results
          </Typography>
        ) : (
          filtered.map((a) => (
            <PanelCard
              key={a.id}
              artefact={a}
              isSelected={a.id === selectedId}
              repoId={repoId}
              kind={kind}
            />
          ))
        )}
      </Box>
    </Box>
  );
};
