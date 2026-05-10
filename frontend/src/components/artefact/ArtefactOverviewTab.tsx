/**
 * AML Studio — Artefact Overview Tab (P-05 §3)
 * Collapsible sections, dependency cards for artefact references,
 * and a rendered markdown body.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import DOMPurify from 'dompurify';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useStore } from '../../store/store';
import type { Artefact, ArtefactKind } from '../../types/artefact';
import { KIND_URL_SEGMENTS, KIND_PLURAL_LABELS } from '../../types/artefact';
import { kindColors, typeColors, semanticTokens } from '../../theme/tokens';
import { KIND_ICONS } from '../shared/kindIcons';
import agentSchema from '../../../public/schemas/agent.schema.json';
import toolSchema from '../../../public/schemas/tool.schema.json';
import kbSchema from '../../../public/schemas/kb.schema.json';
import iamSchema from '../../../public/schemas/iam.schema.json';
import modelSchema from '../../../public/schemas/model.schema.json';
import collectionSchema from '../../../public/schemas/collection.schema.json';
import guardrailSchema from '../../../public/schemas/guardrail.schema.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KIND_SCHEMAS: Record<ArtefactKind, Record<string, any>> = {
  agent: agentSchema, tool: toolSchema, kb: kbSchema, iam: iamSchema,
  model: modelSchema, collection: collectionSchema, guardrail: guardrailSchema,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFieldTitle(key: string, schema: Record<string, any> | null, parentKey?: string): string {
  const fallback = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (!schema) return fallback;
  if (parentKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nested = ((schema.properties as Record<string, any>)?.[parentKey]?.properties as Record<string, any>)?.[key];
    if (nested?.title) return nested.title;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topDef = (schema.properties as Record<string, any>)?.[key];
  if (topDef?.title) return topDef.title;
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSectionTitle(key: string, schema: Record<string, any> | null): string {
  if (schema) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def = (schema.properties as Record<string, any>)?.[key];
    if (def?.title) return def.title.toUpperCase();
  }
  return key.replace(/_/g, ' ').toUpperCase();
}

/** Count the primary array inside a section object (for the section badge). */
function sectionCount(val: unknown): number | undefined {
  if (Array.isArray(val)) return val.length;
  if (val && typeof val === 'object') {
    const arrays = Object.values(val as Record<string, unknown>).filter(Array.isArray);
    if (arrays.length > 0) return (arrays[0] as unknown[]).length;
  }
  return undefined;
}

// ── Collapsible Section ───────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  count?: number;
  defaultOpen?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}> = ({ title, count, defaultOpen = true, primary = false, children }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box sx={{ mb: primary ? 1 : 0.5 }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: primary ? 1 : 0.75,
          cursor: 'pointer',
          borderRadius: '4px',
          userSelect: 'none',
          backgroundColor: open && primary ? `${theme.palette.primary.main}08` : 'transparent',
          '&:hover': { backgroundColor: `${theme.palette.primary.main}0A` },
        }}
      >
        {open
          ? <ExpandMoreIcon sx={{ fontSize: primary ? 18 : 16, color: theme.palette.text.secondary }} />
          : <ChevronRightIcon sx={{ fontSize: primary ? 18 : 16, color: theme.palette.text.secondary }} />
        }
        <Typography
          sx={{
            fontSize: primary ? '12px' : '11px',
            fontWeight: primary ? 700 : 600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: primary ? theme.palette.text.primary : theme.palette.text.secondary,
          }}
        >
          {title}
          {count !== undefined && (
            <Box component="span" sx={{ ml: 0.75, color: theme.palette.text.disabled, fontWeight: 400 }}>
              ({count})
            </Box>
          )}
        </Typography>
      </Box>

      {open && (
        <Box sx={{ pt: primary ? 1.5 : 1.25, pb: 0.5 }}>
          {children}
        </Box>
      )}
    </Box>
  );
};

// ── Field row ─────────────────────────────────────────────────────────────────

const FieldRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 2, mb: 0.75, alignItems: 'flex-start', pl: 2 }}>
    <Typography variant="body2" sx={{ fontWeight: 400, minWidth: 180, flexShrink: 0, color: 'text.secondary', fontSize: '13px' }}>
      {label}
    </Typography>
    <Box sx={{ flex: 1 }}>
      {value ?? <Typography variant="body2" color="text.disabled">—</Typography>}
    </Box>
  </Box>
);

// ── Dependency card ───────────────────────────────────────────────────────────

const DepCard: React.FC<{ artefactId: string; repoId: string; allArtefacts: Artefact[] }> = ({
  artefactId, repoId, allArtefacts,
}) => {
  const theme = useTheme();
  const target = allArtefacts.find((a) => a.id === artefactId);

  const handleOpen = () => {
    if (!target) return;
    const url = `${window.location.href.split('#')[0]}#/${encodeURIComponent(repoId)}/${KIND_URL_SEGMENTS[target.kind]}/${encodeURIComponent(target.id)}`;
    window.open(url, '_blank', 'noopener');
  };

  if (!target) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          mb: 0.75,
          ml: 2,
          borderRadius: '6px',
          border: `1px dashed ${theme.palette.error.main}`,
          opacity: 0.6,
        }}
      >
        <Typography sx={{ fontSize: '13px', fontFamily: '"JetBrains Mono", monospace', color: theme.palette.error.main }}>
          {artefactId}
        </Typography>
        <Typography sx={{ fontSize: '11px', color: theme.palette.text.disabled }}>not found</Typography>
      </Box>
    );
  }

  const KindIcon = KIND_ICONS[target.kind];
  const kindColor = kindColors[target.kind];
  const subLabel = (target.frontMatter.meta?.type as string) ||
    (target.frontMatter.meta?.category as string) ||
    KIND_PLURAL_LABELS[target.kind].slice(0, -1);

  return (
    <Box
      onClick={handleOpen}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        mb: 0.75,
        ml: 2,
        borderRadius: '6px',
        border: `1px solid ${theme.palette.divider}`,
        cursor: 'pointer',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover': {
          borderColor: kindColor,
          backgroundColor: `${kindColor}0A`,
        },
      }}
    >
      <KindIcon sx={{ fontSize: 18, color: kindColor, flexShrink: 0 }} />
      <Box>
        <Typography sx={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>
          {target.displayName || target.id}
        </Typography>
        <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
          {subLabel}
        </Typography>
      </Box>
    </Box>
  );
};

// ── Schema tree (expandable, for interface.input / interface.output) ─────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function schemaConstraintHint(def: Record<string, any>): string | null {
  if (def.maxLength != null) return `≤ ${def.maxLength} chars`;
  if (def.maxItems != null) return `≤ ${def.maxItems} items`;
  if (def.format) return def.format;
  if (def.enum) return 'enum';
  return null;
}

// Type badge tokens are now in theme/tokens.ts — imported as typeColors above.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SchemaTreeRow: React.FC<{ name: string; def: Record<string, any>; required: boolean; depth?: number }> = ({
  name, def, required, depth = 0,
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const isObjectType    = def.type === 'object' && def.properties;
  const isArrayOfObjs   = def.type === 'array' && def.items?.type === 'object' && def.items?.properties;
  const isArrayOfPrims  = def.type === 'array' && def.items && !isArrayOfObjs;
  const expandable      = isObjectType || isArrayOfObjs || isArrayOfPrims;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let childEntries: Array<[string, Record<string, any>]> = [];
  let childRequired: string[] = [];
  let childIsItems = false;

  if (isObjectType) {
    childEntries  = Object.entries(def.properties);
    childRequired = def.required ?? [];
  } else if (isArrayOfObjs) {
    childEntries  = Object.entries(def.items.properties);
    childRequired = def.items.required ?? [];
  } else if (isArrayOfPrims) {
    childEntries = [['items', def.items as Record<string, any>]];
    childIsItems = true;
  }

  const hint       = schemaConstraintHint(def);
  const indentPx   = depth * 20 + 16;
  const mode = theme.palette.mode;
  const nameColor = depth === 0
    ? theme.palette.text.primary
    : depth === 1
      ? semanticTokens[mode].review
      : `${semanticTokens[mode].review}CC`;
  const typeStr = Array.isArray(def.type) ? def.type.join('') : def.type as string | undefined;
  const badgeTokens = (typeColors[typeStr ?? ''] ?? typeColors._fallback)[mode];

  return (
    <>
      <Box
        onClick={expandable ? () => setOpen((v) => !v) : undefined}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          pl: `${indentPx}px`, pr: 2, py: 0.75,
          cursor: expandable ? 'pointer' : 'default',
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: 'relative',
          '&:hover': expandable ? { backgroundColor: `${theme.palette.primary.main}08` } : {},
        }}
      >
        {depth > 0 && (
          <Box sx={{
            position: 'absolute',
            left: `${(depth - 1) * 20 + 28}px`,
            top: 0, bottom: 0, width: '1px',
            backgroundColor: theme.palette.divider,
          }} />
        )}
        <Box sx={{ width: 14, flexShrink: 0 }}>
          {expandable && (
            open
              ? <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              : <ChevronRightIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          )}
        </Box>
        <Typography sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '13px',
          fontWeight: depth === 0 ? 600 : 500,
          color: nameColor,
          minWidth: 120, flexShrink: 0,
          fontStyle: childIsItems ? 'italic' : 'normal',
        }}>
          {name}
        </Typography>
        {required && (
          <Box component="span" sx={{
            fontSize: '10px',
            color: semanticTokens[mode].warning,
            border: `1px solid ${semanticTokens[mode].warning}66`,
            borderRadius: '3px', px: 0.5, lineHeight: '16px', flexShrink: 0,
          }}>
            required
          </Box>
        )}
        {typeStr && (
          <Box component="span" sx={{
            fontSize: '11px', fontFamily: '"JetBrains Mono", monospace',
            px: 0.75, py: 0.125, borderRadius: '4px',
            backgroundColor: badgeTokens.bg,
            color: badgeTokens.color, flexShrink: 0,
          }}>
            {typeStr}
          </Box>
        )}
        <Typography sx={{ fontSize: '13px', color: 'text.secondary', flex: 1, minWidth: 0 }}>
          {def.description ?? ''}
        </Typography>
        {hint && (
          <Typography sx={{ fontSize: '11px', color: 'text.disabled', flexShrink: 0, fontFamily: '"JetBrains Mono", monospace' }}>
            {hint}
          </Typography>
        )}
      </Box>
      {open && childEntries.map(([childName, childDef]) => (
        <SchemaTreeRow
          key={childName}
          name={childName}
          def={childDef}
          required={childRequired.includes(childName)}
          depth={depth + 1}
        />
      ))}
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SchemaTreePanel: React.FC<{ label: string; schema: Record<string, any> }> = ({ label, schema }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = schema?.properties ?? {};
  const required: string[] = schema?.required ?? [];
  const count = Object.keys(props).length;

  return (
    <Box sx={{ mb: 0.5 }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.875, cursor: 'pointer',
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '&:hover': { backgroundColor: `${theme.palette.primary.main}0A` },
        }}
      >
        {open
          ? <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          : <ChevronRightIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        }
        <Typography sx={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: theme.palette.text.primary }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '11px', color: 'text.disabled' }}>
          {schema?.type ?? 'object'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {count > 0 && (
          <Typography sx={{ fontSize: '11px', color: 'text.disabled', fontFamily: '"JetBrains Mono", monospace' }}>
            {count} {count === 1 ? 'property' : 'properties'}
          </Typography>
        )}
      </Box>
      {open && Object.entries(props).map(([propName, propDef]) => (
        <SchemaTreeRow
          key={propName}
          name={propName}
          def={propDef as Record<string, any>}
          required={required.includes(propName)}
          depth={0}
        />
      ))}
    </Box>
  );
};

// ── Schema parameter table ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SchemaTable: React.FC<{ schema: Record<string, any> }> = ({ schema }) => {
  const theme = useTheme();
  const props = schema?.properties ?? {};
  const required = schema?.required ?? [];
  const rows = Object.entries(props).map(([name, def]: [string, unknown]) => ({
    name,
    type: (def as Record<string, string>).type ?? '',
    required: required.includes(name),
    description: (def as Record<string, string>).description ?? '',
  }));
  if (rows.length === 0) return <Typography variant="body2" color="text.disabled">—</Typography>;
  return (
    <Table size="small" sx={{ ml: 2, '& td, & th': { borderColor: theme.palette.divider, fontSize: '13px', py: 0.5 } }}>
      <TableHead>
        <TableRow>
          <TableCell>Parameter</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Required</TableCell>
          <TableCell>Description</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>{r.name}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.required ? 'Yes' : 'No'}</TableCell>
            <TableCell sx={{ color: 'text.secondary' }}>{r.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// ── Value renderer ────────────────────────────────────────────────────────────

function renderValue(
  value: unknown,
  repoId: string,
  allArtefacts: Artefact[],
  sectionKey?: string,
): React.ReactNode {
  if (value === null || value === undefined) return <Typography variant="body2" color="text.disabled">—</Typography>;
  if (typeof value === 'boolean') {
    return (
      <Typography variant="body2" sx={{ color: value ? 'success.main' : 'text.secondary', fontWeight: 500 }}>
        {value ? 'Yes' : 'No'}
      </Typography>
    );
  }
  if (typeof value === 'number') return <Typography variant="body2">{value}</Typography>;
  if (typeof value === 'string') {
    const refdArtefact = allArtefacts.find((a) => a.id === value);
    if (refdArtefact) return <DepCard artefactId={value} repoId={repoId} allArtefacts={allArtefacts} />;
    return <Typography variant="body2" sx={{ fontSize: '13px' }}>{value}</Typography>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <Typography variant="body2" color="text.disabled">—</Typography>;
    // Check if items are artefact refs (plain strings)
    const firstIsRef = typeof value[0] === 'string' && allArtefacts.some((a) => a.id === value[0]);
    if (firstIsRef) {
      return (
        <Box sx={{ mt: 0.5 }}>
          {(value as string[]).map((id) => (
            <DepCard key={id} artefactId={id} repoId={repoId} allArtefacts={allArtefacts} />
          ))}
        </Box>
      );
    }
    // Check if items are { ref: "..." } objects (e.g. IAM tools / knowledge_bases / collections)
    const firstItem = value[0];
    const firstIsRefObj = typeof firstItem === 'object' && firstItem !== null
      && 'ref' in (firstItem as object) && typeof (firstItem as Record<string, unknown>).ref === 'string';
    if (firstIsRefObj) {
      return (
        <Box sx={{ mt: 0.5 }}>
          {(value as Array<{ ref: string }>).map((item) => (
            <DepCard key={item.ref} artefactId={item.ref} repoId={repoId} allArtefacts={allArtefacts} />
          ))}
        </Box>
      );
    }
    // Plain value array → chips
    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {(value as unknown[]).map((item, i) => (
          <Chip key={i} label={String(item)} size="small" sx={{ fontSize: '11px' }} />
        ))}
      </Box>
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <Typography variant="body2" color="text.disabled">—</Typography>;
    return (
      <Box>
        {entries.map(([k, v]) => (
          <FieldRow
            key={k}
            label={k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            value={renderValue(v, repoId, allArtefacts, sectionKey)}
          />
        ))}
      </Box>
    );
  }
  return <Typography variant="body2" sx={{ fontSize: '13px' }}>{String(value)}</Typography>;
}

// Sub-label for array sections that contain artefact IDs
function renderArraySubLabel(key: string): string {
  return key.replace(/_/g, ' ').toUpperCase();
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  artefact: Artefact;
  repoId: string;
}

export const ArtefactOverviewTab: React.FC<Props> = ({ artefact, repoId }) => {
  const [renderedBody, setRenderedBody] = useState<string>('');
  const theme = useTheme();

  const repositories = useStore((s) => s.repositories);
  const repo = repositories.find((r) => r.id === repoId);
  const allArtefacts: Artefact[] = useMemo(() => repo?.artefacts ?? [], [repo]);

  const schema = useMemo(() => KIND_SCHEMAS[artefact.kind] ?? null, [artefact.kind]);

  useEffect(() => {
    let cancelled = false;
    if (!artefact.body) { setRenderedBody(''); return; }
    remark()
      .use(remarkHtml, { sanitize: false })
      .process(artefact.body)
      .then((file) => {
        if (!cancelled) setRenderedBody(DOMPurify.sanitize(String(file), {
          USE_PROFILES: { html: true },
          FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
        }));
      })
      .catch(() => { if (!cancelled) setRenderedBody(''); });
    return () => { cancelled = true; };
  }, [artefact.body]);

  const fm = artefact.frontMatter;

  // BASICS section: pull from fm.meta
  const metaEntries = fm.meta ? Object.entries(fm.meta as Record<string, unknown>) : [];

  // Dynamic sections: everything except known top-level scalar fields and meta
  const skipKeys = new Set([
    'spec_version', 'agent_id', 'tool_id', 'kb_id', 'iam_id', 'model_id',
    'collection_id', 'guardrail_id', 'version', 'status', 'meta', 'last_updated',
  ]);
  const dynamicSections = Object.entries(fm).filter(([k]) => !skipKeys.has(k));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>

      {/* BASICS — primary tier: always open, heavier heading */}
      {metaEntries.length > 0 && (
        <Section title="Basics" defaultOpen primary>
          {metaEntries.map(([k, v]) => (
            <FieldRow
              key={k}
              label={getFieldTitle(k, schema, 'meta')}
              value={renderValue(v, repoId, allArtefacts, 'meta')}
            />
          ))}
        </Section>
      )}

      {/* Dynamic sections */}
      {dynamicSections.map(([section, val]) => {
        if (val === null || val === undefined) return null;
        const title = getSectionTitle(section, schema);
        const count = sectionCount(val);

        // Object section: render sub-fields, detect arrays for dep cards
        if (typeof val === 'object' && !Array.isArray(val)) {
          const entries = Object.entries(val as Record<string, unknown>);
          return (
            <Section key={section} title={title} count={count}>
              {entries.map(([k, v]) => {
                // Array of artefact refs → dep cards with sub-label
                if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
                  const isRefs = allArtefacts.some((a) => a.id === v[0]);
                  if (isRefs) {
                    return (
                      <Box key={k}>
                        <Typography sx={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.palette.text.disabled, pl: 2, mb: 0.5, mt: 0.5 }}>
                          {renderArraySubLabel(k)}
                        </Typography>
                        {(v as string[]).map((id) => (
                          <DepCard key={id} artefactId={id} repoId={repoId} allArtefacts={allArtefacts} />
                        ))}
                      </Box>
                    );
                  }
                }
                // JSON Schema object (e.g. interface.input / interface.output)
                if (typeof v === 'object' && v !== null && 'properties' in (v as object)) {
                  return (
                    <SchemaTreePanel
                      key={k}
                      label={k.toUpperCase()}
                      schema={v as Record<string, any>}
                    />
                  );
                }
                // Schema/parameters table
                if ((k === 'schema' || k === 'parameters') && typeof v === 'object' && v !== null) {
                  return (
                    <Box key={k} sx={{ pl: 2, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 400, mb: 0.5, fontSize: '13px' }}>
                        {getFieldTitle(k, schema, section)}
                      </Typography>
                      <SchemaTable schema={v as Record<string, unknown>} />
                    </Box>
                  );
                }
                return (
                  <FieldRow
                    key={k}
                    label={getFieldTitle(k, schema, section)}
                    value={renderValue(v, repoId, allArtefacts, section)}
                  />
                );
              })}
            </Section>
          );
        }

        // Top-level array (e.g. list of ref IDs)
        if (Array.isArray(val)) {
          return (
            <Section key={section} title={title} count={val.length}>
              {renderValue(val, repoId, allArtefacts, section)}
            </Section>
          );
        }

        // Scalar
        return (
          <Section key={section} title={title}>
            <FieldRow
              label={title.charAt(0) + title.slice(1).toLowerCase()}
              value={renderValue(val, repoId, allArtefacts, section)}
            />
          </Section>
        );
      })}

      {/* Markdown body */}
      {artefact.body && (
        <Section title="Behaviour / Description" defaultOpen={false}>
          <Box
            component="div"
            sx={{
              pl: 2,
              '& h2': { fontSize: '16px', fontWeight: 300, mt: 2, mb: 1, color: theme.palette.text.secondary },
              '& h3': { fontSize: '14px', fontWeight: 400, mt: 1.5, mb: 0.5 },
              '& p': { fontSize: '14px', lineHeight: '21px', mb: 1 },
              '& ul, & ol': { fontSize: '14px', lineHeight: '21px', pl: 2.5 },
              '& code': { fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', backgroundColor: theme.palette.background.default, px: 0.5, borderRadius: '3px' },
              '& pre': { backgroundColor: theme.palette.background.default, p: 1.5, borderRadius: '4px', overflow: 'auto', fontSize: '12px', fontFamily: '"JetBrains Mono", monospace' },
            }}
            dangerouslySetInnerHTML={{ __html: renderedBody }}
          />
        </Section>
      )}
    </Box>
  );
};
