# AML Studio

**AML Studio** is an open-source web portal for managing [Agent Modeling Language (AML)](https://alirion-io.github.io/aml/) artefacts stored in Git repositories. It provides a visual interface that lets anyone in an organisation — product managers, compliance officers, legal reviewers, and engineers alike — create, browse, edit, review, and version AI agent definitions without needing a code editor or Git expertise.

> **Note:** A large part of this portal has been designed and coded with the assistance of AI (GitHub Copilot / Claude), serving as a practical example of AI-assisted software development at the application layer.

[Access AML studio on Github pages](https://alirion-io.github.io/aml-studio/). Limited to public Git and local repositories.
---

## Why AML Studio?

AML files are plain Markdown + YAML files that live in Git. Without a dedicated tool, managing them requires a code editor, Git knowledge, and familiarity with YAML syntax — creating a technical bottleneck that slows down every non-engineering stakeholder who needs to understand or approve agent behaviour.

AML Studio removes that bottleneck entirely. It delegates storage and versioning to Git (no reinventing the wheel) while providing a zero-friction UI layer on top:

> _Any person in an organisation — regardless of technical background — should be able to understand what every AI agent does, propose changes to it, and have those changes safely versioned and reviewed, all without leaving their browser._

---

## Features

- **Repository management** — connect to GitHub repositories (public or OAuth-authenticated via an optional backend) or browse local repositories.
- **Visual artefact browser** — list, search, and filter all AML artefacts across a repository by kind, status, or name.
- **Visual form editor** — edit any artefact through a structured form validated against its JSON Schema, no YAML knowledge required.
- **Raw Markdown/YAML editor** — full Monaco-based editor for power users who prefer direct file editing.
- **Dependency graph** — explore how agents, tools, knowledge bases, models, guardrails, and IAM roles relate to one another.
- **Git-native commit flow** — stage changes, write commit messages, and push directly to the repository from the UI.
- **Pull request integration** — view and navigate open pull requests for a connected GitHub repository.
- **Artefact history** — browse the Git commit history of any individual artefact.
- **Offline-first** — works as a static file over `file://` with state persisted to IndexedDB; no server required for local or public repos.
- **i18n** — English and French supported out of the box.

### Artefact kinds

| Kind | File extension |
|------|---------------|
| Agent | `.agent.md` |
| Tool | `.tool.md` |
| Knowledge Base | `.kb.md` |
| IAM | `.iam.md` |
| Model | `.model.md` |
| Collection | `.collection.md` |
| Guardrail | `.guardrail.md` |

---

## Tech stack

- **React 19** + **TypeScript**
- **Vite** (single IIFE bundle for `file://` compatibility)
- **MUI v9** (Material UI) + Emotion
- **Zustand** (state management, persisted via `idb-keyval` / IndexedDB)
- **Monaco Editor** (raw YAML/Markdown editing)
- **Ajv** (JSON Schema validation)
- **React Router v7** (hash-based routing)

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
git clone https://github.com/alirion/aml-studio.git
cd aml-studio
npm install
```

### Environment

```bash
cp .env.example .env
```

The only environment variable is `VITE_BACKEND_URL`. Omit it to run in local-only mode (local repos + public GitHub repos). Set it to enable OAuth-authenticated access to private GitHub and Bitbucket repositories.

### Development

```bash
npm run dev       # Start Vite dev server with HMR
```

### Production build

```bash
npm run build     # TypeScript compile + Vite bundle → dist/
npm run preview   # Serve the built dist/ locally
```

The `dist/` folder is self-contained and can be opened directly in a browser over `file://`.

---

## Contributing

Contributions are very welcome — whether it's bug fixes, new features, improved translations, or better documentation.

### How to contribute

1. **Fork** the repository and create a feature branch from `main`.
2. **Install dependencies** with `npm install`.
3. **Make your changes.** Keep commits focused and descriptive.
4. **Lint** your code before submitting: `npm run lint`.
5. **Open a pull request** against `main` with a clear description of what you changed and why.

### Areas where help is especially appreciated

- Additional i18n translations (beyond English and French)
- Backend implementations for other Git providers (GitLab, Azure DevOps)
- Accessibility improvements
- Additional artefact kind support as the AML specification evolves
- Test coverage (there are currently no automated tests — any testing infrastructure is a great contribution)

### Code style

- TypeScript strict mode is enabled — avoid `any`.
- Components live in `src/components/` (shared UI) or `src/pages/` (route-level views).
- All user-facing strings must go through the i18n layer (`src/i18n/`).
- State changes go through the Zustand store (`src/store/store.ts`), not local component state.

---

## License

MIT — see [LICENSE](../LICENSE) for details.
