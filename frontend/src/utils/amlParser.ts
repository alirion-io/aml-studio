/**
 * AML Studio — AML file parser
 * Parses raw AML .md file content (YAML front matter + Markdown body) into Artefact objects.
 * Uses js-yaml for front matter extraction and the AML JSON schemas for field derivation.
 */

import yaml from 'js-yaml';
import type {
  Artefact,
  ArtefactKind,
} from '../types/artefact';
import { KIND_FILE_EXTENSIONS } from '../types/artefact';

/**
 * Detect the artefact kind from a file path based on its extension.
 */
export function detectKind(filePath: string): ArtefactKind | null {
  for (const [kind, ext] of Object.entries(KIND_FILE_EXTENSIONS) as [ArtefactKind, string][]) {
    if (filePath.toLowerCase().endsWith(ext)) return kind;
  }
  return null;
}

/**
 * Split raw AML file content into YAML front matter and Markdown body.
 * AML files follow the format:
 *   ---
 *   (YAML front matter)
 *   ---
 *   (Markdown body)
 */
export function parseAmlFile(rawContent: string): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontMatter: Record<string, any>;
  body: string;
} {
  const lines = rawContent.split('\n');
  let frontMatter: Record<string, unknown> = {};
  let body = rawContent;

  if (lines[0]?.trim() === '---') {
    const closingIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (closingIdx > 0) {
      const yamlLines = lines.slice(1, closingIdx).join('\n');
      body = lines.slice(closingIdx + 1).join('\n').trimStart();
      try {
        frontMatter = (yaml.load(yamlLines, { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>) ?? {};
      } catch {
        frontMatter = {};
      }
    }
  }

  return { frontMatter, body };
}

// ─── Markdown-field descriptors ──────────────────────────────────────────────

/** A schema field that maps to a `# Heading` section in the markdown body. */
export interface MarkdownFieldDescriptor {
  /** Top-level schema property key (e.g. `"system_prompt"`, `"documentation"`). */
  parentKey: string;
  /** Property key inside the parent object (e.g. `"purpose"`, `"description"`). */
  fieldKey: string;
  /** Human-readable heading used in the body (e.g. `"Purpose"`, `"Description"`). */
  title: string;
}

/**
 * Walk a JSON Schema and return every property with `contentMediaType: "text/markdown"`.
 * Only top-level nested objects are inspected (one level deep).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function collectMarkdownFields(schema: Record<string, any>): MarkdownFieldDescriptor[] {
  const result: MarkdownFieldDescriptor[] = [];
  const props = (schema?.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [parentKey, parentDef] of Object.entries(props)) {
    if (parentDef.type !== 'object' || !parentDef.properties) continue;
    for (const [fieldKey, fieldDef] of Object.entries(
      parentDef.properties as Record<string, Record<string, unknown>>
    )) {
      if (fieldDef.contentMediaType === 'text/markdown' && fieldDef.type === 'string') {
        const title =
          (fieldDef.title as string | undefined) ??
          fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        result.push({ parentKey, fieldKey, title });
      }
    }
  }
  return result;
}

/**
 * Parse a markdown body into known field values and an unknown remainder.
 *
 * Rules:
 * - The body is split on `# Heading` (level-1) boundaries.
 * - Each heading is matched to a descriptor by title (case-insensitive).
 * - Unknown headings are appended to the most-recently matched field's content
 *   so no content is silently dropped.
 * - Text before the first heading is returned as `remainder`.
 */
export function parseBodySections(
  body: string,
  descriptors: MarkdownFieldDescriptor[]
): { fields: Record<string, string>; remainder: string } {
  if (descriptors.length === 0) return { fields: {}, remainder: body };

  const titleMap = new Map<string, MarkdownFieldDescriptor>(
    descriptors.map((d) => [d.title.toLowerCase(), d])
  );

  // Split on # headings
  const sections: { heading: string | null; content: string }[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of body.split('\n')) {
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });
      currentHeading = h1[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  sections.push({ heading: currentHeading, content: currentLines.join('\n').trim() });

  const fields: Record<string, string> = {};
  const remainderParts: string[] = [];
  let lastKnownKey: string | null = null;

  for (const { heading, content } of sections) {
    if (heading === null) {
      // Pre-heading content
      if (content) remainderParts.push(content);
      continue;
    }
    const descriptor = titleMap.get(heading.toLowerCase());
    if (descriptor) {
      const key = `${descriptor.parentKey}.${descriptor.fieldKey}`;
      fields[key] = content;
      lastKnownKey = key;
    } else {
      // Unknown section: append to previous known field to avoid data loss
      const block = `# ${heading}${content ? `\n\n${content}` : ''}`;
      if (lastKnownKey !== null) {
        fields[lastKnownKey] = fields[lastKnownKey]
          ? `${fields[lastKnownKey]}\n\n${block}`
          : block;
      } else {
        remainderParts.push(block);
      }
    }
  }

  return { fields, remainder: remainderParts.join('\n\n').trim() };
}

/**
 * Serialize markdown field values from `formData` into a body string.
 * Each field with a non-empty value is written as `# Title\n\ncontent`.
 * Descriptors are iterated in schema order.
 * Any non-empty `remainderBody` is appended at the end.
 */
export function serializeBodySections(
  descriptors: MarkdownFieldDescriptor[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: Record<string, any>,
  remainderBody: string
): string {
  const parts: string[] = [];
  for (const { parentKey, fieldKey, title } of descriptors) {
    const value: unknown = formData?.[parentKey]?.[fieldKey];
    if (typeof value === 'string' && value.trim()) {
      parts.push(`# ${title}\n\n${value.trim()}`);
    }
  }
  if (remainderBody.trim()) parts.push(remainderBody.trim());
  return parts.join('\n\n');
}

/**
 * Serialise a front matter object and Markdown body back into AML file content.
 */
export function serialiseAmlFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontMatter: Record<string, any>,
  body: string
): string {
  const yamlStr = yaml.dump(frontMatter, { lineWidth: 120, noRefs: true }).trimEnd();
  return `---\n${yamlStr}\n---\n\n${body.trimStart()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDisplayName(kind: ArtefactKind, fm: Record<string, any>): string {
  if (kind === 'agent') {
    return fm.ui?.display_name || fm.meta?.name || fm.agent_id || '';
  }
  return fm.meta?.name || fm[`${kind}_id`] || fm.id || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getArtefactId(kind: ArtefactKind, fm: Record<string, any>): string {
  const idField: Record<ArtefactKind, string> = {
    agent: 'agent_id',
    tool: 'tool_id',
    kb: 'kb_id',
    iam: 'iam_id',
    model: 'model_id',
    collection: 'collection_id',
    guardrail: 'guardrail_id',
  };
  return fm[idField[kind]] || fm.id || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getVersionLabel(kind: ArtefactKind, fm: Record<string, any>): string {
  if (kind === 'model' || kind === 'guardrail') {
    return fm.last_updated || fm.meta?.last_updated || '';
  }
  return fm.version ? `v${fm.version}` : '';
}

/**
 * Build a full Artefact object from raw file content and path.
 */
export function buildArtefact(filePath: string, rawContent: string): Artefact | null {
  const kind = detectKind(filePath);
  if (!kind) return null;

  const { frontMatter, body } = parseAmlFile(rawContent);

  return {
    id: getArtefactId(kind, frontMatter),
    kind,
    filePath,
    frontMatter,
    body,
    rawContent,
    displayName: getDisplayName(kind, frontMatter),
    versionLabel: getVersionLabel(kind, frontMatter),
    status: frontMatter.status ?? 'draft',
    owner: frontMatter.meta?.owner || frontMatter.owner,
    tags: frontMatter.meta?.tags ?? frontMatter.tags ?? [],
    isDirty: false,
    validationErrors: [],
  };
}
