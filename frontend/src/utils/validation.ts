/**
 * AML Studio — Schema-driven validation
 * Validates AML artefact front matter against the bundled JSON Schemas.
 * Schemas are loaded dynamically so they can be updated by the user from Settings.
 * Uses Ajv (Another JSON Schema Validator) — MIT licensed.
 */

import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidationIssue, ArtefactKind } from '../types/artefact';

// Import schemas as JSON (Vite handles JSON imports natively)
import agentSchema from '../../public/schemas/agent.schema.json';
import toolSchema from '../../public/schemas/tool.schema.json';
import kbSchema from '../../public/schemas/kb.schema.json';
import iamSchema from '../../public/schemas/iam.schema.json';
import modelSchema from '../../public/schemas/model.schema.json';
import collectionSchema from '../../public/schemas/collection.schema.json';
import guardrailSchema from '../../public/schemas/guardrail.schema.json';

const SCHEMAS: Record<ArtefactKind, object> = {
  agent: agentSchema,
  tool: toolSchema,
  kb: kbSchema,
  iam: iamSchema,
  model: modelSchema,
  collection: collectionSchema,
  guardrail: guardrailSchema,
};

/**
 * Recursively scan a schema object and inject `discriminator: { propertyName }`
 * on any node that has a `oneOf` where every branch defines the same property
 * with a `const` value.  This enables AJV v8's discriminator mode, which only
 * evaluates the matching branch and eliminates noise from the rest.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectDiscriminators(node: any, rootDefs?: Record<string, any>): any {
  if (typeof node !== 'object' || node === null) return node;
  if (Array.isArray(node)) return node.map((n) => injectDiscriminators(n, rootDefs));

  // Capture root $defs on first encounter and propagate down — all $refs use #/$defs/...
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentDefs: Record<string, any> | undefined =
    rootDefs ?? (node.$defs as Record<string, any> | undefined);

  // Recurse first so nested oneOf objects are also processed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const k of Object.keys(node)) {
    result[k] = injectDiscriminators(node[k], currentDefs);
  }

  if (Array.isArray(result.oneOf) && result.oneOf.length > 1 && !result.discriminator) {
    // Resolve $ref branches so we can inspect their const-valued properties.
    // Without this, branches like { "$ref": "#/$defs/transport_rest_api" } have no
    // visible `properties` and the discriminator is never injected.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolvedBranches = result.oneOf.map((branch: any) => {
      if (branch.$ref && currentDefs) {
        const refKey = (branch.$ref as string).replace(/^#\/\$defs\//, '');
        return currentDefs[refKey] ?? branch;
      }
      return branch;
    });

    // Find a property that has `const` in EVERY branch
    const firstProps = Object.keys(resolvedBranches[0]?.properties ?? {});
    for (const propKey of firstProps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (resolvedBranches.every((b: any) => b?.properties?.[propKey]?.const !== undefined)) {
        result.discriminator = { propertyName: propKey };
        break;
      }
    }
  }

  return result;
}

// Collect all $defs from every schema into a shared pool so that cross-schema
// $ref references (e.g. a guardrail schema referencing secret_ref defined only
// in the tool schema) can be resolved.  Local definitions always take priority.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _sharedDefs: Record<string, any> = {};
for (const schema of Object.values(SCHEMAS)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const [key, def] of Object.entries((schema as Record<string, any>).$defs ?? {})) {
    if (!(key in _sharedDefs)) _sharedDefs[key] = def;
  }
}

/** Inject shared $defs for any #/$defs/… reference that is missing locally. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchSchemaDefs(schema: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing: Record<string, any> = schema.$defs ?? {};
  return { ...schema, $defs: { ..._sharedDefs, ...existing } }; // local wins
}

// Pre-compile all validators once at module load.
// Using a single Ajv instance so internal $ref / $defs within each schema resolve correctly.
// allErrors: true   — collect all errors, not just the first.
// strict: false     — tolerate draft-07 schemas that use $defs (draft-2019+ keyword).
// discriminator: true — when discriminator keyword is present, only evaluate the matching
//                       oneOf branch (suppresses noise from non-matching branches).
const _ajv = new Ajv({ allErrors: true, strict: false, discriminator: true });
addFormats(_ajv);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VALIDATORS: Record<ArtefactKind, ReturnType<typeof _ajv.compile>> =
  Object.fromEntries(
    Object.entries(SCHEMAS).map(([kind, schema]) => [
      kind,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _ajv.compile(injectDiscriminators(patchSchemaDefs(schema as Record<string, any>))),
    ])
  ) as Record<ArtefactKind, ReturnType<typeof _ajv.compile>>;

/** No-op kept for API compatibility — validators are now compiled once at startup. */
export function resetValidator(): void {
  // intentionally empty
}

function formatError(err: ErrorObject): string {
  const path = err.instancePath ? `"${err.instancePath.replace(/^\//, '')}"` : '';
  const msg = err.message ?? 'Invalid value';
  return path ? `${path}: ${msg}` : msg;
}

/**
 * Remove noisy parent errors emitted by AJV when more-specific children exist.
 *
 * AJV emits "wrapper" errors for `if` and `oneOf` keywords alongside the real
 * field-level errors that explain what actually went wrong.  When children are
 * present, the wrapper adds nothing — suppress it.
 */
function filterParentNoise(errors: ErrorObject[]): ErrorObject[] {
  if (errors.length === 0) return errors;

  const suppressed = new Set<ErrorObject>();

  for (const e of errors) {
    if (e.keyword !== 'if' && e.keyword !== 'oneOf') continue;
    const hasChild = errors.some(
      (c) =>
        c !== e &&
        c.keyword !== 'if' &&
        c.keyword !== 'oneOf' &&
        (c.instancePath === e.instancePath ||
          c.instancePath.startsWith(e.instancePath ? e.instancePath + '/' : '/'))
    );
    if (hasChild) suppressed.add(e);
  }

  return errors.filter((e) => !suppressed.has(e));
}

/** Remove duplicate errors (same path + keyword + message). */
function deduplicateErrors(errors: ErrorObject[]): ErrorObject[] {
  const seen = new Set<string>();
  return errors.filter((e) => {
    const key = `${e.instancePath}|${e.keyword}|${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Validate a front matter object against the schema for the given kind.
 * Returns an array of ValidationIssue objects (empty = valid).
 */
export function validateArtefact(
  kind: ArtefactKind,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): ValidationIssue[] {
  const validate = VALIDATORS[kind];
  if (!validate) return [];

  const valid = validate(data);
  if (valid) return [];

  return deduplicateErrors(filterParentNoise(validate.errors ?? [])).map((err) => ({
    severity: 'error' as const,
    message: formatError(err),
    path: err.instancePath,
  }));
}
