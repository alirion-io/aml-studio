import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useStore, useT } from '../../store/store';
import type { Artefact, ArtefactKind } from '../../types/artefact';
import { ARTEFACT_KINDS, KIND_PLURAL_LABELS, KIND_URL_SEGMENTS } from '../../types/artefact';

// Mirrors REF_FIELDS in DependencyGraph — which front-matter fields hold artefact ID refs per kind
const REF_FIELDS: Record<ArtefactKind, string[]> = {
  agent: ['tools', 'knowledge_bases', 'guardrails', 'iam_role', 'model', 'memory_collection'],
  iam: ['tools', 'knowledge_bases', 'collections'],
  tool: [],
  kb: [],
  model: [],
  collection: [],
  guardrail: [],
};

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

interface Props {
  artefact: Artefact;
  repoId: string;
}

export const UsedByTab: React.FC<Props> = ({ artefact, repoId }) => {
  const navigate = useNavigate();
  const t = useT();
  const repositories = useStore((s) => s.repositories);
  const repo = repositories.find((r) => r.id === repoId);
  const allArtefacts = repo?.artefacts ?? [];

  const usedBy = allArtefacts.filter((a) => {
    if (a.id === artefact.id) return false;
    return (REF_FIELDS[a.kind] ?? []).some((field) =>
      extractRefIds(a.frontMatter[field]).includes(artefact.id)
    );
  });

  const grouped: Partial<Record<ArtefactKind, Artefact[]>> = {};
  for (const a of usedBy) {
    if (!grouped[a.kind]) grouped[a.kind] = [];
    grouped[a.kind]!.push(a);
  }
  for (const kind of ARTEFACT_KINDS) {
    grouped[kind]?.sort((a, b) =>
      (a.displayName || a.id).localeCompare(b.displayName || b.id)
    );
  }

  if (usedBy.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary" sx={{ fontSize: '14px' }}>
          {t.usedByEmpty}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {ARTEFACT_KINDS.filter((k) => grouped[k]?.length).map((kind, idx, arr) => (
        <Box key={kind} sx={{ mb: idx < arr.length - 1 ? 3 : 0 }}>
          <Typography
            variant="overline"
            sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em' }}
          >
            {KIND_PLURAL_LABELS[kind]} ({grouped[kind]!.length})
          </Typography>
          <List dense disablePadding sx={{ mt: 0.5 }}>
            {grouped[kind]!.map((a) => (
              <ListItemButton
                key={a.id}
                onClick={() => navigate(`/${repoId}/${KIND_URL_SEGMENTS[a.kind]}/${a.id}`)}
                sx={{ borderRadius: '6px', px: 1.5, py: 0.75 }}
              >
                <ListItemText
                  primary={a.displayName || a.id}
                  secondary={a.id}
                  slotProps={{
                    primary: { style: { fontSize: '13px', fontWeight: 500 } },
                    secondary: { style: { fontSize: '11px', fontFamily: '"JetBrains Mono", monospace' } },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );
};
