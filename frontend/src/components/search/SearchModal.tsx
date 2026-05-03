/**
 * AML Studio — Search Modal (P-12)
 * Global full-text search across all artefacts in the current repository.
 * Keyboard shortcut ⌘K / Ctrl+K opens this modal.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemButton,
  useTheme,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useStore, useT } from '../../store/store';
import type { Artefact, ArtefactKind } from '../../types/artefact';
import { ARTEFACT_KINDS, KIND_LABELS, KIND_URL_SEGMENTS } from '../../types/artefact';
import { KindBadge } from '../shared/KindBadge';
import { StatusBadge } from '../shared/StatusBadge';

interface Props {
  open: boolean;
  onClose: () => void;
  repoId?: string;
}

function scoreMatch(a: Artefact, q: string): number {
  const lower = q.toLowerCase();
  if (a.id.toLowerCase() === lower) return 100;
  if (a.displayName?.toLowerCase() === lower) return 90;
  if (a.id.toLowerCase().startsWith(lower)) return 80;
  if (a.displayName?.toLowerCase().startsWith(lower)) return 70;
  if (a.id.toLowerCase().includes(lower)) return 60;
  if (a.displayName?.toLowerCase().includes(lower)) return 50;
  if (a.tags.some((t) => t.toLowerCase().includes(lower))) return 40;
  if (a.owner?.toLowerCase().includes(lower)) return 30;
  return 0;
}

export const SearchModal: React.FC<Props> = ({ open, onClose, repoId }) => {
  const theme = useTheme();
  const t = useT();
  const navigate = useNavigate();

  const repositories = useStore((s) => s.repositories);
  const repo = repositories.find((r) => r.id === repoId);
  const allArtefacts = repo?.artefacts ?? [];

  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<ArtefactKind | ''>('');
  const [focusIndex, setFocusIndex] = useState(0);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setKindFilter('');
      setFocusIndex(0);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim() && !kindFilter) return [];

    const filtered = allArtefacts.filter((a) => {
      const matchKind = !kindFilter || a.kind === kindFilter;
      if (!matchKind) return false;
      if (!query.trim()) return true;
      return scoreMatch(a, query) > 0;
    });

    return filtered
      .map((a) => ({ artefact: a, score: scoreMatch(a, query || '') }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
  }, [query, kindFilter, allArtefacts]);

  // Group results by kind
  const grouped = useMemo(() => {
    const map = new Map<ArtefactKind, Artefact[]>();
    for (const { artefact } of results) {
      if (!map.has(artefact.kind)) map.set(artefact.kind, []);
      map.get(artefact.kind)!.push(artefact);
    }
    return map;
  }, [results]);

  const allResults = results.map((r) => r.artefact);

  const navigate_to = (a: Artefact) => {
    navigate(`/${repoId}/${KIND_URL_SEGMENTS[a.kind]}/${a.id}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const a = allResults[focusIndex];
      if (a) navigate_to(a);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // ⌘K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) useStore.getState().openSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  let flatIndex = 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            width: 640,
            maxHeight: '70vh',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search input */}
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            autoFocus
            fullWidth
            variant="standard"
            placeholder={t.searchModalPlaceholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocusIndex(0); }}
            onKeyDown={handleKeyDown}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                disableUnderline: true,
                sx: { fontSize: '16px' },
              },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
            <InputLabel>{t.searchModalKindFilter}</InputLabel>
            <Select
              value={kindFilter}
              onChange={(e) => { setKindFilter(e.target.value as ArtefactKind | ''); setFocusIndex(0); }}
              label={t.searchModalKindFilter}
              sx={{ fontSize: '13px' }}
            >
              <MenuItem value="">All kinds</MenuItem>
              {ARTEFACT_KINDS.map((k) => (
                <MenuItem key={k} value={k}>{KIND_LABELS[k]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Results */}
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {results.length === 0 && (query.trim() || kindFilter) && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">{t.searchModalNoResults}</Typography>
            </Box>
          )}

          {results.length === 0 && !query.trim() && !kindFilter && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ fontSize: '13px' }}>
                Start typing to search across {allArtefacts.length} artefact{allArtefacts.length === 1 ? '' : 's'}…
              </Typography>
            </Box>
          )}

          {ARTEFACT_KINDS.map((kind) => {
            const items = grouped.get(kind);
            if (!items || items.length === 0) return null;

            return (
              <Box key={kind}>
                <Box sx={{ px: 2, py: 0.75, backgroundColor: theme.palette.background.default }}>
                  <Typography variant="caption" sx={{ fontWeight: 400, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                    {KIND_LABELS[kind]}
                  </Typography>
                </Box>
                <List dense disablePadding>
                  {items.map((a) => {
                    const idx = flatIndex++;
                    const isFocused = idx === focusIndex;
                    return (
                      <ListItem key={a.id} disablePadding>
                        <ListItemButton
                          selected={isFocused}
                          onClick={() => navigate_to(a)}
                          sx={{
                            px: 2,
                            py: 0.75,
                            display: 'flex',
                            gap: 1.5,
                            alignItems: 'center',
                            '&.Mui-selected': {
                              backgroundColor: `${theme.palette.primary.main}14`,
                            },
                          }}
                        >
                          <KindBadge kind={a.kind} size="small" />
                          <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            <Typography
                              variant="body2"
                              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {a.displayName || a.id}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}
                            >
                              {a.id}
                            </Typography>
                          </Box>
                          <StatusBadge status={a.status as 'active' | 'draft' | 'deprecated' | 'disabled'} />
                          {a.tags.slice(0, 2).map((tag) => (
                            <Chip key={tag} label={tag} size="small" sx={{ fontSize: '10px', height: '16px' }} />
                          ))}
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
                <Divider />
              </Box>
            );
          })}
        </Box>

        {/* Footer hint */}
        <Box sx={{ px: 2, py: 0.75, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">↑↓ navigate</Typography>
          <Typography variant="caption" color="text.secondary">↵ open</Typography>
          <Typography variant="caption" color="text.secondary">Esc close</Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">{allArtefacts.length} artefacts</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
