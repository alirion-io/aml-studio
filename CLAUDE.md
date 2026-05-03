# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript compile + Vite bundle (output: dist/)
npm run lint      # ESLint with TypeScript + React plugins
npm run preview   # Serve the built dist/ locally
```

There are no automated tests.

## What This App Does

AML Studio is a React + TypeScript frontend that lets non-technical users (PMs, compliance officers) manage **Agent Modeling Language (AML)** artefacts stored in Git repositories. All changes flow through Git for versioning and governance. It runs as a static file, so the build output must work over the `file://` protocol.

## Architecture

### Key Design Constraints
- The entire app is bundled as a single IIFE (no ES modules, no dynamic imports) via a custom Vite plugin `fileProtocolCompat()` in `vite.config.ts`. This strips `crossorigin` attributes and converts module scripts to `defer` for `file://` compatibility.
- Hash-based routing (`createHashRouter`) is required for the same reason.
- State is persisted to **IndexedDB** via `idb-keyval`, with a silent in-memory fallback.

### Main Layers

**Routing & Pages** (`src/App.tsx`, `src/pages/`)  
Route components map to repository-scoped views: Dashboard → Overview → ArtefactList → ArtefactDetail. The `DependencyGraphPage` and `PullRequestsPage` are also repository-scoped. `SettingsPage` is global.

**State** (`src/store/store.ts`)  
Single Zustand store. Holds all repositories, artefacts, UI flags, dirty tracking, staged changes, and user preferences. Persisted to IndexedDB. This is the central source of truth — components read and write here, not to local state.

**Data / Parsing** (`src/utils/amlParser.ts`, `src/utils/validation.ts`)  
Artefact files are YAML front matter + Markdown body (e.g. `my-agent.agent.md`). `amlParser.ts` parses raw content into `Artefact` objects. `validation.ts` uses Ajv with schemas from `public/schemas/` (one JSON Schema per artefact kind). Validators are compiled once at startup.

**API** (`src/api/api.ts`)  
Calls an optional backend (`VITE_BACKEND_URL`) for OAuth-authenticated repos (GitHub, Bitbucket). Public GitHub repos are accessed directly via the GitHub REST API. Without a backend, only local repos and public GitHub repos are available.

**UI** (`src/components/`)  
MUI v9 components, styled with Emotion. Design tokens are in `src/theme/tokens.ts`; the MUI theme is assembled in `src/theme/theme.ts`. i18n strings are in `src/i18n/` (English and French).

### Artefact Kinds

Seven kinds, each with its own file extension and JSON Schema:

| Kind | Extension | Schema |
|------|-----------|--------|
| agent | `.agent.md` | `public/schemas/agent.schema.json` |
| tool | `.tool.md` | `public/schemas/tool.schema.json` |
| kb | `.kb.md` | `public/schemas/kb.schema.json` |
| iam | `.iam.md` | `public/schemas/iam.schema.json` |
| model | `.model.md` | `public/schemas/model.schema.json` |
| collection | `.collection.md` | `public/schemas/collection.schema.json` |
| guardrail | `.guardrail.md` | `public/schemas/guardrail.schema.json` |

The `ArtefactKind` type and related constants live in `src/types/artefact.ts`.

### Edit → Commit Flow

1. User edits an artefact in `ArtefactEditTab` (form or Monaco editor).
2. Changes are written to the Zustand store and marked dirty.
3. `PushPanel` collects all dirty artefacts into `StagedChange[]`.
4. On commit, changes go to the backend API or directly to the GitHub API, depending on repo type.

### Environment

Copy `.env.example` to `.env`. The only variable is `VITE_BACKEND_URL` — omit it to run in local-only mode.
