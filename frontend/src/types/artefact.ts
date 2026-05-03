/**
 * AML Studio — Artefact types derived from the AML JSON Schemas.
 * These TypeScript types mirror the JSON schemas in /aml-schemas/*.schema.json.
 * Validation against schemas is performed dynamically via Ajv — see validation.ts.
 */

export type AmlId = string; // ^[a-z0-9_-]{3,64}$
export type Semver = string; // ^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$

export type ArtefactKind = 'agent' | 'tool' | 'kb' | 'iam' | 'model' | 'collection' | 'guardrail';

export const ARTEFACT_KINDS: ArtefactKind[] = [
  'agent', 'tool', 'kb', 'iam', 'model', 'collection', 'guardrail',
];

export const KIND_LABELS: Record<ArtefactKind, string> = {
  agent: 'Agent',
  tool: 'Tool',
  kb: 'Knowledge Base',
  iam: 'IAM Role',
  model: 'Model',
  collection: 'Collection',
  guardrail: 'Guardrail',
};

export const KIND_PLURAL_LABELS: Record<ArtefactKind, string> = {
  agent: 'Agents',
  tool: 'Tools',
  kb: 'Knowledge Bases',
  iam: 'IAM Roles',
  model: 'Models',
  collection: 'Collections',
  guardrail: 'Guardrails',
};

export const KIND_FILE_EXTENSIONS: Record<ArtefactKind, string> = {
  agent: '.agent.md',
  tool: '.tool.md',
  kb: '.kb.md',
  iam: '.iam.md',
  model: '.model.md',
  collection: '.collection.md',
  guardrail: '.guardrail.md',
};

export const KIND_URL_SEGMENTS: Record<ArtefactKind, string> = {
  agent: 'agents',
  tool: 'tools',
  kb: 'knowledge-bases',
  iam: 'iam-roles',
  model: 'models',
  collection: 'collections',
  guardrail: 'guardrails',
};

/** Folder names used when generating file paths for new artefacts. */
export const KIND_FOLDER_NAMES: Record<ArtefactKind, string> = {
  agent: 'agents',
  tool: 'tools',
  kb: 'kb',
  iam: 'iam',
  model: 'models',
  collection: 'collections',
  guardrail: 'guardrails',
};

export type ArtefactStatus = 'draft' | 'active' | 'deprecated' | 'disabled';

export interface ArtefactMeta {
  /** Raw YAML front matter data */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  /** Markdown body (below the --- delimiter) */
  body: string;
}

/** A parsed AML artefact as stored in the app's local index */
export interface Artefact {
  id: string;
  kind: ArtefactKind;
  /** File path relative to repository root */
  filePath: string;
  /** Parsed YAML front matter */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontMatter: Record<string, any>;
  /** Markdown body */
  body: string;
  /** Raw file content */
  rawContent: string;
  /** Computed display name */
  displayName: string;
  /** Computed version or date string */
  versionLabel: string;
  status: ArtefactStatus;
  owner?: string;
  tags: string[];
  /** Whether this artefact has local unsaved changes */
  isDirty: boolean;
  /** Validation issues */
  validationErrors: ValidationIssue[];
  /** Commit history (populated from Git provider) */
  history?: CommitRecord[];
}

export interface CommitRecord {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  path?: string;
}

/** A repository tracked by AML Studio */
export interface Repository {
  id: string;
  name: string;
  /** Full name, e.g. "owner/repo" for Git repos */
  fullName?: string;
  provider: 'github' | 'bitbucket' | 'local' | 'public';
  isLocal: boolean;
  defaultBranch?: string;
  htmlUrl?: string;
  lastSyncedAt?: string;
  syncStatus: 'up-to-date' | 'behind' | 'ahead' | 'conflict' | 'not-connected' | 'syncing';
  syncBehindCount?: number;
  syncAheadCount?: number;
  reviewWorkflowEnabled: boolean;
  /** Optional sub-folder to scope artefact discovery (e.g. "agents/team-a") */
  rootPath?: string;
  artefacts: Artefact[];
  /** Local staged changes not yet pushed */
  stagedChanges: StagedChange[];
}

export interface StagedChange {
  artefactId: string;
  filePath: string;
  kind: ArtefactKind;
  changeType: 'added' | 'modified' | 'deleted';
  newContent?: string;
  originalContent?: string;
}
