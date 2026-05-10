/**
 * AML Studio — English (en) language file
 * This is the default language and must always be present.
 * All other language files must export the same shape as this object.
 */

const en = {
  locale: 'en',
  name: 'English',

  // Global
  appName: 'AML Studio',
  loading: 'Loading…',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  close: 'Close',
  retry: 'Retry',
  refresh: 'Refresh',
  search: 'Search',
  clear: 'Clear',
  clearFilters: 'Clear filters',
  download: 'Download',
  upload: 'Upload',
  open: 'Open',
  copy: 'Copy',
  back: 'Back',
  next: 'Next',
  more: 'more',
  showAll: 'Show all',
  hide: 'Hide',
  show: 'Show',
  yes: 'Yes',
  no: 'No',
  na: '—',
  optional: 'Optional',
  required: 'Required',
  new: 'New',
  noResults: 'No results',

  // Navigation
  allRepositories: 'All Repositories',
  workspace: 'WORKSPACE',
  versionControl: 'VERSION CONTROL',
  repository: 'REPOSITORY',
  artefacts: 'ARTEFACTS',
  overview: 'Overview',
  agents: 'Agents',
  tools: 'Tools',
  knowledgeBases: 'Knowledge Bases',
  iamRoles: 'IAM Roles',
  models: 'Models',
  collections: 'Collections',
  guardrails: 'Guardrails',
  pullRequests: 'Pull Requests',
  graph: 'Graph',
  settings: 'Settings',

  // Dashboard
  repositories: 'Repositories',
  addRepository: 'Add repository',
  newLocal: 'New local',
  switchRepository: 'Switch repository',
  repositoryCount: (n: number) => `${n} repositor${n === 1 ? 'y' : 'ies'}`,
  welcomeTitle: 'Welcome to AML Studio',
  welcomeDescription: 'Connect a repository to start browsing and editing your AML agent definitions.',
  lastSynced: 'Last synced',
  notConnected: 'Not connected to Git',

  // Repository card
  upToDate: 'Up to date',
  behind: (n: number) => `${n} behind — Pull to update`,
  ahead: (n: number) => `${n} unpushed changes`,
  conflict: 'Conflict — resolve before syncing',
  syncing: 'Syncing…',
  localOnly: 'Local only',
  disconnect: 'Disconnect repository',
  disconnectConfirmTitle: (name: string) => `Disconnect ${name}?`,
  disconnectConfirmBody: (name: string) =>
    `This removes ${name} from your Studio view. The repository and all its files on GitHub remain untouched.`,
  pull: 'Pull',
  publish: 'Publish',
  pullRequests_short: 'Pull Requests',

  // Add repository modal
  addRepositoryTitle: 'Add a repository',
  chooseProvider: 'Select your Git provider to continue.',
  github: 'GitHub',
  githubDomain: 'github.com',
  bitbucket: 'Bitbucket',
  bitbucketDomain: 'bitbucket.org',
  gitCredentialsNote:
    'Your Git credentials are never stored in AML Studio. We use OAuth to access your repositories on your behalf.',
  githubDisabledTooltip: 'GitHub connection requires a backend. Configure the backend URL in config.ts to enable.',
  bitbucketDisabledTooltip: 'Bitbucket connection requires a backend. Configure the backend URL in config.ts to enable.',

  // New local repository modal
  newLocalTitle: 'New local repository',
  newLocalNameLabel: 'Repository name',
  newLocalNameHelp: 'A short name for this local workspace (e.g. "my-agents").',
  createLocalRepository: 'Create local repository',

  // Import public repo
  importPublicTitle: 'Import public repository',
  importPublicUrlLabel: 'Public Git repository URL',
  importPublicUrlHelp: 'Paste the HTTPS URL of any public GitHub or Bitbucket repository.',
  importPublicRootPathLabel: 'Root path (optional)',
  importPublicRootPathHelp: 'Limit discovery to a sub-folder, e.g. "agents/team-a". Leave blank to scan the whole repository.',
  importPublicButton: 'Import repository',

  // Repository overview
  lastCommit: 'Last commit',
  viewOn: (provider: string) => `View on ${provider}`,
  branch: 'Branch',
  localChanges: 'LOCAL CHANGES',
  localChangesCount: (n: number) => `${n} file${n === 1 ? '' : 's'} modified`,
  reviewAndPublish: 'Review & publish',
  importFiles: 'Import files',
  importFolder: 'Import folder',
  downloadZip: 'Download',
  importTitle: 'Import',
  importDescription: 'Import AML files from your local filesystem into this repository.',
  downloadZipTitle: 'Download ZIP',
  downloadZipDescription: 'Download all AML files from this repository as a ZIP archive.',
  notConnectedGit: 'Not connected to Git.',
  filesStoredLocally: 'Files are stored locally in your browser only.',
  connectToGit: 'Connect to Git',
  syncStatus: 'SYNC STATUS',
  gitConnection: 'GIT CONNECTION',
  dataSection: 'Data',

  // Artefact list
  newArtefact: (kind: string) => `New ${kind}`,
  artefactCount: (n: number, kind: string) => `${n} ${kind}${n === 1 ? '' : 's'}`,
  searchPlaceholder: (kind: string) => `Search ${kind.toLowerCase()}…`,
  emptyKindTitle: (kind: string) => `No ${kind.toLowerCase()} yet`,
  emptyKindDescription: (kind: string) =>
    `Create your first ${kind.toLowerCase().replace(/s$/, '')} to start authoring AML.`,
  noResultsForFilters: 'No results match your filters.',
  resetFilters: 'Reset filters',
  allStatuses: 'All Statuses',
  allOwners: 'All Owners',
  allTags: 'All Tags',
  filterStatus: 'Status',
  filterOwner: 'Owner',
  filterTags: 'Tags',
  showingCount: (n: number, total: number, kind: string) => `Showing ${n} of ${total} ${kind}`,
  deleteArtefactTitle: (id: string) => `Delete ${id}?`,
  deleteArtefactBody: (_id: string) =>
    `This removes the file from the repository on your next publish. This action can be undone by not publishing your changes.`,
  viewHistory: 'View History',
  viewDependencies: 'View Dependencies',
  copyToRepository: 'Copy to Repository',

  // Status labels
  statusActive: 'Active',
  statusDraft: 'Draft',
  statusDeprecated: 'Deprecated',
  statusDisabled: 'Disabled',
  statusInReview: 'In Review',

  // Artefact detail
  tabOverview: 'Overview',
  tabEdit: 'Edit',
  tabDependencies: 'Dependencies',
  tabUsedBy: 'Used By',
  tabHistory: 'History',
  usedByEmpty: 'No artefacts reference this one.',
  validationIssues: (n: number) => `This artefact has ${n} validation issue${n === 1 ? '' : 's'}.`,
  editToFix: 'Edit to fix',
  artefactNotFound: (id: string) => `Artefact '${id}' not found in this repository.`,
  showMore: 'Show more',
  showLess: 'Show less',
  viewRaw: 'View Raw',
  downloadFile: 'Download file',
  viewOnProvider: (provider: string) => `View on ${provider}`,

  // Form editor
  formMode: 'Form',
  rawMode: 'Raw',
  savedSuccess: 'Saved ✓',
  fixErrorsBeforeSaving: 'Fix the highlighted errors before saving.',
  noChangesToSave: 'No changes to save.',
  sectionErrors: (n: number) => `⚠ ${n} section${n === 1 ? '' : 's'} have errors`,
  parseFailWarning:
    'Could not parse back to form. Your raw content has syntax issues. Stay in raw mode and fix them, or discard raw changes.',
  stayInRaw: 'Stay in raw mode',
  discardRawChanges: 'Discard and return to form',

  // Push panel
  publishChanges: 'Publish Changes',
  pushingToPrefix: 'Pushing to',
  pushingToNewBranchPR: 'new branch → PR',
  filesReadyToPublish: (n: number) => `${n} file${n === 1 ? '' : 's'} ready to publish`,
  allFilesSharedMessage: 'All files share a message',
  perFileMessages: 'Each file has its own message',
  commitMessage: 'COMMIT MESSAGE',
  viewDiff: 'View diff',
  publishButton: (n: number) => `Publish ${n} file${n === 1 ? '' : 's'}`,
  cannotPublishErrors: 'Cannot publish — fix errors first.',
  reviewWorkflowNote:
    'Review workflow is enabled. Your changes will be published to a feature branch and a pull request will be opened on GitHub for review.',

  // Pull requests
  pullRequestsTitle: 'Pull Requests',
  pullRequestsSubtitle: (repo: string, time: string) => `Open pull requests for ${repo} · Last refreshed ${time}`,
  openedBy: 'Opened by',
  closedPRs: (n: number) => `${n} closed or merged pull request${n === 1 ? '' : 's'} (last 30 days)`,
  noPullRequests: 'No open pull requests',
  noPullRequestsDescription:
    'When you publish changes with the review workflow enabled, a pull request will appear here.',
  reviewWorkflowDisabledNotice:
    'Review workflow is disabled for this repository. Changes are pushed directly to the default branch. Enable it in Settings if you want pull request oversight.',
  goToSettings: 'Go to Settings',
  notConnectedPRs: 'Pull requests are not available for local-only repositories. Connect this repository to GitHub or Bitbucket to use pull requests.',
  viewOnGitHub: 'View on GitHub ↗',
  viewOnBitbucket: 'View on Bitbucket ↗',

  // Graph
  dependencyGraph: 'Dependency Graph',
  filterByKind: 'Filter by kind:',
  searchNode: 'Search node…',
  fitToScreen: 'Fit to screen',
  downloadSVG: 'Download SVG',
  fullscreen: 'Fullscreen',
  layoutHierarchical: 'Hierarchical',
  layoutForce: 'Force-directed',
  layoutCircular: 'Circular',

  // Settings
  settingsTitle: 'Settings',
  repositorySettings: 'REPOSITORY SETTINGS',
  userPreferences: 'USER PREFERENCES',
  language: 'Language',
  diagnostics: 'Diagnostics',
  exportAppState: 'Export app state',
  exportAppStateDescription: 'Download the full IndexedDB state as JSON for debugging.',
  exportLabel: 'Export',
  appliesToAll: 'Applies to all repositories',
  reviewWorkflow: 'Review Workflow',
  reviewWorkflowDescription:
    'Require a pull request before changes reach main. When enabled, all pushes create a feature branch and open a PR on GitHub.',
  amlSchemaVersion: 'AML Schema version',
  currentlyBundled: (v: string) => `Currently bundled: ${v}`,
  checkForUpdate: 'Check for update',
  lastChecked: (time: string) => `Last checked: ${time}`,
  updateAvailable: (v: string) => `AML Schema ${v} is available.`,
  updateTo: (v: string) => `Update to ${v}`,
  upToDateSchema: (v: string) => `You are using the latest AML Schema (${v}). Last checked just now.`,
  defaultEditorMode: 'Default editor mode',
  markdownEditorStyle: 'Markdown editor style',
  colourTheme: 'Colour theme',
  wysiwyg: 'WYSIWYG',
  codeAndPreview: 'Code + preview',
  systemDefault: 'System default',
  light: 'Light',
  dark: 'Dark',
  visualForm: 'Visual form',
  rawEditor: 'Raw editor',

  // Banners
  unpushedChangesBanner: (n: number) =>
    `You have ${n} unpushed change${n === 1 ? '' : 's'} in this repository.`,
  unpushedShort: (n: number) => `${n} unpushed`,
  offlineBanner: 'This repository is not connected to Git. Changes are stored locally only.',

  // Validation
  fieldRequired: 'This field is required.',
  idPatternError: 'Use lowercase letters, numbers, hyphens, and underscores (3–64 chars).',
  idAlreadyUsed: 'This ID is already used in this repository.',
  brokenReference: (id: string) => `Artefact not found in this repository: ${id}`,
  noArtefactsOfKind: (kind: string) => `No ${kind} in this repository yet.`,
  createOne: 'Create one',
  shortcutsTitle: 'Keyboard shortcuts',

  // Artefact sections
  sectionIdentification: 'Identification',
  sectionConsumerUI: 'Consumer UI',
  sectionModelConfig: 'Model Configuration',
  sectionBehaviour: 'Behaviour',
  sectionInputOutput: 'Input / Output',
  sectionTools: 'Tools',
  sectionGuardrails: 'Guardrails',
  sectionKnowledgeBases: 'Knowledge Bases',
  sectionIAMRole: 'IAM Role',
  sectionMemoryCollection: 'Memory Collection',
  sectionOrchestration: 'Orchestration',
  sectionArtifactsPolicies: 'Artifacts & Policies',
  sectionMetadata: 'Metadata',

  // Toasts
  toastPublishSuccess: 'Changes published successfully',
  toastSyncComplete: (n: number) => `Repository sync complete. Found ${n} new artefacts.`,
  toastValidationWarnings: (n: number) => `${n} file${n === 1 ? '' : 's'} have validation warnings.`,
  toastPushFailed: 'Push failed. Check your connection and try again.',
  toastRepoConnected: (name: string, counts: string) => `${name} connected. ${counts}`,
  toastRepoCopied: (id: string, target: string) => `${id} copied to ${target}.`,
  toastArtefactDeleted: (id: string) => `${id} deleted (staged — will be removed on next publish).`,
  toastArtefactSaved: (id: string) => `${id} saved locally.`,

  // History tab
  historyNotAvailableLocal: 'Commit history is not available for local-only repositories.',
  noHistory: 'No commit history found.',
  commitHistory: 'Commit history for this file.',

  // Search modal
  searchModalPlaceholder: 'Search artefacts… (name, ID, tag, owner)',
  searchModalNoResults: 'No artefacts found.',
  searchModalKindFilter: 'Filter by kind',

  // Push panel
  discardChange: 'Discard change',
  diffView: 'Preview changes',
  diffViewClose: 'Close preview',
  diffPreviousLabel: 'Before',
  diffNextLabel: 'After',
  pushingChanges: 'Publishing…',
  pushLocalNote: 'This repository is local-only. Connect to GitHub or Bitbucket to publish changes.',
  noChangesTitle: 'Nothing to publish',
  noChangesBody: 'Make some edits first.',

  // Errors
  errorLoadPRs: 'Could not load pull requests from GitHub. This may be a temporary issue.',
  errorGeneric: 'Something went wrong. Please try again.',
};

export type Translations = typeof en;
export default en;
