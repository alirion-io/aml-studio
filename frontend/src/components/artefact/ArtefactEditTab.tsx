/**
 * AML Studio — Artefact Edit Tab (P-06 + P-07)
 * Schema-driven form editor + raw Monaco editor with toggle.
 * Fields are dynamically rendered from the AML JSON Schemas via Ajv.
 */

import React, { useState, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useBlocker } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Autocomplete,
  Alert,
  Divider,
  Tooltip,
  useTheme,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CodeIcon from '@mui/icons-material/Code';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { lazy, Suspense } from 'react';
import { useStore, useT } from '../../store/store';
import type { Artefact, ArtefactKind } from '../../types/artefact';
import { KIND_FILE_EXTENSIONS, KIND_FOLDER_NAMES } from '../../types/artefact';
import { serialiseAmlFile, parseAmlFile, collectMarkdownFields, parseBodySections, serializeBodySections } from '../../utils/amlParser';
import { validateArtefact } from '../../utils/validation';
import config from '../../config/config';
import agentSchema from '../../../public/schemas/agent.schema.json';
import toolSchema from '../../../public/schemas/tool.schema.json';
import kbSchema from '../../../public/schemas/kb.schema.json';
import iamSchema from '../../../public/schemas/iam.schema.json';
import modelSchema from '../../../public/schemas/model.schema.json';
import collectionSchema from '../../../public/schemas/collection.schema.json';
import guardrailSchema from '../../../public/schemas/guardrail.schema.json';

// Lazy-load Monaco to reduce initial bundle size
const MonacoEditor = lazy(() => import('@monaco-editor/react').then((m) => ({ default: m.Editor })));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCHEMAS: Record<ArtefactKind, any> = {
  agent: agentSchema,
  tool: toolSchema,
  kb: kbSchema,
  iam: iamSchema,
  model: modelSchema,
  collection: collectionSchema,
  guardrail: guardrailSchema,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadSchema(kind: ArtefactKind): Promise<any> {
  return Promise.resolve(SCHEMAS[kind]);
}

export interface ArtefactEditTabHandle {
  save: () => void;
  switchMode: (m: 'form' | 'raw') => void;
  discard: () => void;
}

export interface ToolbarState {
  mode: 'form' | 'raw';
  isDirty: boolean;
  isSaving: boolean;
  savedFeedback: boolean;
}

interface Props {
  kind: ArtefactKind;
  repoId: string;
  artefact: Artefact | null;
  onSaved: (id: string) => void;
  /** When provided, EditTab hides its own toolbar and pushes state changes to the parent. */
  onToolbarStateChange?: (state: ToolbarState) => void;
}

// ─── Per-kind Markdown body templates ────────────────────────────────────────

const BODY_TEMPLATES: Record<ArtefactKind, string> = {
  agent:
    '# Purpose\n\nDescribe what this agent does, who uses it, and in what context.\n\n' +
    '# Behaviour\n\nDescribe the agent\'s tone, priorities, and approach.\n\n' +
    '# Examples\n\nExample interactions demonstrating expected behaviour.\n',
  guardrail:
    '## Description\n\nDescribe what this guardrail enforces.\n\n' +
    '## Rules\n\nList of rules and content policies to enforce.\n\n' +
    '## Examples\n\nExamples of acceptable and blocked content.\n',
  tool:
    '## Description\n\nDescribe what this tool does.\n\n' +
    '## Usage\n\nUsage guidelines and examples.\n',
  kb:
    '## Description\n\nDescribe the knowledge base content and intended use.\n',
  iam:
    '## Description\n\nDescribe this IAM role and its permissions.\n',
  model:
    '## Description\n\nDescribe the model configuration and intended use.\n',
  collection:
    '## Description\n\nDescribe this memory collection and its contents.\n',
};

// ─── MapEditor: editable key→object map for additionalProperties schemas ────

interface MapEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemSchema: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: Record<string, any>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rootSchema: Record<string, any>;
  keyPlaceholder?: string;
}

const MapEditor: React.FC<MapEditorProps> = ({ itemSchema, value, onChange, rootSchema, keyPlaceholder = 'key' }) => {
  const theme = useTheme();
  const [newKey, setNewKey] = useState('');

  const entries = Object.entries(value ?? {});
  const requiredFields: string[] = itemSchema.required ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: Record<string, any> = itemSchema.properties ?? {};

  const addEntry = () => {
    const k = newKey.trim();
    if (!k || k in (value ?? {})) return;
    onChange({ ...(value ?? {}), [k]: {} });
    setNewKey('');
  };

  const removeEntry = (k: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { [k]: _removed, ...rest } = value as Record<string, any>;
    onChange(rest);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (entryKey: string, field: string, v: any) =>
    onChange({ ...(value ?? {}), [entryKey]: { ...((value ?? {})[entryKey] ?? {}), [field]: v } });

  return (
    <Box>
      {entries.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
          {entries.map(([entryKey, entryValue]) => (
            <Box
              key={entryKey}
              sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '6px', p: 1.5 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', fontWeight: 600, color: theme.palette.primary.light }}>
                  {entryKey}
                </Typography>
                <IconButton size="small" onClick={() => removeEntry(entryKey)} sx={{ color: 'error.main' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              {Object.entries(props).map(([field, rawDef]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fd = rawDef as Record<string, any>;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const refDef: Record<string, any> = fd['$ref'] ? resolveRef(fd['$ref'], rootSchema) : {};
                const def = { ...refDef, ...fd };
                const fieldLabel = (def.title as string | undefined) ?? field.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                const isReq = requiredFields.includes(field);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const v = (entryValue as Record<string, any>)?.[field];
                const isLong = (def.minLength ?? 0) > 60 || (def.description?.length ?? 0) > 60;
                return (
                  <Box key={field} sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.25, fontWeight: 500 }}>
                      {fieldLabel}{isReq && ' *'}
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={v ?? ''}
                      onChange={(e) => updateField(entryKey, field, e.target.value)}
                      multiline={isLong}
                      rows={isLong ? 2 : 1}
                    />
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEntry(); } }}
          placeholder={keyPlaceholder}
          sx={{ maxWidth: 180, '& input': { fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' } }}
        />
        <Button size="small" startIcon={<AddIcon />} onClick={addEntry} variant="outlined">
          Add
        </Button>
      </Box>
    </Box>
  );
};

// ─── ObjectListEditor: +Add pattern for arrays of objects ────────────────────

interface ObjectListEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemSchema: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: Record<string, any>[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rootSchema: Record<string, any>;
  label: string;
  description?: string;
  /** Maps sub-field names to autocomplete option lists (e.g. { ref: ['tool-a', 'tool-b'] }) */
  fieldOptions?: Record<string, string[]>;
}

const ObjectListEditor: React.FC<ObjectListEditorProps> = ({
  itemSchema, value, onChange, rootSchema, label, description, fieldOptions,
}) => {
  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Record<string, any>[] = Array.isArray(value) ? value : [];
  const requiredFields: string[] = itemSchema.required ?? [];
  const props: Record<string, unknown> = itemSchema.properties ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addItem = () => onChange([...items, {} as Record<string, any>]);
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateItem = (i: number, field: string, v: any) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, [field]: v } : item)));

  return (
    <Box sx={{ mb: 1.5 }}>
      {items.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
          {items.map((item, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '6px',
              }}
            >
              {Object.entries(props).map(([field, rawDef]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fd = rawDef as Record<string, any>;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const refDef: Record<string, any> = fd['$ref'] ? resolveRef(fd['$ref'], rootSchema) : {};
                const def = { ...refDef, ...fd };
                const fieldLabel = def.title ?? field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const isReq = requiredFields.includes(field);
                const v = item[field];

                if (def.type === 'boolean') {
                  return (
                    <FormControlLabel
                      key={field}
                      control={
                        <Switch
                          checked={Boolean(v ?? def.default ?? false)}
                          onChange={(e) => updateItem(i, field, e.target.checked)}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">{fieldLabel}{isReq && ' *'}</Typography>}
                      sx={{ mr: 1 }}
                    />
                  );
                }
                if (def.enum) {
                  return (
                    <FormControl key={field} size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>{fieldLabel}{isReq && ' *'}</InputLabel>
                      <Select
                        value={v ?? def.default ?? ''}
                        onChange={(e) => updateItem(i, field, e.target.value)}
                        label={`${fieldLabel}${isReq ? ' *' : ''}`}
                      >
                        {def.enum.map((opt: string) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </Select>
                    </FormControl>
                  );
                }
                if (def.type === 'integer' || def.type === 'number') {
                  return (
                    <TextField
                      key={field}
                      size="small"
                      type="number"
                      label={`${fieldLabel}${isReq ? ' *' : ''}`}
                      value={v ?? ''}
                      onChange={(e) => updateItem(i, field, e.target.value === '' ? undefined : Number(e.target.value))}
                      slotProps={{ htmlInput: { min: def.minimum, max: def.maximum } }}
                      sx={{ width: 130 }}
                    />
                  );
                }
                const acOptions = fieldOptions?.[field];
                if (acOptions && acOptions.length > 0) {
                  return (
                    <Autocomplete
                      key={field}
                      freeSolo
                      options={acOptions}
                      inputValue={v ?? ''}
                      onInputChange={(_, newVal) => updateItem(i, field, newVal)}
                      size="small"
                      sx={{ width: 260 }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label={`${fieldLabel}${isReq ? ' *' : ''}`}
                        />
                      )}
                    />
                  );
                }
                return (
                  <TextField
                    key={field}
                    size="small"
                    label={`${fieldLabel}${isReq ? ' *' : ''}`}
                    value={v ?? ''}
                    onChange={(e) => updateItem(i, field, e.target.value)}
                    sx={{ width: 200 }}
                  />
                );
              })}
              <IconButton
                size="small"
                onClick={() => removeItem(i)}
                sx={{ ml: 'auto', color: 'error.main' }}
                aria-label={`Remove ${label}`}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      <Button size="small" startIcon={<AddIcon />} onClick={addItem} variant="outlined">
        Add {label}
      </Button>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
};

// ─── ParameterTableEditor: editable parameter table for JSON Schema objects ───

const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'];

interface ParameterRow {
  name: string;
  type: string[];                               // multi-type (JSON Schema allows string or array)
  required: boolean;
  description: string;
  objectSchema?: Record<string, unknown>;       // sub-properties when type includes 'object'
  arrayItemsType?: string;                      // items type when type includes 'array'
  arrayObjectSchema?: Record<string, unknown>;  // items sub-properties when arrayItemsType === 'object'
}

interface ParameterTableEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any> | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: Record<string, any>) => void;
  label: string;
  required: boolean;
  description?: string;
  /** When true (default), renders its own label/description header. Set false when wrapped in FieldRow. */
  showLabel?: boolean;
  /** Nesting depth — controls indent guide styling. */
  depth?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeParameterRows(value: Record<string, any> | null | undefined): ParameterRow[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, Record<string, any>> = value?.properties ?? {};
  const requiredList: string[] = value?.required ?? [];
  return Object.entries(properties).map(([name, def]) => {
    const rawType = def.type;
    const typeArr: string[] = Array.isArray(rawType) ? rawType : rawType ? [rawType] : ['string'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsDef = def.items as Record<string, any> | undefined;
    const arrayItemsRawType = Array.isArray(itemsDef?.type) ? itemsDef!.type[0] : itemsDef?.type;
    return {
      name,
      type: typeArr,
      required: requiredList.includes(name),
      description: def.description ?? '',
      objectSchema: typeArr.includes('object')
        ? { type: 'object', properties: def.properties ?? {}, ...(def.required?.length ? { required: def.required } : {}) }
        : undefined,
      arrayItemsType: typeArr.includes('array') ? (arrayItemsRawType ?? 'string') : undefined,
      arrayObjectSchema: typeArr.includes('array') && arrayItemsRawType === 'object'
        ? { type: 'object', properties: itemsDef!.properties ?? {}, ...(itemsDef!.required?.length ? { required: itemsDef!.required } : {}) }
        : undefined,
    };
  });
}

function rowsToSchema(rows: ParameterRow[]): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {};
  const requiredList: string[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const typeValue: string | string[] = row.type.length === 1 ? row.type[0] : row.type.length > 0 ? row.type : 'string';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const def: Record<string, any> = { type: typeValue };
    if (row.description.trim()) def.description = row.description.trim();
    if (row.type.includes('object') && row.objectSchema) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = row.objectSchema as Record<string, any>;
      if (sub.properties && Object.keys(sub.properties as object).length > 0) {
        def.properties = sub.properties;
        if (Array.isArray(sub.required) && sub.required.length > 0) def.required = sub.required;
      }
    }
    if (row.type.includes('array')) {
      const itemsType = row.arrayItemsType ?? 'string';
      if (itemsType === 'object' && row.arrayObjectSchema) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = row.arrayObjectSchema as Record<string, any>;
        def.items = { type: 'object', ...(sub.properties ? { properties: sub.properties } : {}), ...(Array.isArray(sub.required) && sub.required.length > 0 ? { required: sub.required } : {}) };
      } else {
        def.items = { type: itemsType };
      }
    }
    properties[name] = def;
    if (row.required) requiredList.push(name);
  }
  const result: Record<string, unknown> = { type: 'object', properties };
  if (requiredList.length > 0) result.required = requiredList;
  return result;
}

// Compare only the properties/required fields that ParameterTableEditor manages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paramSchemaKey(v: Record<string, any> | null | undefined): string {
  return JSON.stringify({ properties: v?.properties ?? {}, required: v?.required ?? [] });
}

const ParameterTableEditor: React.FC<ParameterTableEditorProps> = ({
  value, onChange, label, required, description, showLabel = true, depth = 0,
}) => {
  const theme = useTheme();
  const lastEmittedKeyRef = useRef<string>(paramSchemaKey(value));
  const [rows, setRowsState] = useState<ParameterRow[]>(() => computeParameterRows(value));
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Sync from external value changes (skip our own echoes)
  useEffect(() => {
    const incoming = paramSchemaKey(value);
    if (incoming !== lastEmittedKeyRef.current) {
      setRowsState(computeParameterRows(value));
      lastEmittedKeyRef.current = incoming;
    }
  }, [value]);

  const emitChange = (newRows: ParameterRow[]) => {
    const schema = rowsToSchema(newRows);
    lastEmittedKeyRef.current = paramSchemaKey(schema);
    onChange(schema);
  };

  const setRows = (updater: ParameterRow[] | ((prev: ParameterRow[]) => ParameterRow[])) => {
    setRowsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      emitChange(next);
      return next;
    });
  };

  const updateRow = (idx: number, update: Partial<ParameterRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...update } : r)));

  const addRow = () => {
    // Use setRowsState directly so the empty row is shown immediately
    // (emitChange skips empty names so the schema won't change yet)
    setRowsState((prev) => {
      const next = [...prev, { name: '', type: ['string'], required: false, description: '' }];
      emitChange(next);
      return next;
    });
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setExpandedRows((prev) => {
      const next: Record<number, boolean> = {};
      for (const [k, v] of Object.entries(prev)) {
        const ki = Number(k);
        if (ki !== idx) next[ki > idx ? ki - 1 : ki] = v as boolean;
      }
      return next;
    });
  };

  const toggleExpand = (idx: number) =>
    setExpandedRows((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const isExpandable = (row: ParameterRow) =>
    row.type.includes('object') || row.type.includes('array');

  const cellSx = { border: `1px solid ${theme.palette.divider}` };

  return (
    <Box sx={{
      mb: showLabel ? 1.5 : 0,
      ...(depth > 0 ? { borderLeft: `2px solid ${theme.palette.primary.main}30`, pl: 1.5 } : {}),
    }}>
      {showLabel && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            {label}{required && ' *'}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {description}
            </Typography>
          )}
        </>
      )}
      {rows.length > 0 && (
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            mb: 1,
            '& th': { ...cellSx, px: 1, py: 0.5, textAlign: 'left', fontSize: '11px', fontWeight: 500, color: theme.palette.text.secondary, backgroundColor: theme.palette.background.default, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
            '& td': { ...cellSx, px: 0.75, py: 0.5, verticalAlign: 'middle' },
          }}
        >
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ minWidth: 140 }}>Type</th>
              <th style={{ width: 80, textAlign: 'center' }}>Required</th>
              <th>Description</th>
              <th style={{ width: 56 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td>
                    <TextField
                      size="small"
                      value={row.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                      placeholder="param_name"
                      variant="standard"
                      sx={{ '& input': { fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' } }}
                      fullWidth
                    />
                  </td>
                  <td>
                    <Autocomplete
                      multiple
                      size="small"
                      options={PARAM_TYPES}
                      value={row.type}
                      onChange={(_, newValue) => {
                        const newType = newValue.length > 0 ? newValue : ['string'];
                        const upd: Partial<ParameterRow> = { type: newType };
                        if (!newType.includes('object')) upd.objectSchema = undefined;
                        if (!newType.includes('array')) { upd.arrayItemsType = undefined; upd.arrayObjectSchema = undefined; }
                        updateRow(idx, upd);
                      }}
                      disableCloseOnSelect
                      slotProps={{ chip: { size: 'small', sx: { fontSize: '10px', height: 18 } } }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="standard"
                          size="small"
                          placeholder={row.type.length === 0 ? 'type…' : ''}
                          sx={{ fontSize: '12px', minWidth: 100 }}
                        />
                      )}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Switch
                      checked={row.required}
                      onChange={(e) => updateRow(idx, { required: e.target.checked })}
                      size="small"
                    />
                  </td>
                  <td>
                    <TextField
                      size="small"
                      value={row.description}
                      onChange={(e) => updateRow(idx, { description: e.target.value })}
                      placeholder="Description…"
                      variant="standard"
                      sx={{ fontSize: '12px' }}
                      fullWidth
                    />
                  </td>
                  <td>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isExpandable(row) && (
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(idx)}
                          sx={{ color: expandedRows[idx] ? 'primary.main' : 'text.disabled' }}
                          aria-label={expandedRows[idx] ? 'Collapse' : 'Expand nested schema'}
                        >
                          {expandedRows[idx]
                            ? <ExpandMoreIcon fontSize="small" />
                            : <ChevronRightIcon fontSize="small" />
                          }
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removeRow(idx)}
                        sx={{ color: 'error.main' }}
                        aria-label="Remove parameter"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </td>
                </tr>
                {expandedRows[idx] && isExpandable(row) && (
                  <tr>
                    <td colSpan={5} style={{ padding: '10px 12px', backgroundColor: theme.palette.background.default }}>
                      {row.type.includes('object') && (
                        <Box>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>
                            Properties of <Box component="span" sx={{ fontFamily: '"JetBrains Mono", monospace', textTransform: 'none' }}>{row.name || 'object'}</Box>
                          </Typography>
                          <ParameterTableEditor
                            value={row.objectSchema as Record<string, any> | undefined}
                            onChange={(v) => updateRow(idx, { objectSchema: v })}
                            label=""
                            required={false}
                            showLabel={false}
                            depth={depth + 1}
                          />
                        </Box>
                      )}
                      {row.type.includes('array') && (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px', flexShrink: 0 }}>
                              Items type
                            </Typography>
                            <Select
                              size="small"
                              value={row.arrayItemsType ?? 'string'}
                              onChange={(e) => {
                                const t = e.target.value;
                                updateRow(idx, { arrayItemsType: t, arrayObjectSchema: t !== 'object' ? undefined : row.arrayObjectSchema });
                              }}
                              variant="standard"
                              sx={{ fontSize: '12px', minWidth: 100 }}
                            >
                              {PARAM_TYPES.filter((t) => t !== 'array').map((t) => (
                                <MenuItem key={t} value={t} sx={{ fontSize: '12px' }}>{t}</MenuItem>
                              ))}
                            </Select>
                          </Box>
                          {row.arrayItemsType === 'object' && (
                            <Box>
                              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>
                                Item properties of <Box component="span" sx={{ fontFamily: '"JetBrains Mono", monospace', textTransform: 'none' }}>{row.name || 'array'}</Box>
                              </Typography>
                              <ParameterTableEditor
                                value={row.arrayObjectSchema as Record<string, any> | undefined}
                                onChange={(v) => updateRow(idx, { arrayObjectSchema: v })}
                                label=""
                                required={false}
                                showLabel={false}
                                depth={depth + 1}
                              />
                            </Box>
                          )}
                        </Box>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </Box>
      )}
      <Button size="small" startIcon={<AddIcon />} onClick={addRow} variant="outlined">
        Add parameter
      </Button>
    </Box>
  );
};

// ─── FieldRow: two-column label + input layout ───────────────────────────────

interface FieldRowProps {
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, description, required, children }) => {
  const descRef = useRef<HTMLSpanElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const check = () => setIsClamped(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [description]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
        gap: { xs: 0.75, sm: 3 },
        alignItems: 'start',
        mb: 2.5,
      }}
    >
      <Box sx={{ pt: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '13px', color: 'text.primary' }}>
          {label}
          {required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
        </Typography>
        {description && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.25 }}>
            <Typography
              ref={descRef}
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.45,
                fontSize: '11px',
                flex: 1,
              }}
            >
              {description}
            </Typography>
            {isClamped && (
              <Tooltip title={description} placement="right" arrow>
                <HelpOutlineIcon
                  sx={{ fontSize: 13, color: 'text.disabled', mt: '1px', cursor: 'help', flexShrink: 0 }}
                />
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
      <Box>{children}</Box>
    </Box>
  );
};

// ─── Schema-driven form field renderer ───────────────────────────────────────

// Resolve a $ref like "#/$defs/aml_id" against the root schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveRef(ref: string, rootSchema: Record<string, any>): Record<string, any> {
  const path = ref.replace(/^#\//, '').split('/');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = rootSchema;
  for (const segment of path) node = node?.[segment];
  return node ?? {};
}

/**
 * Given a parent schema's `oneOf` entries and the current parent data, resolve
 * the most specific schema for `fieldKey` by finding the oneOf entry whose
 * discriminator constants (every field other than `fieldKey` that has a `const`)
 * all match the current data values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveOneOfFieldSchema(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oneOfEntries: Record<string, any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentData: Record<string, any>,
  fieldKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rootSchema: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | null {
  for (const entry of oneOfEntries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entryProps = (entry.properties ?? {}) as Record<string, any>;
    let matches = true;
    for (const [k, v] of Object.entries(entryProps)) {
      if (k === fieldKey) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraint = v as Record<string, any>;
      if (constraint.const !== undefined && currentData[k] !== constraint.const) {
        matches = false;
        break;
      }
    }
    if (matches && entryProps[fieldKey]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fieldDef = entryProps[fieldKey] as Record<string, any>;
      if (fieldDef['$ref']) {
        return resolveRef(fieldDef['$ref'] as string, rootSchema);
      }
      return fieldDef;
    }
  }
  return null;
}

// ─── Source-discriminated secret_ref editor ─────────────────────────────────

/**
 * For any source-discriminated object that is NOT a secret_ref, derive the visible
 * fields for a given source value from the schema's allOf conditions.
 *
 * Rules:
 * - allOf-required fields for the current source are always shown (required).
 * - Fields gated exclusively to another source are hidden.
 * - Ungated optional fields (not in any allOf) are shown only when:
 *   a) the schema has NO allOf at all (e.g. gcp_credentials — all props relevant), OR
 *   b) the schema HAS allOf AND the current source has at least one required field
 *      (the source is "configured"; optional extras belong alongside it, not for
 *      bare sources like iam_role that need zero extra configuration).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveFieldsForSource(
  source: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>,
): { fieldKey: string; isRequired: boolean }[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allOfConditions: Record<string, any>[] = (schema.allOf ?? []) as Record<string, any>[];
  const hasAllOf = allOfConditions.length > 0;

  // Keys required specifically for the current source
  const sourceRequiredKeys = new Set<string>(
    allOfConditions
      .filter((c) => c.if?.properties?.source?.const === source)
      .flatMap((c) => (c.then?.required ?? []) as string[])
  );

  if (hasAllOf) {
    // When allOf exists, show ONLY the fields explicitly required for this source.
    // Ungated optional fields (e.g. `region`, `key`) belong to other sources and must not
    // bleed into unrelated source branches. If an optional extra is needed for a given source,
    // it should be added to that source's allOf condition in the schema.
    return [...sourceRequiredKeys].map((k) => ({ fieldKey: k, isRequired: true }));
  }

  // No allOf — use description parsing to infer source/scheme constraints.
  const allProps = { ...(schema.properties ?? {}) } as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  delete allProps['source'];
  return Object.entries(allProps)
    .filter(([, def]) => {
      const c = parseFieldConstraint((def as Record<string, any>).description); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!c) return true; // no constraint → always show
      if (c.kind === 'scheme') return false; // scheme-gated fields are shown via schemeGatedFields
      return c.value === source;
    })
    .map(([k, def]) => ({
      fieldKey: k,
      isRequired: parseFieldConstraint((def as Record<string, any>).description)?.kind === 'source', // eslint-disable-line @typescript-eslint/no-explicit-any
    }));
}

/**
 * Parse "Required when (source|scheme) is <value>" from a field description.
 * Used as a fallback when the schema has no allOf conditions.
 */
function parseFieldConstraint(desc: string | undefined): { kind: 'source' | 'scheme'; value: string } | null {
  if (!desc) return null;
  const m = desc.match(/Required when (source|scheme) is ([a-z0-9_-]+)/i);
  if (!m) return null;
  return { kind: m[1].toLowerCase() as 'source' | 'scheme', value: m[2] };
}

/**
 * Parse per-source descriptions from the "key1=desc1; key2=desc2" format
 * used in AML schema source field descriptions.
 */
function parseSourceDescriptions(desc: string | undefined): Record<string, string> {
  if (!desc) return {};
  const result: Record<string, string> = {};
  for (const part of desc.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      result[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
  }
  return result;
}

interface SecretRefEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any> | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: Record<string, any>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rootSchema: Record<string, any>;
  label: string;
  description?: string;
  required: boolean;
  /** When false, skips the label/description header (used when wrapped in FieldRow). */
  showLabel?: boolean;
}

const SecretRefEditor: React.FC<SecretRefEditorProps> = ({
  schema, value, onChange, rootSchema, label, description, required, showLabel = true,
}) => {
  // Per-source cache so switching back restores previously entered values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheRef = useRef<Record<string, Record<string, any>>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = value as Record<string, any> | null | undefined;
  const source: string | undefined = val?.source;
  const allProps: Record<string, unknown> = (schema.properties ?? {}) as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceSchema = allProps['source'] as Record<string, any> | undefined;

  // Fields required at the top level that are not 'source' (e.g. scheme) — always visible.
  const alwaysRequiredKeys: string[] = ((schema.required ?? []) as string[]).filter((k) => k !== 'source');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allOfConditions = ((schema.allOf ?? []) as Record<string, any>[]);

  // Returns true if the allOf conditions require `source` for the given scheme.
  const isSourceNeededForScheme = (schemeVal: string | undefined): boolean => {
    if (!schemeVal) return false;
    if (allOfConditions.length > 0) {
      return allOfConditions.some((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schemeCond = (c.if?.properties?.scheme) as Record<string, any> | undefined;
        if (!schemeCond) return false;
        const matches = schemeCond.const === schemeVal ||
          (Array.isArray(schemeCond.enum) && (schemeCond.enum as string[]).includes(schemeVal));
        return matches && ((c.then?.required ?? []) as string[]).includes('source');
      });
    }
    // Fallback for schemas without allOf: iam-role and none need no source
    return !['iam-role', 'none'].includes(schemeVal);
  };

  const currentScheme: string | undefined = val?.scheme;
  // Only gate source visibility on scheme when the schema itself has a scheme field.
  // Pure secret_ref objects (no scheme) always show source.
  const hasSchemeField = 'scheme' in allProps;
  const showSource = sourceSchema != null && (!hasSchemeField || isSourceNeededForScheme(currentScheme));

  // Fields required by the current scheme via allOf (e.g. oauth2 → token_url, client_id, client_secret).
  // Excludes 'source' (handled separately) and always-required keys (e.g. scheme itself).
  const schemeGatedFields: { fieldKey: string; isRequired: boolean }[] = currentScheme
    ? allOfConditions.length > 0
      ? allOfConditions
          .filter((c) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const schemeCond = (c.if?.properties?.scheme) as Record<string, any> | undefined;
            if (!schemeCond) return false;
            const matches = schemeCond.const === currentScheme ||
              (Array.isArray(schemeCond.enum) && (schemeCond.enum as string[]).includes(currentScheme));
            return matches && ((c.then?.required ?? []) as string[]).some((k) => k !== 'source');
          })
          .flatMap((c) =>
            ((c.then?.required ?? []) as string[])
              .filter((k) => k !== 'source' && !alwaysRequiredKeys.includes(k))
              .map((k) => ({ fieldKey: k, isRequired: true }))
          )
      : Object.entries(allProps)
          .filter(([k, def]) => {
            if (alwaysRequiredKeys.includes(k) || k === 'source') return false;
            const c = parseFieldConstraint((def as Record<string, any>).description); // eslint-disable-line @typescript-eslint/no-explicit-any
            return c?.kind === 'scheme' && c.value === currentScheme;
          })
          .map(([k]) => ({ fieldKey: k, isRequired: true }))
    : [];

  // When scheme changes, start clean: preserve only always-required fields + new scheme value.
  const handleSchemeChange = (newScheme: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preserved: Record<string, any> = { scheme: newScheme };
    for (const k of alwaysRequiredKeys) {
      if (k === 'scheme') continue;
      const v = val?.[k];
      if (v !== undefined) preserved[k] = v;
    }
    onChange(preserved);
  };

  const handleSourceChange = (newSource: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alwaysValues = Object.fromEntries(
      alwaysRequiredKeys
        .map((k) => [k, val?.[k]])
        .filter(([, v]) => v !== undefined)
    );
    if (source !== undefined && source !== newSource) {
      const nonSourceValues = Object.fromEntries(
        Object.entries(value ?? {}).filter(
          ([k, v]) => k !== 'source' && !alwaysRequiredKeys.includes(k) && v !== undefined && v !== ''
        )
      );
      if (Object.keys(nonSourceValues).length > 0) {
        cacheRef.current[source] = nonSourceValues;
      }
    }
    const cached = cacheRef.current[newSource] ?? {};
    onChange({ ...alwaysValues, source: newSource, ...cached });
  };

  // Derive source-specific visible fields, excluding always-required keys to avoid duplicates.
  const visibleFields: { fieldKey: string; isRequired: boolean }[] = source
    ? deriveFieldsForSource(source, schema).filter(({ fieldKey }) => !alwaysRequiredKeys.includes(fieldKey))
    : [];

  // Per-source description for when there are no configurable fields
  const sourceDescriptions = parseSourceDescriptions(sourceSchema?.description);

  return (
    <Box sx={{ mb: showLabel ? 1.5 : 0 }}>
      {showLabel && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            {label}{required && ' *'}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {description}
            </Typography>
          )}
        </>
      )}
      <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
        {/* Always-required non-source fields (e.g. scheme) — shown unconditionally */}
        {alwaysRequiredKeys.map((fieldKey) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fieldDef = allProps[fieldKey] as Record<string, any> | undefined;
          if (!fieldDef) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handleChange = fieldKey === 'scheme'
            ? (v: unknown) => handleSchemeChange(v as string)
            : (v: unknown) => onChange({ ...(value ?? {}), [fieldKey]: v });
          return (
            <Box key={fieldKey}>
              {renderField(fieldKey, fieldDef, val?.[fieldKey], handleChange, true, rootSchema)}
            </Box>
          );
        })}
        {/* Scheme-gated fields (e.g. oauth2 → token_url, client_id, client_secret) */}
        {schemeGatedFields.map(({ fieldKey, isRequired: isFieldRequired }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fieldDef = allProps[fieldKey] as Record<string, any> | undefined;
          if (!fieldDef) return null;
          return (
            <Box key={fieldKey}>
              {renderField(fieldKey, fieldDef, val?.[fieldKey], (v) => onChange({ ...(value ?? {}), [fieldKey]: v }), isFieldRequired, rootSchema)}
            </Box>
          );
        })}
        {/* Source selector — only when the current scheme requires a source */}
        {showSource && (
          <Box sx={{ mb: 1.5 }}>
            <FormControl size="small" sx={{ width: '100%', maxWidth: 320 }}>
              <InputLabel>{sourceSchema!.title ?? 'Source'}</InputLabel>
              <Select
                value={source ?? ''}
                onChange={(e) => handleSourceChange(e.target.value as string)}
                label={sourceSchema!.title ?? 'Source'}
              >
                {(sourceSchema!.enum as string[]).map((opt: string) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {/* Source-specific fields — only when source is visible and selected */}
        {showSource && (
          !source ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Select a source above to configure its settings.
            </Typography>
          ) : visibleFields.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {sourceDescriptions[source]
                ? `${source}: ${sourceDescriptions[source]}`
                : `No additional configuration needed for source "${source}".`}
            </Typography>
          ) : visibleFields.map(({ fieldKey, isRequired: isFieldRequired }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fieldDef = allProps[fieldKey] as Record<string, any> | undefined;
            if (!fieldDef) return null;
            return renderField(
              fieldKey,
              fieldDef,
              val?.[fieldKey],
              (v) => onChange({ ...(value ?? {}), [fieldKey]: v }),
              isFieldRequired,
              rootSchema,
            );
          })
        )}
      </Box>
    </Box>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderField(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawDef: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: any) => void,
  required: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rootSchema: Record<string, any>,
  fieldOptions?: Record<string, string[]>
): React.ReactNode {
  // Compute label/description early so json_schema_object early return can use them
  const earlyLabel = (rawDef.title as string | undefined) ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const earlyDescription = rawDef.description as string | undefined;

  // Fields referencing json_schema_object → ParameterTableEditor wrapped in FieldRow
  if (rawDef['$ref'] === '#/$defs/json_schema_object') {
    return (
      <FieldRow key={key} label={earlyLabel} description={earlyDescription} required={required}>
        <ParameterTableEditor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value={value as Record<string, any> | null | undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={onChange as (v: Record<string, any>) => void}
          label={earlyLabel}
          required={required}
          showLabel={false}
        />
      </FieldRow>
    );
  }

  // Merge $ref definition (property fields win)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refDef: Record<string, any> = rawDef['$ref'] ? resolveRef(rawDef['$ref'], rootSchema) : {};
  const schemaDef = { ...refDef, ...rawDef };

  const label = (schemaDef.title as string | undefined) ?? earlyLabel;
  const isRequired = required;
  const description: string | undefined = schemaDef.description ?? earlyDescription;

  if (schemaDef.type === 'boolean') {
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <Switch
          checked={Boolean(value ?? schemaDef.default ?? false)}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
        />
      </FieldRow>
    );
  }

  if (schemaDef.enum) {
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <Select
          value={value ?? schemaDef.default ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          displayEmpty
        >
          {schemaDef.enum.map((opt: string) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FieldRow>
    );
  }

  if ((schemaDef.type === 'number' || schemaDef.type === 'integer') && schemaDef.minimum !== undefined && schemaDef.maximum !== undefined) {
    const v = Number(value ?? schemaDef.default ?? schemaDef.minimum);
    return (
      <FieldRow key={key} label={label} description={description ?? `Range: ${schemaDef.minimum} – ${schemaDef.maximum}`} required={isRequired}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Slider
            value={v}
            min={schemaDef.minimum}
            max={schemaDef.maximum}
            step={schemaDef.type === 'number' ? 0.1 : 1}
            onChange={(_, nv) => onChange(nv)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            value={v}
            onChange={(e) => onChange(Number(e.target.value))}
            slotProps={{ htmlInput: { min: schemaDef.minimum, max: schemaDef.maximum, step: schemaDef.type === 'number' ? 0.1 : 1 } }}
            sx={{ width: 80 }}
          />
        </Box>
      </FieldRow>
    );
  }

  // Numeric field without a full min+max range → plain number input with type coercion
  if (schemaDef.type === 'number' || schemaDef.type === 'integer') {
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <TextField
          size="small"
          type="number"
          value={value ?? ''}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : Number(e.target.value))
          }
          slotProps={{
            htmlInput: {
              min: schemaDef.minimum,
              max: schemaDef.maximum,
              step: schemaDef.type === 'number' ? 0.1 : 1,
            },
          }}
          sx={{ width: 160 }}
        />
      </FieldRow>
    );
  }

  if (schemaDef.type === 'array') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsRaw: Record<string, any> = schemaDef.items ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsRefDef: Record<string, any> = itemsRaw['$ref'] ? resolveRef(itemsRaw['$ref'], rootSchema) : {};
    const itemsDef = { ...itemsRefDef, ...itemsRaw };

    // Array of objects → +Add list editor
    if (itemsDef.type === 'object' && itemsDef.properties) {
      return (
        <FieldRow key={key} label={label} description={description} required={isRequired}>
          <ObjectListEditor
            itemSchema={itemsDef}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
            rootSchema={rootSchema}
            label={label}
            fieldOptions={fieldOptions}
          />
        </FieldRow>
      );
    }

    // Array of enum → multi-select with chips
    if (Array.isArray(itemsDef.enum)) {
      const selected: string[] = Array.isArray(value) ? value : [];
      const allOptions: string[] = itemsDef.enum as string[];
      return (
        <FieldRow key={key} label={label} description={description} required={isRequired}>
          <Autocomplete
            multiple
            options={allOptions.filter((o) => !selected.includes(o))}
            value={selected}
            onChange={(_, nv) => onChange(nv)}
            disableCloseOnSelect
            slotProps={{ chip: { size: 'small' } }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder={selected.length === allOptions.length ? '' : 'Add…'}
              />
            )}
          />
        </FieldRow>
      );
    }

    // Array of scalars → editable list with + / trash
    const tags: string[] = Array.isArray(value) ? value : [];
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <Box>
          {tags.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <TextField
                size="small"
                fullWidth
                value={item}
                onChange={(e) => {
                  const next = [...tags];
                  next[i] = e.target.value;
                  onChange(next);
                }}
              />
              <IconButton
                size="small"
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                aria-label="Remove"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...tags, ''])} sx={{ mt: 0.5 }}>
            Add
          </Button>
        </Box>
      </FieldRow>
    );
  }

  // Any object with a `source` enum property → source-discriminated editor
  const isSecretRefSchema =
    schemaDef.type === 'object' &&
    schemaDef.properties &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray((schemaDef.properties as Record<string, any>)['source']?.enum);
  if (isSecretRefSchema) {
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <SecretRefEditor
          schema={schemaDef}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value={value as Record<string, any> | null | undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={onChange as (v: Record<string, any>) => void}
          rootSchema={rootSchema}
          label={label}
          required={isRequired}
          showLabel={false}
        />
      </FieldRow>
    );
  }

  // Nested object with properties → render sub-fields recursively
  if (schemaDef.type === 'object' && schemaDef.properties) {
    const subRequired: string[] = (schemaDef.required as string[]) ?? [];
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
          {Object.entries(schemaDef.properties as Record<string, unknown>).map(([subKey, subRawDef]) =>
            renderField(
              subKey,
              subRawDef as Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (value as Record<string, any> | null | undefined)?.[subKey],
              (v) => onChange({ ...(typeof value === 'object' && value !== null ? value as object : {}), [subKey]: v }),
              subRequired.includes(subKey),
              rootSchema,
            )
          )}
        </Box>
      </FieldRow>
    );
  }

  // Object with additionalProperties but no properties → MapEditor (key-value map)
  if (schemaDef.type === 'object' && schemaDef.additionalProperties && !schemaDef.properties) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addlRaw: Record<string, any> = schemaDef.additionalProperties as Record<string, any>;
    const itemSchema: Record<string, any> = addlRaw['$ref'] ? resolveRef(addlRaw['$ref'] as string, rootSchema) : addlRaw; // eslint-disable-line @typescript-eslint/no-explicit-any
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <MapEditor
          itemSchema={itemSchema}
          value={value ?? {}}
          onChange={onChange}
          rootSchema={rootSchema}
        />
      </FieldRow>
    );
  }

  // oneOf without properties → discriminated union (e.g. transport in backend_custom)
  if (schemaDef.oneOf && !schemaDef.properties) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oneOfBranches: Record<string, any>[] = (schemaDef.oneOf as Record<string, any>[]).map((b) =>
      b['$ref'] ? resolveRef(b['$ref'] as string, rootSchema) : b
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getDiscValue = (prop: Record<string, any> | undefined): string | undefined => {
      if (!prop) return undefined;
      if (prop.const !== undefined) return String(prop.const);
      if (Array.isArray(prop.enum) && prop.enum.length === 1) return String(prop.enum[0]);
      return undefined;
    };
    const discKey: string | null = (() => {
      if (!oneOfBranches[0]?.properties) return null;
      for (const k of Object.keys(oneOfBranches[0].properties as Record<string, unknown>)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (oneOfBranches.every((b) => getDiscValue((b.properties as Record<string, any>)?.[k]) !== undefined)) return k;
      }
      return null;
    })();
    if (!discKey) {
      return (
        <FieldRow key={key} label={label} description={description} required={isRequired}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Use raw mode to edit this field.
          </Typography>
        </FieldRow>
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: string[] = oneOfBranches.map((b) => getDiscValue((b.properties as Record<string, any>)[discKey])).filter((v): v is string => v !== undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentVal = value as Record<string, any> | null | undefined;
    const currentDisc: string | undefined = currentVal?.[discKey];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeBranch = oneOfBranches.find((b) => getDiscValue((b.properties as Record<string, any>)[discKey]) === currentDisc) ?? null;
    const subRequired: string[] = activeBranch?.required ?? [];
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
          {renderField(
            discKey,
            { title: 'Type', type: 'string', enum: options } as Record<string, unknown>,
            currentDisc,
            (newDisc) => onChange({ [discKey]: newDisc }),
            true,
            rootSchema
          )}
          {activeBranch?.properties
            ? (() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const branchProps = activeBranch.properties as Record<string, any>;
                const hasSourceEnum = branchProps.source && Array.isArray(branchProps.source.enum);
                if (hasSourceEnum) {
                  // Build a schema for SecretRefEditor that excludes the discriminator key (already chosen above)
                  const filteredProps = Object.fromEntries(Object.entries(branchProps).filter(([k]) => k !== discKey));
                  const filteredRequired = ((activeBranch.required ?? []) as string[]).filter((k: string) => k !== discKey);
                  const branchSchema = { ...activeBranch, properties: filteredProps, required: filteredRequired };
                  const branchValue = typeof currentVal === 'object' && currentVal !== null
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? Object.fromEntries(Object.entries(currentVal as Record<string, any>).filter(([k]) => k !== discKey))
                    : {};
                  return [
                    <SecretRefEditor
                      key="__cred_source"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      schema={branchSchema as Record<string, any>}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      value={branchValue as Record<string, any>}
                      onChange={(v) => onChange({ [discKey]: currentDisc, ...v })}
                      rootSchema={rootSchema}
                      label=""
                      required={false}
                      showLabel={false}
                    />,
                  ];
                }
                return Object.entries(branchProps)
                  .filter(([k]) => k !== discKey)
                  .map(([subKey, subRawDef]) =>
                    renderField(
                      subKey,
                      subRawDef as Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
                      currentVal?.[subKey],
                      (v) => onChange({ ...(typeof value === 'object' && value !== null ? value as object : {}), [subKey]: v }),
                      subRequired.includes(subKey),
                      rootSchema
                    )
                  );
              })()
            : (
              <Typography key="__hint" variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Select a type above to configure its settings.
              </Typography>
            )}
        </Box>
      </FieldRow>
    );
  }

  // Markdown content field → tall monospace textarea
  if (schemaDef.contentMediaType === 'text/markdown') {
    return (
      <FieldRow key={key} label={label} description={description} required={isRequired}>
        <TextField
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          multiline
          minRows={6}
          fullWidth
          slotProps={{
            htmlInput: { style: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '13px', lineHeight: '20px' } },
          }}
        />
      </FieldRow>
    );
  }

  // Default: text input
  const isLongField = schemaDef.type === 'string' && (schemaDef.minLength ?? 0) > 100;
  return (
    <FieldRow key={key} label={label} description={description} required={isRequired}>
      <TextField
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        fullWidth
        multiline={isLongField}
        rows={isLongField ? 4 : 1}
      />
    </FieldRow>
  );
}

// ─── Form ↔ Raw conversion helpers (markdown-field aware) ──────────────────

/**
 * Convert form state to a raw AML file string.
 * Fields with contentMediaType:text/markdown are moved from formData
 * into the markdown body as `# Heading` sections instead of YAML.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formToRaw(schema: Record<string, any>, formData: Record<string, any>, bodyContent: string): string {
  const descriptors = collectMarkdownFields(schema);
  if (descriptors.length === 0) return serialiseAmlFile(formData, bodyContent);

  // Strip markdown fields from the frontmatter copy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frontMatter: Record<string, any> = { ...formData };
  for (const { parentKey, fieldKey } of descriptors) {
    if (!frontMatter[parentKey]) continue;
    const parentCopy = { ...frontMatter[parentKey] };
    delete parentCopy[fieldKey];
    if (Object.keys(parentCopy).length === 0) {
      delete frontMatter[parentKey];
    } else {
      frontMatter[parentKey] = parentCopy;
    }
  }

  const body = serializeBodySections(descriptors, formData, bodyContent);
  return serialiseAmlFile(frontMatter, body);
}

/**
 * Parse a raw AML file string into form state.
 * `# Heading` sections matching known markdown fields are extracted from
 * the body and merged into formData; the remainder becomes bodyContent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawToForm(schema: Record<string, any>, raw: string): { formData: Record<string, any>; bodyContent: string } {
  const { frontMatter, body } = parseAmlFile(raw);
  const descriptors = collectMarkdownFields(schema);
  if (descriptors.length === 0) return { formData: frontMatter, bodyContent: body };

  const { fields, remainder } = parseBodySections(body, descriptors);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formData: Record<string, any> = { ...frontMatter };
  for (const [dotKey, value] of Object.entries(fields)) {
    const dot = dotKey.indexOf('.');
    const parentKey = dotKey.slice(0, dot);
    const fieldKey = dotKey.slice(dot + 1);
    formData[parentKey] = { ...(formData[parentKey] ?? {}), [fieldKey]: value };
  }
  return { formData, bodyContent: remainder };
}

export const ArtefactEditTab = React.forwardRef<ArtefactEditTabHandle, Props>(
  function ArtefactEditTabInner({ kind, repoId, artefact, onSaved, onToolbarStateChange }, ref) {
  const theme = useTheme();
  const t = useT();
  const saveArtefactLocally = useStore((s) => s.saveArtefactLocally);
  const addToast = useStore((s) => s.addToast);
  const preferences = useStore((s) => s.preferences);
  const repositories = useStore((s) => s.repositories);
  const activeRepo = repositories.find((r) => r.id === repoId);

  const IAM_REF_KIND_MAP: Partial<Record<string, ArtefactKind>> = {
    tools: 'tool',
    knowledge_bases: 'kb',
    collections: 'collection',
  };
  const getRefOptions = (fieldKey: string): Record<string, string[]> => {
    const k = IAM_REF_KIND_MAP[fieldKey];
    if (!k || !activeRepo) return {};
    return { ref: activeRepo.artefacts.filter((a) => a.kind === k).map((a) => a.id) };
  };

  const [mode, setMode] = useState<'form' | 'raw'>(preferences.defaultEditorMode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>(
    artefact?.frontMatter ?? { spec_version: config.amlSchemaVersion }
  );
  const [bodyContent, setBodyContent] = useState(artefact?.body ?? BODY_TEMPLATES[kind]);
  const [rawContent, setRawContent] = useState(artefact?.rawContent ?? `---\n\n---\n\n`);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [schema, setSchema] = useState<Record<string, any> | null>(null);
  const [validationErrors, setValidationErrors] = useState(artefact?.validationErrors ?? []);
  // Cache of non-discriminator values per parent key per discriminator value.
  // Allows switching provider.type (or similar) back without losing previously entered config.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discriminatorCacheRef = useRef<Record<string, Record<string, Record<string, any>>>>({});

  // Stable key for draft persistence and the navigation guard.
  const draftKey = `aml-studio:draft:${repoId}:${kind}:${artefact?.id ?? 'new'}`;

  // Section anchors used by the outline / scroll-spy.
  const [activeSection, setActiveSection] = useState<string>('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    loadSchema(kind).then(setSchema);
  }, [kind]);

  // When schema loads, parse any `# Heading` sections from the body into formData.
  // This handles artefacts whose body IS the structured content (system_prompt, documentation…).
  // We only do this once on initial load (when !isDirty) so we don't clobber in-progress edits.
  useEffect(() => {
    if (!schema || isDirty) return;
    const descriptors = collectMarkdownFields(schema);
    if (descriptors.length === 0) return;
    const initialBody = artefact?.body ?? BODY_TEMPLATES[kind];
    const { fields, remainder } = parseBodySections(initialBody, descriptors);
    if (Object.keys(fields).length === 0) return;
    setFormData((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated: Record<string, any> = { ...prev };
      for (const [dotKey, value] of Object.entries(fields)) {
        const dot = dotKey.indexOf('.');
        const parentKey = dotKey.slice(0, dot);
        const fieldKey = dotKey.slice(dot + 1);
        updated[parentKey] = { ...(updated[parentKey] ?? {}), [fieldKey]: value };
      }
      return updated;
    });
    setBodyContent(remainder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  // Restore draft on mount (or when key changes).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { formData?: Record<string, unknown>; bodyContent?: string; rawContent?: string; mode?: 'form' | 'raw'; savedAt?: number };
      const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
      if (draft.savedAt && Date.now() - draft.savedAt > SIX_MONTHS_MS) {
        localStorage.removeItem(draftKey);
        return;
      }
      // Only auto-restore drafts saved after the artefact's last save, or when
      // the artefact is new — otherwise prefer the canonical content.
      if (draft.formData) setFormData(draft.formData as Record<string, unknown>);
      if (typeof draft.bodyContent === 'string') setBodyContent(draft.bodyContent);
      if (typeof draft.rawContent === 'string') setRawContent(draft.rawContent);
      if (draft.mode === 'form' || draft.mode === 'raw') setMode(draft.mode);
      setIsDirty(true);
    } catch {
      /* ignore corrupt drafts */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Persist draft on every change (debounced).
  useEffect(() => {
    if (!isDirty) return;
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ formData, bodyContent, rawContent, mode, savedAt: Date.now() })
        );
      } catch { /* quota / disabled */ }
    }, 350);
    return () => clearTimeout(handle);
  }, [draftKey, formData, bodyContent, rawContent, mode, isDirty]);

  const handleFieldChange = useCallback((path: string, value: unknown) => {
    setFormData((prev) => {
      const keys = path.split('.');
      const updated = { ...prev };
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...(obj[keys[i]] ?? {}) };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    const content = mode === 'form'
      ? (schema ? formToRaw(schema, formData, bodyContent) : serialiseAmlFile(formData, bodyContent))
      : rawContent;

    const { frontMatter } = parseAmlFile(content);
    const errors = validateArtefact(kind, frontMatter);
    setValidationErrors(errors);

    // A missing ID is the only hard block: without it we have no stable reference
    // to the artefact. All other validation errors are non-blocking — the artefact
    // is saved with its errors so the user can keep working.
    const idField: Record<ArtefactKind, string> = {
      agent: 'agent_id', tool: 'tool_id', kb: 'kb_id', iam: 'iam_id',
      model: 'model_id', collection: 'collection_id', guardrail: 'guardrail_id',
    };
    const artId = frontMatter[idField[kind]] || artefact?.id;
    if (!artId) {
      setValidationErrors([{ path: idField[kind], message: `${idField[kind]} is required`, severity: 'error' }]);
      setIsSaving(false);
      return;
    }
    // When the ID changes, the file path must follow the new ID.
    // When the ID is unchanged, keep the original path (may include subdirs).
    const basePath = `${KIND_FOLDER_NAMES[kind]}/${artId}${KIND_FILE_EXTENSIONS[kind]}`;
    const filePath = artefact?.filePath
      ? (artId !== artefact.id ? basePath : artefact.filePath)
      : basePath;

    // Pass the original ID so the store can find and update the existing artefact
    // even when the ID field was renamed.
    const originalId = artefact?.id ?? artId;
    saveArtefactLocally(repoId, originalId, content, kind, filePath);
    addToast({ type: 'success', message: t.toastArtefactSaved(artId) });
    // Clear the draft now that the canonical state matches what the user typed.
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    // flushSync ensures isDirty=false is committed before onSaved triggers navigation,
    // preventing the "unsaved changes" blocker from firing after a successful save.
    flushSync(() => {
      setIsDirty(false);
      setIsSaving(false);
      setSavedFeedback(true);
    });
    setTimeout(() => setSavedFeedback(false), 2000);
    onSaved(artId);
  }, [mode, formData, bodyContent, rawContent, kind, artefact, repoId, saveArtefactLocally, addToast, t, onSaved, draftKey]);

  // Block navigation when there are unsaved changes; ask the user before leaving.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty) return false;
    return currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm('You have unsaved changes. Leave without saving?');
      if (proceed) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);

  // Warn on tab close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Switch to raw: serialise form (markdown fields → body sections)
  const handleModeSwitch = useCallback((newMode: 'form' | 'raw') => {
    if (newMode === 'raw' && mode === 'form') {
      setRawContent(
        schema ? formToRaw(schema, formData, bodyContent) : serialiseAmlFile(formData, bodyContent)
      );
    } else if (newMode === 'form' && mode === 'raw') {
      if (schema) {
        const { formData: fd, bodyContent: bc } = rawToForm(schema, rawContent);
        setFormData(fd);
        setBodyContent(bc);
      } else {
        const { frontMatter, body } = parseAmlFile(rawContent);
        setFormData(frontMatter);
        setBodyContent(body);
      }
    }
    setMode(newMode);
  }, [mode, formData, bodyContent, rawContent, schema]);

  // Keyboard save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, handleSave]);

  // Push toolbar state to parent whenever it changes
  useEffect(() => {
    onToolbarStateChange?.({ mode, isDirty, isSaving, savedFeedback });
  }, [mode, isDirty, isSaving, savedFeedback, onToolbarStateChange]);

  // Expose save + switchMode + discard to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
    switchMode: handleModeSwitch,
    discard: () => {
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    },
  }), [handleSave, handleModeSwitch, draftKey]);

  const topLevelSchemaProps = schema?.properties ?? {};
  const requiredFields: string[] = schema?.required ?? [];

  // Sections used by the outline. Computed up-front so the outline can render
  // before (or alongside) the form scrolls past their anchors.
  const sections = useMemo(() => {
    if (!schema) return [] as { id: string; title: string }[];

    if (kind === 'agent') {
      const AGENT_TITLES: Record<string, string> = {
        ui:            'Consumer UI',
        runtime:       'Model Configuration',
        input:         'Input / Output',
        system_prompt: 'Behaviour',
        tools:         'Tools',
        knowledge:     'Knowledge Bases',
        memory:        'Memory Collection',
        guardrails:    'Guardrails',
        orchestration: 'Orchestration',
        state:         'State',
        artifacts:     'Artifacts & Policies',
        observability: 'Observability',
      };
      const result: { id: string; title: string }[] = [
        { id: 'section-identification', title: 'Identification' },
        { id: 'section-role', title: 'IAM Role' },
      ];
      // Add nested sections in schema key order; skip flat fields, meta (merged into
      // Identification), role (already added), output (merged with input), policies
      // (merged with artifacts), and the body-only placeholder key.
      Object.entries(topLevelSchemaProps).forEach(([key, def]) => {
        if (['spec_version', 'agent_id', 'version', 'status', 'meta', 'role', 'instructions', 'output', 'policies'].includes(key)) return;
        const sd = def as Record<string, unknown>;
        if (!(sd.type === 'object' && sd.properties)) return;
        result.push({ id: `section-${key}`, title: AGENT_TITLES[key] ?? (sd.title as string | undefined) ?? key.replace(/_/g, ' ') });
      });
      if (bodyContent.trim()) result.push({ id: 'section-body', title: 'Additional content' });
      return result;
    }

    const flat: { id: string; title: string }[] = [];
    const nested: { id: string; title: string }[] = [];
    Object.entries(topLevelSchemaProps).forEach(([key, def]) => {
      if (key === 'instructions') return;
      const sd = def as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      const title = (sd.title as string | undefined) ?? key.replace(/_/g, ' ');
      const isNested =
        (sd.type === 'object' && !!sd.properties) ||
        (!!sd.oneOf && !sd.properties) ||
        (sd.type === 'object' && !!sd.additionalProperties && !sd.properties);
      if (isNested) {
        nested.push({ id: `section-${key}`, title });
      } else {
        if (!flat.length) flat.push({ id: 'section-identification', title: 'Identification & settings' });
      }
    });
    const hasMarkdownFields = collectMarkdownFields(schema).length > 0;
    const bodyTitle = kind === 'guardrail' ? 'Rules & examples' : 'Description';
    if (!hasMarkdownFields) {
      return [...flat, ...nested, { id: 'section-body', title: bodyTitle }];
    }
    if (bodyContent.trim()) {
      return [...flat, ...nested, { id: 'section-body', title: 'Additional content' }];
    }
    return [...flat, ...nested];
  }, [schema, topLevelSchemaProps, kind, bodyContent]);

  // Scroll-spy: which section is currently nearest the top of the viewport.
  useEffect(() => {
    if (mode !== 'form') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] }
    );
    sections.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections, mode]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box>
      {/* Toolbar — rendered here only when parent is NOT hosting it */}
      {!onToolbarStateChange && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && handleModeSwitch(v)}
            size="small"
          >
            <ToggleButton value="form">
              <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
              {t.formMode}
            </ToggleButton>
            <ToggleButton value="raw">
              <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
              {t.rawMode}
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? <CircularProgress size={14} color="inherit" /> : savedFeedback ? t.savedSuccess : t.save}
          </Button>
        </Box>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2, fontSize: '13px' }}>
          {t.validationIssues(validationErrors.length)}
          <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
            {validationErrors.map((e, i) => <li key={i}>{e.message}</li>)}
          </Box>
        </Alert>
      )}

      {/* Form mode */}
      {mode === 'form' && schema && (() => {
        // Partition fields: flat (scalars / $ref scalars / arrays) vs nested objects.
        // For agents, `meta` and `role` are excluded from the generic partitions and
        // handled by agent-specific section rendering below.
        const flatEntries: [string, Record<string, unknown>][] = [];
        const nestedEntries: [string, Record<string, unknown>][] = [];

        Object.entries(topLevelSchemaProps).forEach(([key, def]) => {
          if (key === 'instructions') return; // body — handled separately
          if (kind === 'agent' && (key === 'meta' || key === 'role')) return; // handled below
          const sd = def as Record<string, unknown>;
          const isNested =
            (sd.type === 'object' && !!sd.properties) ||
            (!!(sd as Record<string, any>).oneOf && !sd.properties) ||
            (sd.type === 'object' && !!(sd as Record<string, any>).additionalProperties && !sd.properties);
          if (isNested) nestedEntries.push([key, sd]);
          else flatEntries.push([key, sd]);
        });

        const cardSx = {
          p: 3,
          mb: 2,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '8px',
          backgroundColor: theme.palette.background.paper,
          scrollMarginTop: 16,
        } as const;

        const cardHeading = (title: string, description?: string) => (
          <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                width: 3,
                alignSelf: 'stretch',
                minHeight: 16,
                backgroundColor: theme.palette.primary.main,
                borderRadius: '2px',
                flexShrink: 0,
                mt: 0.15,
              }}
            />
            <Box>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.palette.text.secondary,
                  lineHeight: 1.6,
                }}
              >
                {title.replace(/_/g, ' ')}
              </Typography>
              {description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  {description}
                </Typography>
              )}
            </Box>
          </Box>
        );

        // Render all sub-fields for one nested section, handling oneOf discriminators.
        const renderNestedSectionContent = (key: string, sd: Record<string, unknown>) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parentData: Record<string, any> = formData[key] ?? {};

          // ── Pure oneOf (e.g. transport): discriminated union without top-level properties ──
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((sd as any).oneOf && !sd.properties) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const oneOfBranches: Record<string, any>[] = ((sd as any).oneOf as Record<string, any>[]).map((b) =>
              b['$ref'] ? resolveRef(b['$ref'] as string, schema!) : b
            );
            // Resolve the discriminator value from a property def: supports both
            // `const: 'aws'` and single-item `enum: ['aws']` forms.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getDiscValue = (prop: Record<string, any> | undefined): string | undefined => {
              if (!prop) return undefined;
              if (prop.const !== undefined) return String(prop.const);
              if (Array.isArray(prop.enum) && prop.enum.length === 1) return String(prop.enum[0]);
              return undefined;
            };
            // Find the discriminator: the property whose value is fixed in every branch
            const discKey: string | null = (() => {
              if (!oneOfBranches[0]?.properties) return null;
              for (const k of Object.keys(oneOfBranches[0].properties as Record<string, unknown>)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (oneOfBranches.every((b) => getDiscValue((b.properties as Record<string, any>)?.[k]) !== undefined)) return k;
              }
              return null;
            })();

            if (!discKey) return [
              <Typography key="fallback" variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Use raw mode to edit this field.
              </Typography>,
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const options: string[] = oneOfBranches.map((b) => getDiscValue((b.properties as Record<string, any>)[discKey])).filter((v): v is string => v !== undefined);
            const currentDisc: string | undefined = parentData[discKey];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const activeBranch = oneOfBranches.find((b) => getDiscValue((b.properties as Record<string, any>)[discKey]) === currentDisc) ?? null;
            const subRequired: string[] = activeBranch?.required ?? [];

            const handleDiscChange = (newDisc: string) => {
              // Cache non-discriminator values before switching type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const nonDiscValues: Record<string, any> = {};
              for (const [k, v] of Object.entries(parentData)) {
                if (k !== discKey && v !== undefined && v !== '') nonDiscValues[k] = v;
              }
              if (currentDisc && Object.keys(nonDiscValues).length > 0) {
                if (!discriminatorCacheRef.current[key]) discriminatorCacheRef.current[key] = {};
                discriminatorCacheRef.current[key][currentDisc] = nonDiscValues;
              }
              const cached = discriminatorCacheRef.current[key]?.[newDisc] ?? {};
              setFormData((prev) => ({ ...prev, [key]: { [discKey]: newDisc, ...cached } }));
              setIsDirty(true);
            };

            return [
              <Box key="__disc">
                {renderField(
                  discKey,
                  { title: 'Type', type: 'string', enum: options } as Record<string, unknown>,
                  currentDisc,
                  (v) => handleDiscChange(v as string),
                  true,
                  schema!
                )}
              </Box>,
              ...(activeBranch?.properties
                ? Object.entries(activeBranch.properties as Record<string, unknown>)
                    .filter(([k]) => k !== discKey)
                    .map(([subKey, subRawDef]) => (
                      <Box key={subKey}>
                        {renderField(
                          subKey,
                          subRawDef as Record<string, unknown>,
                          parentData[subKey],
                          (v) => handleFieldChange(`${key}.${subKey}`, v),
                          subRequired.includes(subKey),
                          schema!
                        )}
                      </Box>
                    ))
                : [
                    <Box key="__hint">
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Select a type above to configure its settings.
                      </Typography>
                    </Box>,
                  ]),
            ];
          }

          // ── additionalProperties map (e.g. error_codes) ────────────────────────────
          if (sd.type === 'object' && (sd as Record<string, any>).additionalProperties && !sd.properties) {
            return [
              <MapEditor
                key="__map"
                itemSchema={(sd as Record<string, any>).additionalProperties as Record<string, any>}
                value={parentData}
                onChange={(v) => handleFieldChange(key, v)}
                rootSchema={schema!}
                keyPlaceholder="HTTP status code (e.g. 404)"
              />,
            ];
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oneOfEntries: Record<string, any>[] = (sd as any).oneOf ?? [];
          const discriminatorKeys = new Set<string>(
            oneOfEntries.flatMap((e: Record<string, any>) => // eslint-disable-line @typescript-eslint/no-explicit-any
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Object.entries((e.properties ?? {}) as Record<string, any>)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter(([, v]) => (v as Record<string, any>).const !== undefined)
                .map(([k]) => k)
            )
          );
          return Object.entries((sd.properties as Record<string, unknown>)).map(([subKey, subDef]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let resolvedDef = subDef as Record<string, any>;
            if (oneOfEntries.length > 0 && !discriminatorKeys.has(subKey)) {
              const specific = resolveOneOfFieldSchema(oneOfEntries, parentData, subKey, schema!);
              if (specific) {
                resolvedDef = { ...resolvedDef, ...specific };
              } else if (!(resolvedDef as Record<string, unknown>).properties) {
                return (
                  <Box key={subKey} sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Select a type above to configure its settings.
                    </Typography>
                  </Box>
                );
              }
            }
            return (
              <Box key={subKey}>
                {renderField(
                  subKey,
                  resolvedDef,
                  parentData[subKey],
                  (v) => {
                    if (discriminatorKeys.has(subKey)) {
                      setFormData((prev) => {
                        const currentParent = (prev[key] ?? {}) as Record<string, unknown>;
                        const oldDiscValue = currentParent[subKey];
                        if (oldDiscValue !== undefined && oldDiscValue !== v) {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const nonDiscValues: Record<string, any> = {};
                          for (const [k, val] of Object.entries(currentParent)) {
                            if (!discriminatorKeys.has(k) && val !== undefined && val !== '') {
                              nonDiscValues[k] = val;
                            }
                          }
                          if (Object.keys(nonDiscValues).length > 0) {
                            if (!discriminatorCacheRef.current[key]) discriminatorCacheRef.current[key] = {};
                            discriminatorCacheRef.current[key][oldDiscValue as string] = nonDiscValues;
                          }
                        }
                        const cached = discriminatorCacheRef.current[key]?.[v as string] ?? {};
                        return { ...prev, [key]: { [subKey]: v, ...cached } };
                      });
                      setIsDirty(true);
                    } else {
                      handleFieldChange(`${key}.${subKey}`, v);
                    }
                  },
                  ((sd.required as string[]) ?? []).includes(subKey),
                  schema!
                )}
              </Box>
            );
          });
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            {/* Outline / scroll-spy rail (hidden on small screens) */}
            <Box
              component="aside"
              sx={{
                position: 'sticky',
                top: 16,
                width: 192,
                flexShrink: 0,
                display: { xs: 'none', md: 'block' },
                pt: 0.5,
              }}
              aria-label="Form sections"
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 1,
                  pb: 1,
                  color: theme.palette.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                  fontSize: 11,
                }}
              >
                On this page
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {sections.map((s) => {
                  const isActive = activeSection === s.id;
                  return (
                    <Box
                      component="li"
                      key={s.id}
                      sx={{
                        borderLeft: `2px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
                      }}
                    >
                      <Box
                        component="button"
                        onClick={() => scrollToSection(s.id)}
                        sx={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          px: 1.5,
                          py: 0.5,
                          fontFamily: 'inherit',
                          fontSize: '12px',
                          color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                          fontWeight: isActive ? 500 : 400,
                          '&:hover': { color: theme.palette.text.primary },
                          textTransform: 'capitalize',
                        }}
                      >
                        {s.title.replace(/_/g, ' ')}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Form content column */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
            {kind === 'agent' ? (
              <>
                {/* Agent — Identification: flat core fields + meta sub-fields inline */}
                <Paper
                  elevation={0}
                  id="section-identification"
                  ref={(el: HTMLElement | null) => { sectionRefs.current['section-identification'] = el; }}
                  sx={cardSx}
                >
                  {cardHeading('Identification')}
                  {flatEntries.map(([key, sd]) => (
                    <Box key={key}>
                      {renderField(key, sd, formData[key], (v) => handleFieldChange(key, v), requiredFields.includes(key), schema!)}
                    </Box>
                  ))}
                  {(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const metaSd = topLevelSchemaProps['meta'] as Record<string, any> | undefined;
                    if (!metaSd?.properties) return null;
                    const metaRequired: string[] = metaSd.required ?? [];
                    return Object.entries(metaSd.properties as Record<string, unknown>).map(([subKey, subDef]) => (
                      <Box key={subKey}>
                        {renderField(
                          subKey,
                          subDef as Record<string, unknown>,
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (formData.meta as Record<string, any> | undefined)?.[subKey],
                          (v) => handleFieldChange(`meta.${subKey}`, v),
                          metaRequired.includes(subKey),
                          schema!
                        )}
                      </Box>
                    ));
                  })()}
                </Paper>

                {/* Agent — IAM Role */}
                {topLevelSchemaProps['role'] && (
                  <Paper
                    elevation={0}
                    id="section-role"
                    ref={(el: HTMLElement | null) => { sectionRefs.current['section-role'] = el; }}
                    sx={cardSx}
                  >
                    {cardHeading('IAM Role', (topLevelSchemaProps['role'] as Record<string, unknown>).description as string | undefined)}
                    <Box>
                      {renderField(
                        'role',
                        topLevelSchemaProps['role'] as Record<string, unknown>,
                        formData.role,
                        (v) => handleFieldChange('role', v),
                        requiredFields.includes('role'),
                        schema!
                      )}
                    </Box>
                  </Paper>
                )}

                {/* Agent — nested sections, Input+Output merged, Artifacts+Policies merged */}
                {(() => {
                  const AGENT_TITLES: Record<string, string> = {
                    ui:            'Consumer UI',
                    runtime:       'Model Configuration',
                    input:         'Input / Output',
                    system_prompt: 'Behaviour',
                    tools:         'Tools',
                    knowledge:     'Knowledge Bases',
                    memory:        'Memory Collection',
                    guardrails:    'Guardrails',
                    orchestration: 'Orchestration',
                    state:         'State',
                    artifacts:     'Artifacts & Policies',
                    observability: 'Observability',
                  };
                  const cards: React.ReactNode[] = [];
                  let inputOutputRendered = false;
                  let artifactsPoliciesRendered = false;

                  nestedEntries.forEach(([key, sd]) => {
                    if (key === 'input' || key === 'output') {
                      if (!inputOutputRendered) {
                        inputOutputRendered = true;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const inputSd = topLevelSchemaProps['input'] as Record<string, any> | undefined;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const outputSd = topLevelSchemaProps['output'] as Record<string, any> | undefined;
                        cards.push(
                          <Paper key="input-output" elevation={0} id="section-input" ref={(el: HTMLElement | null) => { sectionRefs.current['section-input'] = el; }} sx={cardSx}>
                            {cardHeading('Input / Output')}
                            {inputSd?.properties && Object.entries(inputSd.properties as Record<string, unknown>).map(([subKey, subDef]) => (
                              <Box key={`in-${subKey}`}>
                                {renderField(
                                  subKey, subDef as Record<string, unknown>,
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (formData.input as Record<string, any> | undefined)?.[subKey],
                                  (v) => handleFieldChange(`input.${subKey}`, v),
                                  ((inputSd.required as string[]) ?? []).includes(subKey),
                                  schema!
                                )}
                              </Box>
                            ))}
                            {inputSd && outputSd && <Divider sx={{ my: 2 }} />}
                            {outputSd?.properties && Object.entries(outputSd.properties as Record<string, unknown>).map(([subKey, subDef]) => (
                              <Box key={`out-${subKey}`}>
                                {renderField(
                                  subKey, subDef as Record<string, unknown>,
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (formData.output as Record<string, any> | undefined)?.[subKey],
                                  (v) => handleFieldChange(`output.${subKey}`, v),
                                  ((outputSd.required as string[]) ?? []).includes(subKey),
                                  schema!
                                )}
                              </Box>
                            ))}
                          </Paper>
                        );
                      }
                    } else if (key === 'artifacts' || key === 'policies') {
                      if (!artifactsPoliciesRendered) {
                        artifactsPoliciesRendered = true;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const artifactsSd = topLevelSchemaProps['artifacts'] as Record<string, any> | undefined;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const policiesSd = topLevelSchemaProps['policies'] as Record<string, any> | undefined;
                        cards.push(
                          <Paper key="artifacts-policies" elevation={0} id="section-artifacts" ref={(el: HTMLElement | null) => { sectionRefs.current['section-artifacts'] = el; }} sx={cardSx}>
                            {cardHeading('Artifacts & Policies')}
                            {artifactsSd?.properties && Object.entries(artifactsSd.properties as Record<string, unknown>).map(([subKey, subDef]) => (
                              <Box key={`art-${subKey}`}>
                                {renderField(
                                  subKey, subDef as Record<string, unknown>,
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (formData.artifacts as Record<string, any> | undefined)?.[subKey],
                                  (v) => handleFieldChange(`artifacts.${subKey}`, v),
                                  ((artifactsSd.required as string[]) ?? []).includes(subKey),
                                  schema!
                                )}
                              </Box>
                            ))}
                            {artifactsSd && policiesSd && <Divider sx={{ my: 2 }} />}
                            {policiesSd?.properties && Object.entries(policiesSd.properties as Record<string, unknown>).map(([subKey, subDef]) => (
                              <Box key={`pol-${subKey}`}>
                                {renderField(
                                  subKey, subDef as Record<string, unknown>,
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (formData.policies as Record<string, any> | undefined)?.[subKey],
                                  (v) => handleFieldChange(`policies.${subKey}`, v),
                                  ((policiesSd.required as string[]) ?? []).includes(subKey),
                                  schema!
                                )}
                              </Box>
                            ))}
                          </Paper>
                        );
                      }
                    } else {
                      const sectionId = `section-${key}`;
                      const title = AGENT_TITLES[key] ?? (sd.title as string | undefined) ?? key.replace(/_/g, ' ');
                      cards.push(
                        <Paper key={key} elevation={0} id={sectionId} ref={(el: HTMLElement | null) => { sectionRefs.current[sectionId] = el; }} sx={cardSx}>
                          {cardHeading(title, Boolean(sd.description) ? sd.description as string : undefined)}
                          {renderNestedSectionContent(key, sd)}
                        </Paper>
                      );
                    }
                  });
                  return cards;
                })()}
              </>
            ) : (
              <>
                {/* Generic — flat / identification card */}
                {flatEntries.length > 0 && (
                  <Paper
                    elevation={0}
                    id="section-identification"
                    ref={(el: HTMLElement | null) => { sectionRefs.current['section-identification'] = el; }}
                    sx={cardSx}
                  >
                    {cardHeading('Identification & settings')}
                    {flatEntries.map(([key, sd]) => (
                      <Box key={key}>
                        {renderField(key, sd, formData[key], (v) => handleFieldChange(key, v), requiredFields.includes(key), schema!, getRefOptions(key))}
                      </Box>
                    ))}
                  </Paper>
                )}

                {/* Generic — one card per nested object */}
                {nestedEntries.map(([key, sd]) => (
                  <Paper key={key} elevation={0} id={`section-${key}`} ref={(el: HTMLElement | null) => { sectionRefs.current[`section-${key}`] = el; }} sx={cardSx}>
                    {cardHeading(key, Boolean(sd.description) ? sd.description as string : undefined)}
                    {renderNestedSectionContent(key, sd)}
                  </Paper>
                ))}
              </>
            )}

            {/* Markdown body card — shown when schema has no markdown fields (free-form body),
                or when there is leftover/unknown content after parsing known sections. */}
            {(() => {
              const hasMarkdownFields = collectMarkdownFields(schema!).length > 0;
              if (hasMarkdownFields && !bodyContent.trim()) return null;
              const heading = hasMarkdownFields
                ? 'Additional content'
                : kind === 'guardrail' ? 'Rules & Examples'
                : 'Description';
              const hint = hasMarkdownFields
                ? 'Content from the file body that did not match a known section.'
                : 'Markdown content stored in the body of the file. Use headings (# / ##) to structure sections.';
              return (
                <Paper elevation={0} id="section-body" ref={(el: HTMLElement | null) => { sectionRefs.current['section-body'] = el; }} sx={cardSx}>
                  {cardHeading(heading, hint)}
                  <TextField
                    fullWidth
                    multiline
                    minRows={10}
                    value={bodyContent}
                    onChange={(e) => { setBodyContent(e.target.value); setIsDirty(true); }}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '13px',
                        lineHeight: '20px',
                      },
                    }}
                  />
                </Paper>
              );
            })()}
          </Box>
        </Box>
        );
      })()}

      {/* Raw mode — Monaco Editor */}
      {mode === 'raw' && (
        <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '6px', overflow: 'hidden' }}>
          <Suspense fallback={<Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>}>
            <MonacoEditor
              height="600px"
              defaultLanguage="yaml"
              value={rawContent}
              onChange={(v) => { setRawContent(v ?? ''); setIsDirty(true); }}
              theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
              options={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: 13,
                lineHeight: 20,
                tabSize: 2,
                wordWrap: 'off',
                minimap: { enabled: false },
                stickyScroll: { enabled: true },
                bracketPairColorization: { enabled: true },
                scrollBeyondLastLine: false,
              }}
            />
          </Suspense>
        </Box>
      )}
    </Box>
  );
});
