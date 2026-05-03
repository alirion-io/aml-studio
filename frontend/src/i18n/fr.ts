/**
 * AML Studio — French (fr) language file
 * To add a new language: create a file with the locale code (e.g., de.ts, es.ts)
 * and export a Partial<Translations> or full Translations object.
 * The i18n system falls back to English for any missing keys.
 */

import type { Translations } from './en';

const fr: Partial<Translations> = {
  locale: 'fr',
  name: 'Français',

  // Global
  appName: 'AML Studio',
  loading: 'Chargement…',
  save: 'Enregistrer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  delete: 'Supprimer',
  edit: 'Modifier',
  create: 'Créer',
  close: 'Fermer',
  retry: 'Réessayer',
  refresh: 'Actualiser',
  search: 'Rechercher',
  clear: 'Effacer',
  clearFilters: 'Effacer les filtres',
  download: 'Télécharger',
  upload: 'Téléverser',
  open: 'Ouvrir',
  copy: 'Copier',
  back: 'Retour',
  next: 'Suivant',
  more: 'de plus',
  showAll: 'Tout afficher',
  hide: 'Masquer',
  show: 'Afficher',
  yes: 'Oui',
  no: 'Non',
  na: '—',
  optional: 'Optionnel',
  required: 'Obligatoire',
  new: 'Nouveau',
  noResults: 'Aucun résultat',

  // Navigation
  allRepositories: 'Tous les dépôts',
  workspace: 'ESPACE DE TRAVAIL',
  versionControl: 'CONTRÔLE DE VERSION',
  repository: 'DÉPÔT',
  artefacts: 'ARTEFACTS',
  overview: 'Vue d\'ensemble',
  agents: 'Agents',
  tools: 'Outils',
  knowledgeBases: 'Bases de connaissances',
  iamRoles: 'Rôles IAM',
  models: 'Modèles',
  collections: 'Collections',
  guardrails: 'Garde-fous',
  pullRequests: 'Pull Requests',
  graph: 'Graphe',
  settings: 'Paramètres',

  // Dashboard
  repositories: 'Dépôts',
  addRepository: 'Ajouter un dépôt',
  newLocal: 'Nouveau local',
  switchRepository: 'Changer de dépôt',
  repositoryCount: (n: number) => `${n} dépôt${n === 1 ? '' : 's'}`,
  welcomeTitle: 'Bienvenue dans AML Studio',
  welcomeDescription: 'Connectez un dépôt pour commencer à parcourir et modifier vos définitions d\'agents AML.',
  lastSynced: 'Dernière synchronisation',
  notConnected: 'Non connecté à Git',

  // Repository card
  upToDate: 'À jour',
  behind: (n: number) => `${n} commit${n === 1 ? '' : 's'} en retard — Tirer pour mettre à jour`,
  ahead: (n: number) => `${n} modification${n === 1 ? '' : 's'} non publiée${n === 1 ? '' : 's'}`,
  conflict: 'Conflit — résoudre avant la synchronisation',
  syncing: 'Synchronisation…',
  localOnly: 'Local uniquement',
  disconnect: 'Déconnecter le dépôt',
  disconnectConfirmTitle: (name: string) => `Déconnecter ${name} ?`,
  disconnectConfirmBody: (name: string) =>
    `Ceci supprime ${name} de votre vue Studio. Le dépôt et tous ses fichiers sur GitHub restent intacts.`,
  pull: 'Tirer',
  publish: 'Publier',
  pullRequests_short: 'Pull Requests',

  // Add repository modal
  addRepositoryTitle: 'Ajouter un dépôt',
  chooseProvider: 'Sélectionnez votre fournisseur Git pour continuer.',
  github: 'GitHub',
  githubDomain: 'github.com',
  bitbucket: 'Bitbucket',
  bitbucketDomain: 'bitbucket.org',
  gitCredentialsNote:
    'Vos informations d\'identification Git ne sont jamais stockées dans AML Studio. Nous utilisons OAuth pour accéder à vos dépôts en votre nom.',
  githubDisabledTooltip: 'La connexion GitHub nécessite un serveur. Configurez l\'URL du serveur dans config.ts pour l\'activer.',
  bitbucketDisabledTooltip: 'La connexion Bitbucket nécessite un serveur. Configurez l\'URL du serveur dans config.ts pour l\'activer.',

  // New local repository modal
  newLocalTitle: 'Nouveau dépôt local',
  newLocalNameLabel: 'Nom du dépôt',
  newLocalNameHelp: 'Un nom court pour cet espace de travail local (ex. "mes-agents").',
  createLocalRepository: 'Créer un dépôt local',

  // Import public repo
  importPublicTitle: 'Importer un dépôt public',
  importPublicUrlLabel: 'URL du dépôt Git public',
  importPublicUrlHelp: 'Collez l\'URL HTTPS d\'un dépôt GitHub ou Bitbucket public.',
  importPublicRootPathLabel: 'Chemin racine (optionnel)',
  importPublicRootPathHelp: 'Limite la découverte à un sous-dossier, ex. "agents/equipe-a". Laisser vide pour analyser tout le dépôt.',
  importPublicButton: 'Importer le dépôt',

  // Repository overview
  lastCommit: 'Dernier commit',
  viewOn: (provider: string) => `Voir sur ${provider}`,
  branch: 'Branche',
  localChanges: 'MODIFICATIONS LOCALES',
  localChangesCount: (n: number) => `${n} fichier${n === 1 ? '' : 's'} modifié${n === 1 ? '' : 's'}`,
  reviewAndPublish: 'Réviser et publier',
  importFiles: 'Importer des fichiers',
  importFolder: 'Importer un dossier',
  downloadZip: 'Télécharger',
  importTitle: 'Importer',
  importDescription: 'Importez des fichiers AML depuis votre système de fichiers local dans ce dépôt.',
  downloadZipTitle: 'Télécharger en ZIP',
  downloadZipDescription: 'Téléchargez tous les fichiers AML de ce dépôt sous forme d\'archive ZIP.',
  notConnectedGit: 'Non connecté à Git.',
  filesStoredLocally: 'Les fichiers sont stockés localement dans votre navigateur uniquement.',
  connectToGit: 'Se connecter à Git',
  syncStatus: 'ÉTAT DE SYNCHRONISATION',
  gitConnection: 'CONNEXION GIT',

  // Artefact list
  newArtefact: (kind: string) => `Nouveau ${kind}`,
  artefactCount: (n: number, kind: string) => `${n} ${kind}${n === 1 ? '' : 's'}`,
  searchPlaceholder: (kind: string) => `Rechercher ${kind.toLowerCase()}…`,
  emptyKindTitle: (kind: string) => `Aucun ${kind.toLowerCase()} pour l'instant`,
  emptyKindDescription: (kind: string) =>
    `Créez votre premier ${kind.toLowerCase().replace(/s$/, '')} pour commencer à rédiger en AML.`,
  noResultsForFilters: 'Aucun résultat ne correspond à vos filtres.',
  resetFilters: 'Réinitialiser les filtres',
  allStatuses: 'Tous les statuts',
  allOwners: 'Tous les responsables',
  allTags: 'Tous les tags',
  filterStatus: 'Statut',
  filterOwner: 'Responsable',
  filterTags: 'Tags',
  showingCount: (n: number, total: number, kind: string) => `Affichage de ${n} sur ${total} ${kind}`,
  deleteArtefactTitle: (id: string) => `Supprimer ${id} ?`,
  deleteArtefactBody: (_id: string) =>
    `Ceci supprime le fichier du dépôt lors de votre prochaine publication. Cette action peut être annulée en ne publiant pas vos modifications.`,
  viewHistory: 'Voir l\'historique',
  viewDependencies: 'Voir les dépendances',
  copyToRepository: 'Copier vers le dépôt',

  // Status labels
  statusActive: 'Actif',
  statusDraft: 'Brouillon',
  statusDeprecated: 'Déprécié',
  statusDisabled: 'Désactivé',
  statusInReview: 'En révision',

  // Artefact detail
  tabOverview: 'Vue d\'ensemble',
  tabEdit: 'Modifier',
  tabDependencies: 'Dépendances',
  tabUsedBy: 'Utilisé par',
  tabHistory: 'Historique',
  usedByEmpty: 'Aucun artefact ne référence celui-ci.',
  validationIssues: (n: number) => `Cet artefact a ${n} problème${n === 1 ? '' : 's'} de validation.`,
  editToFix: 'Modifier pour corriger',
  artefactNotFound: (id: string) => `Artefact '${id}' introuvable dans ce dépôt.`,
  showMore: 'Afficher plus',
  showLess: 'Afficher moins',
  viewRaw: 'Voir le brut',
  downloadFile: 'Télécharger le fichier',
  viewOnProvider: (provider: string) => `Voir sur ${provider}`,

  // Form editor
  formMode: 'Formulaire',
  rawMode: 'Brut',
  savedSuccess: 'Enregistré ✓',
  fixErrorsBeforeSaving: 'Corrigez les erreurs surlignées avant d\'enregistrer.',
  noChangesToSave: 'Aucune modification à enregistrer.',
  sectionErrors: (n: number) => `⚠ ${n} section${n === 1 ? '' : 's'} avec des erreurs`,
  parseFailWarning:
    'Impossible de reconvertir en formulaire. Le contenu brut contient des erreurs de syntaxe. Restez en mode brut et corrigez-les, ou annulez les modifications brutes.',
  stayInRaw: 'Rester en mode brut',
  discardRawChanges: 'Annuler et revenir au formulaire',

  // Push panel
  publishChanges: 'Publier les modifications',
  filesReadyToPublish: (n: number) => `${n} fichier${n === 1 ? '' : 's'} prêt${n === 1 ? '' : 's'} à publier`,
  allFilesSharedMessage: 'Tous les fichiers partagent un message',
  perFileMessages: 'Chaque fichier a son propre message',
  commitMessage: 'MESSAGE DE COMMIT',
  viewDiff: 'Voir les différences',
  publishButton: (n: number) => `Publier ${n} fichier${n === 1 ? '' : 's'}`,
  cannotPublishErrors: 'Impossible de publier — corrigez d\'abord les erreurs.',
  reviewWorkflowNote:
    'Le workflow de révision est activé. Vos modifications seront publiées sur une branche de fonctionnalité et une pull request sera ouverte sur GitHub pour révision.',

  // Pull requests
  pullRequestsTitle: 'Pull Requests',
  pullRequestsSubtitle: (repo: string, time: string) => `Pull requests ouvertes pour ${repo} · Actualisé à ${time}`,
  openedBy: 'Ouvert par',
  closedPRs: (n: number) => `${n} pull request${n === 1 ? '' : 's'} fermée${n === 1 ? '' : 's'} ou fusionnée${n === 1 ? '' : 's'} (30 derniers jours)`,
  noPullRequests: 'Aucune pull request ouverte',
  noPullRequestsDescription:
    'Lorsque vous publiez des modifications avec le workflow de révision activé, une pull request apparaîtra ici.',
  reviewWorkflowDisabledNotice:
    'Le workflow de révision est désactivé pour ce dépôt. Les modifications sont poussées directement sur la branche par défaut. Activez-le dans les Paramètres si vous souhaitez une supervision par pull request.',
  goToSettings: 'Aller aux paramètres',
  notConnectedPRs:
    'Les pull requests ne sont pas disponibles pour les dépôts locaux uniquement. Connectez ce dépôt à GitHub ou Bitbucket pour utiliser les pull requests.',
  viewOnGitHub: 'Voir sur GitHub ↗',
  viewOnBitbucket: 'Voir sur Bitbucket ↗',

  // Graph
  dependencyGraph: 'Graphe de dépendances',
  filterByKind: 'Filtrer par type :',
  searchNode: 'Rechercher un nœud…',
  fitToScreen: 'Ajuster à l\'écran',
  downloadSVG: 'Télécharger en SVG',
  fullscreen: 'Plein écran',
  layoutHierarchical: 'Hiérarchique',
  layoutForce: 'Force dirigée',
  layoutCircular: 'Circulaire',

  // Settings
  settingsTitle: 'Paramètres',
  repositorySettings: 'PARAMÈTRES DU DÉPÔT',
  userPreferences: 'PRÉFÉRENCES UTILISATEUR',
  appliesToAll: 'S\'applique à tous les dépôts',
  reviewWorkflow: 'Workflow de révision',
  reviewWorkflowDescription:
    'Exiger une pull request avant que les modifications atteignent la branche principale. Lorsqu\'activé, tous les push créent une branche de fonctionnalité et ouvrent une PR sur GitHub.',
  amlSchemaVersion: 'Version du schéma AML',
  currentlyBundled: (v: string) => `Version actuelle : ${v}`,
  checkForUpdate: 'Vérifier les mises à jour',
  lastChecked: (time: string) => `Dernière vérification : ${time}`,
  updateAvailable: (v: string) => `AML Schema ${v} est disponible.`,
  updateTo: (v: string) => `Mettre à jour vers ${v}`,
  upToDateSchema: (v: string) => `Vous utilisez la dernière version du schéma AML (${v}). Vérifié à l'instant.`,
  defaultEditorMode: 'Mode d\'édition par défaut',
  markdownEditorStyle: 'Style de l\'éditeur Markdown',
  colourTheme: 'Thème de couleur',
  wysiwyg: 'WYSIWYG',
  codeAndPreview: 'Code + aperçu',
  systemDefault: 'Par défaut du système',
  light: 'Clair',
  dark: 'Sombre',
  visualForm: 'Formulaire visuel',
  rawEditor: 'Éditeur brut',

  // Banners
  unpushedChangesBanner: (n: number) =>
    `Vous avez ${n} modification${n === 1 ? '' : 's'} non publiée${n === 1 ? '' : 's'} dans ce dépôt.`,
  unpushedShort: (n: number) => `${n} non publié${n === 1 ? '' : 's'}`,
  offlineBanner: 'Ce dépôt n\'est pas connecté à Git. Les modifications sont stockées localement uniquement.',

  // Validation
  fieldRequired: 'Ce champ est obligatoire.',
  idPatternError: 'Utilisez des lettres minuscules, des chiffres, des tirets et des underscores (3–64 caractères).',
  idAlreadyUsed: 'Cet identifiant est déjà utilisé dans ce dépôt.',
  brokenReference: (id: string) => `Artefact introuvable dans ce dépôt : ${id}`,
  noArtefactsOfKind: (kind: string) => `Aucun ${kind} dans ce dépôt pour l'instant.`,
  createOne: 'Créer',
  shortcutsTitle: 'Raccourcis clavier',

  // Artefact sections
  sectionIdentification: 'Identification',
  sectionConsumerUI: 'Interface utilisateur',
  sectionModelConfig: 'Configuration du modèle',
  sectionBehaviour: 'Comportement',
  sectionInputOutput: 'Entrée / Sortie',
  sectionTools: 'Outils',
  sectionGuardrails: 'Garde-fous',
  sectionKnowledgeBases: 'Bases de connaissances',
  sectionIAMRole: 'Rôle IAM',
  sectionMemoryCollection: 'Collection mémoire',
  sectionOrchestration: 'Orchestration',
  sectionArtifactsPolicies: 'Artefacts et politiques',
  sectionMetadata: 'Métadonnées',

  // Toasts
  toastPublishSuccess: 'Modifications publiées avec succès',
  toastSyncComplete: (n: number) =>
    `Synchronisation du dépôt terminée. ${n} nouvel${n === 1 ? '' : 's'} artefact${n === 1 ? '' : 's'} trouvé${n === 1 ? '' : 's'}.`,
  toastValidationWarnings: (n: number) =>
    `${n} fichier${n === 1 ? '' : 's'} ${n === 1 ? 'a' : 'ont'} des avertissements de validation.`,
  toastPushFailed: 'Échec de la publication. Vérifiez votre connexion et réessayez.',
  toastRepoConnected: (name: string, counts: string) => `${name} connecté. ${counts}`,
  toastRepoCopied: (id: string, target: string) => `${id} copié vers ${target}.`,
  toastArtefactDeleted: (id: string) =>
    `${id} supprimé (en attente — sera retiré lors de la prochaine publication).`,
  toastArtefactSaved: (id: string) => `${id} enregistré localement.`,

  // History tab
  historyNotAvailableLocal: 'L\'historique des commits n\'est pas disponible pour les dépôts locaux uniquement.',
  noHistory: 'Aucun historique de commit trouvé.',
  commitHistory: 'Historique des commits pour ce fichier.',

  // Search modal
  searchModalPlaceholder: 'Rechercher des artefacts… (nom, identifiant, tag, responsable)',
  searchModalNoResults: 'Aucun artefact trouvé.',
  searchModalKindFilter: 'Filtrer par type',

  // Push panel (diff / discard)
  discardChange: 'Annuler la modification',
  diffView: 'Prévisualiser les modifications',
  diffViewClose: 'Fermer la prévisualisation',
  diffPreviousLabel: 'Avant',
  diffNextLabel: 'Après',
  pushingChanges: 'Publication…',
  pushLocalNote: 'Ce dépôt est local uniquement. Connectez-le à GitHub ou Bitbucket pour publier les modifications.',
  noChangesTitle: 'Rien à publier',
  noChangesBody: 'Effectuez d\'abord des modifications.',

  // Errors
  errorLoadPRs: 'Impossible de charger les pull requests depuis GitHub. Ce problème est peut-être temporaire.',
  errorGeneric: 'Une erreur s\'est produite. Veuillez réessayer.',
};

export default fr;
