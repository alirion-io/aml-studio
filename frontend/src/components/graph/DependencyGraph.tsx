/**
 * AML Studio — Dependency Graph Component (P-10)
 * Cytoscape.js with built-in breadthfirst layout.
 * Can be used standalone (full page) or embedded (scoped to one artefact).
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  useTheme,
} from '@mui/material';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import cytoscape from 'cytoscape';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import type { Artefact, ArtefactKind } from '../../types/artefact';
import { ARTEFACT_KINDS, KIND_LABELS, KIND_URL_SEGMENTS } from '../../types/artefact';
import { kindColors, kindChipColors } from '../../theme/tokens';

interface Props {
  repoId: string;
  /** If set, only show this artefact and its immediate dependencies */
  focusArtefactId?: string;
}

// ─── Build graph data from artefact list ───────────────────────────────────

// Reference fields per kind — only kinds that actually reference other artefacts
const REF_FIELDS: Record<ArtefactKind, string[]> = {
  agent: ['tools', 'knowledge_bases', 'guardrails', 'iam_role', 'model', 'memory_collection'],
  // IAM grants reference tools, KBs and collections (items are objects with a .ref field)
  iam: ['tools', 'knowledge_bases', 'collections'],
  tool: [],
  kb: [],
  model: [],
  collection: [],
  guardrail: [],
};

/** Extract artefact IDs from a front-matter field value.
 *  Handles both flat arrays of strings and arrays of grant objects ({ ref, access, … }). */
function extractRefIds(val: unknown): string[] {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (typeof item === 'object' && item !== null) {
      const ref = (item as Record<string, unknown>).ref;
      if (typeof ref === 'string') return [ref];
    }
    return [];
  });
}

function buildElements(artefacts: Artefact[], focusId?: string): cytoscape.ElementDefinition[] {
  const nodes: cytoscape.ElementDefinition[] = [];
  const edges: cytoscape.ElementDefinition[] = [];
  const artefactMap = new Map(artefacts.map((a) => [a.id, a]));

  const relevantIds = new Set<string>();

  if (focusId) {
    relevantIds.add(focusId);
    // Collect direct deps
    const focal = artefactMap.get(focusId);
    if (focal) {
      const refs = REF_FIELDS[focal.kind] ?? [];
      for (const field of refs) {
        extractRefIds(focal.frontMatter[field]).forEach((id) => relevantIds.add(id));
      }
      // Also who depends on focusId
      artefacts.forEach((a) => {
        const aRefs = REF_FIELDS[a.kind] ?? [];
        for (const f of aRefs) {
          if (extractRefIds(a.frontMatter[f]).includes(focusId)) relevantIds.add(a.id);
        }
      });
    }
  } else {
    artefacts.forEach((a) => relevantIds.add(a.id));
  }

  for (const id of relevantIds) {
    const a = artefactMap.get(id);
    nodes.push({
      data: {
        id,
        label: a?.displayName ?? id,
        kind: a?.kind ?? 'agent',
        isFocus: id === focusId,
      },
    });
  }

  for (const id of relevantIds) {
    const a = artefactMap.get(id);
    if (!a) continue;
    const refs = REF_FIELDS[a.kind] ?? [];
    for (const field of refs) {
      const targetIds = extractRefIds(a.frontMatter[field]);
      for (const targetId of targetIds) {
        if (!relevantIds.has(targetId)) continue;
        edges.push({
          data: {
            id: `${id}__${targetId}__${field}`,
            source: id,
            target: targetId,
            label: field,
          },
        });
      }
    }
  }

  return [...nodes, ...edges];
}

export const DependencyGraph: React.FC<Props> = ({ repoId, focusArtefactId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const repositories = useStore((s) => s.repositories);
  const repo = repositories.find((r) => r.id === repoId);
  const allArtefacts = repo?.artefacts ?? [];

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedKinds, setSelectedKinds] = useState<ArtefactKind[]>([...ARTEFACT_KINDS]);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<Artefact | null>(null);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);

  const filteredArtefacts = allArtefacts.filter((a) => selectedKinds.includes(a.kind));
  const elements = buildElements(filteredArtefacts, focusArtefactId);

  const initCy = useCallback(() => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: cytoscape.NodeSingular) => `${kindColors[ele.data('kind') as ArtefactKind] ?? '#888'}26`,
            'border-color': (ele: cytoscape.NodeSingular) => kindChipColors[theme.palette.mode as 'light' | 'dark'][ele.data('kind') as ArtefactKind] ?? '#888',
            'border-width': (ele: cytoscape.NodeSingular) => (ele.data('isFocus') ? 2.5 : 1.5),
            'label': 'data(label)',
            'font-family': '"Sora", sans-serif',
            'font-size': 10,
            'color': theme.palette.text.primary,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': 100,
            'shape': 'round-rectangle',
            'width': 120,
            'height': 56,
            'padding': 8,
          } as unknown as cytoscape.Css.Node,
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': theme.palette.primary.main,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': theme.palette.divider,
            'target-arrow-color': theme.palette.divider,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            // Edge labels are hidden by default to avoid spaghetti; toggled
            // globally via the toolbar or revealed on hover/selection.
            'label': showEdgeLabels ? 'data(label)' : '',
            'font-size': 9,
            'font-family': '"JetBrains Mono", monospace',
            'color': theme.palette.text.secondary,
            'text-background-color': theme.palette.background.paper,
            'text-background-opacity': 1,
            'text-background-padding': '2px',
          } as unknown as cytoscape.Css.Edge,
        },
        {
          selector: 'edge:selected, edge.hover',
          style: {
            'label': 'data(label)',
            'line-color': theme.palette.primary.main,
            'target-arrow-color': theme.palette.primary.main,
            'width': 2,
          } as unknown as cytoscape.Css.Edge,
        },
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.4,
        padding: 24,
      } as unknown as cytoscape.LayoutOptions,
    });

    cy.on('tap', 'node', (e) => {
      const nodeId = e.target.data('id');
      const a = allArtefacts.find((x) => x.id === nodeId) ?? null;
      setSelectedNode(a);
    });

    cy.on('tap', (e) => {
      if (e.target === cy) setSelectedNode(null);
    });

    // Reveal edge labels on hover so users can see the relation type
    // without us crowding the canvas at rest.
    cy.on('mouseover', 'edge', (e) => e.target.addClass('hover'));
    cy.on('mouseout', 'edge', (e) => e.target.removeClass('hover'));

    cyRef.current = cy;
  }, [elements, theme, allArtefacts, showEdgeLabels]);

  useEffect(() => {
    initCy();
    return () => cyRef.current?.destroy();
  }, [initCy]);

  // Search highlight
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass('highlighted');
    if (search.trim()) {
      const q = search.toLowerCase();
      cy.nodes().filter((n) => !n.data('label').toLowerCase().includes(q)).style('opacity', 0.2);
      cy.nodes().filter((n) => n.data('label').toLowerCase().includes(q)).style('opacity', 1);
    } else {
      cy.nodes().style('opacity', 1);
    }
  }, [search]);

  const handleFit = () => cyRef.current?.fit(undefined, 24);

  const handleDownloadSVG = () => {
    if (!cyRef.current) return;
    const svg = (cyRef.current as unknown as { svg: (opts: object) => string }).svg({ full: true, scale: 1 });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dependency-graph.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleKind = (kind: ArtefactKind) => {
    setSelectedKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: focusArtefactId ? '480px' : 'calc(100vh - 160px)', gap: 1 }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Kind filters */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {ARTEFACT_KINDS.map((k) => (
            <Chip
              key={k}
              label={KIND_LABELS[k]}
              size="small"
              onClick={() => toggleKind(k)}
              sx={{
                fontSize: '11px',
                backgroundColor: selectedKinds.includes(k) ? `${kindColors[k]}26` : 'transparent',
                color: selectedKinds.includes(k) ? kindChipColors[theme.palette.mode as 'light' | 'dark'][k] : theme.palette.text.disabled,
                border: `1px solid ${selectedKinds.includes(k) ? kindChipColors[theme.palette.mode as 'light' | 'dark'][k] : theme.palette.divider}`,
                borderRadius: '999px',
              }}
            />
          ))}
        </Box>

        <Box sx={{ flex: 1 }} />

        <TextField
          size="small"
          placeholder="Search node…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ width: 180 }}
        />

        <Tooltip title={showEdgeLabels ? 'Hide edge labels' : 'Show edge labels'}>
          <IconButton size="small" onClick={() => setShowEdgeLabels((v) => !v)} aria-label="Toggle edge labels" sx={{ color: showEdgeLabels ? theme.palette.primary.main : theme.palette.text.secondary }}>
            <Box component="span" sx={{ fontSize: '14px', fontWeight: 600 }}>{showEdgeLabels ? 'A→' : 'A·'}</Box>
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to screen">
          <IconButton size="small" onClick={handleFit} aria-label="Fit to screen"><FitScreenIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Download SVG">
          <IconButton size="small" onClick={handleDownloadSVG} aria-label="Download SVG"><FileDownloadIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>

      {/* Graph canvas — wrapper provides a positioned ancestor for the node panel. */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Box
          ref={containerRef}
          sx={{
            position: 'absolute',
            inset: 0,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            backgroundColor: theme.palette.background.default,
          }}
        />

        {/* Node info panel */}
        {selectedNode && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 280,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(14, 26, 31, 0.12)',
              p: 1.5,
              zIndex: 10,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedNode.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', display: 'block' }}>
                  {selectedNode.id}
                </Typography>
              </Box>
              <Chip
                label={KIND_LABELS[selectedNode.kind]}
                size="small"
                sx={{
                  backgroundColor: `${kindColors[selectedNode.kind]}1A`,
                  color: kindChipColors[theme.palette.mode as 'light' | 'dark'][selectedNode.kind],
                  fontSize: '10px',
                  height: 18,
                  borderRadius: '999px',
                  flexShrink: 0,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                size="small"
                endIcon={<OpenInNewIcon fontSize="small" />}
                onClick={() => navigate(`/${repoId}/${KIND_URL_SEGMENTS[selectedNode.kind]}/${selectedNode.id}`)}
              >
                Open
              </Button>
            </Box>
          </Box>
        )}

        {elements.filter((e) => !e.data.source).length === 0 && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <Typography color="text.secondary">No artefacts to display</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
