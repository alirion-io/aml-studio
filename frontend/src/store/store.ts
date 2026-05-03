/**
 * AML Studio — Application State Store (Zustand)
 * Central state management for repositories, artefacts, UI state, and user preferences.
 * Persists repositories and preferences to IndexedDB (via idb-keyval).
 * Falls back to an in-memory store if IndexedDB is unavailable (e.g. storage blocked).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type {
  Repository,
  Artefact,
  ArtefactKind,
  StagedChange,
} from '../types/artefact';
import type { Translations } from '../i18n';
import { buildTranslations, resolveLocale } from '../i18n';
import { buildArtefact } from '../utils/amlParser';
import { validateArtefact } from '../utils/validation';

export type ThemeMode = 'system' | 'light' | 'dark';
export type EditorMode = 'form' | 'raw';
export type MarkdownStyle = 'wysiwyg' | 'code-preview';

interface UserPreferences {
  locale: string;
  themeMode: ThemeMode;
  defaultEditorMode: EditorMode;
  markdownEditorStyle: MarkdownStyle;
}

interface AppState {
  // ─── Repositories
  repositories: Repository[];
  activeRepoId: string | null;

  // ─── UI
  preferences: UserPreferences;
  translations: Translations;
  isPushPanelOpen: boolean;
  isSearchOpen: boolean;
  toasts: Toast[];

  // ─── Actions: Repositories
  addRepository: (repo: Repository) => void;
  updateRepository: (id: string, partial: Partial<Repository>) => void;
  removeRepository: (id: string) => void;
  setActiveRepo: (id: string | null) => void;
  getActiveRepo: () => Repository | undefined;

  // ─── Actions: Artefacts
  loadArtefactsFromFiles: (repoId: string, files: { path: string; content: string }[]) => void;
  saveArtefactLocally: (repoId: string, artefactId: string, rawContent: string, kind: ArtefactKind, filePath: string) => void;
  deleteArtefactLocally: (repoId: string, artefactId: string) => void;
  clearStagedChanges: (repoId: string) => void;

  // ─── Actions: UI
  setLocale: (locale: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDefaultEditorMode: (mode: EditorMode) => void;
  setMarkdownEditorStyle: (style: MarkdownStyle) => void;
  openPushPanel: () => void;
  closePushPanel: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  /** If true, the toast will not auto-dismiss. The user must close it manually. */
  persistent?: boolean;
}

// Locale is persisted in IndexedDB; use browser language as the initial default
// before hydration completes (onRehydrateStorage will override it).
const initialLocale = resolveLocale(
  typeof navigator !== 'undefined' ? navigator.language : undefined
);

// ─── IndexedDB storage adapter for Zustand persist ───────────────────────────
// Falls back to an in-memory map if IndexedDB is blocked (Tracking Prevention).
const _memFallback = new Map<string, string>();
let _idbUnavailable = false;
let _idbWarningFired = false;

/** Fire a persistent toast warning that IndexedDB is unavailable. */
const _fireIdbWarning = () => {
  if (_idbWarningFired) return;
  _idbWarningFired = true;
  // useStore may not be initialised yet (e.g. failure on the very first getItem).
  // onRehydrateStorage will also call this after the store is ready, so we guard
  // with the flag above to ensure the toast is only shown once.
  try {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    useStore.getState().addToast({
      type: 'warning',
      message:
        'IndexedDB is unavailable (storage blocked by browser). ' +
        'All data is kept in memory only — every page refresh will erase your work.',
      persistent: true,
    });
  } catch {
    // store not yet initialised; onRehydrateStorage will retry
  }
};

const idbStorage = createJSONStorage(() => ({
  async getItem(name: string): Promise<string | null> {
    try {
      const v = await idbGet<string>(name);
      return v ?? null;
    } catch {
      _idbUnavailable = true;
      return _memFallback.get(name) ?? null;
    }
  },
  async setItem(name: string, value: string): Promise<void> {
    try {
      await idbSet(name, value);
    } catch {
      _idbUnavailable = true;
      _memFallback.set(name, value);
      _fireIdbWarning();
    }
  },
  async removeItem(name: string): Promise<void> {
    try {
      await idbDel(name);
    } catch {
      _idbUnavailable = true;
      _memFallback.delete(name);
    }
  },
}));

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      repositories: [],
      activeRepoId: null,
      isPushPanelOpen: false,
      isSearchOpen: false,
      toasts: [],

      preferences: {
        locale: initialLocale,
        themeMode: 'system',
        defaultEditorMode: 'form',
        markdownEditorStyle: 'wysiwyg',
      },

      translations: buildTranslations(initialLocale),

      // ─── Repository Actions
      addRepository: (repo) =>
        set((s) => ({ repositories: [...s.repositories, repo] })),

      updateRepository: (id, partial) =>
        set((s) => ({
          repositories: s.repositories.map((r) => (r.id === id ? { ...r, ...partial } : r)),
        })),

      removeRepository: (id) =>
        set((s) => ({
          repositories: s.repositories.filter((r) => r.id !== id),
          activeRepoId: s.activeRepoId === id ? null : s.activeRepoId,
        })),

      setActiveRepo: (id) => {
        set({ activeRepoId: id });
      },

      getActiveRepo: () => {
        const { repositories, activeRepoId } = get();
        return repositories.find((r) => r.id === activeRepoId);
      },

      // ─── Artefact Actions
      loadArtefactsFromFiles: (repoId, files) => {
        const artefacts: Artefact[] = [];
        for (const f of files) {
          const a = buildArtefact(f.path, f.content);
          if (a) {
            const issues = validateArtefact(a.kind, a.frontMatter);
            artefacts.push({ ...a, validationErrors: issues });
          }
        }
        set((s) => {
          const repo = s.repositories.find((r) => r.id === repoId);
          // Re-inject staged artefacts that exist only locally (not yet committed to disk).
          // Without this, reloading the folder wipes any artefact created in the app
          // but not yet pushed, because those files don't exist on disk yet.
          if (repo) {
            const loadedIds = new Set(artefacts.map((a) => a.id));
            for (const change of repo.stagedChanges) {
              if (change.changeType !== 'deleted' && !loadedIds.has(change.artefactId) && change.newContent) {
                const a = buildArtefact(change.filePath, change.newContent);
                if (a) {
                  const issues = validateArtefact(a.kind, a.frontMatter);
                  artefacts.push({ ...a, isDirty: true, validationErrors: issues });
                }
              }
            }
          }
          return {
            repositories: s.repositories.map((r) =>
              r.id === repoId ? { ...r, artefacts } : r
            ),
          };
        });
      },

      saveArtefactLocally: (repoId, artefactId, rawContent, kind, filePath) => {
        const a = buildArtefact(filePath, rawContent);
        if (!a) return;
        const issues = validateArtefact(kind, a.frontMatter);
        const artefact: Artefact = { ...a, isDirty: true, validationErrors: issues };

        // Use the parsed artefact's ID for the staged change — this is the new ID
        // after a potential rename, not the original lookup ID.
        const newId = a.id;
        const change: StagedChange = {
          artefactId: newId,
          filePath,
          kind,
          changeType: 'modified',
          newContent: rawContent,
        };

        set((s) => {
          const repo = s.repositories.find((r) => r.id === repoId);
          if (!repo) return s;

          // Find by original ID (artefactId param) to support renames.
          const existingIdx = repo.artefacts.findIndex((x) => x.id === artefactId);
          const newArtefacts = existingIdx >= 0
            ? repo.artefacts.map((x, i) => (i === existingIdx ? artefact : x))
            : [...repo.artefacts, artefact];

          // Remove any staged change filed under the old OR new ID, then add the fresh one.
          const filteredChanges = repo.stagedChanges.filter(
            (c) => c.artefactId !== artefactId && c.artefactId !== newId
          );
          const newChanges = [...filteredChanges, change];

          return {
            repositories: s.repositories.map((r) =>
              r.id === repoId
                ? { ...r, artefacts: newArtefacts, stagedChanges: newChanges, syncStatus: 'ahead' as const }
                : r
            ),
          };
        });
      },

      deleteArtefactLocally: (repoId, artefactId) => {
        set((s) => {
          const repo = s.repositories.find((r) => r.id === repoId);
          if (!repo) return s;
          const artefact = repo.artefacts.find((a) => a.id === artefactId);
          if (!artefact) return s;

          const change: StagedChange = {
            artefactId,
            filePath: artefact.filePath,
            kind: artefact.kind,
            changeType: 'deleted',
          };

          const newChanges = [
            ...repo.stagedChanges.filter((c) => c.artefactId !== artefactId),
            change,
          ];

          return {
            repositories: s.repositories.map((r) =>
              r.id === repoId
                ? {
                    ...r,
                    artefacts: r.artefacts.filter((a) => a.id !== artefactId),
                    stagedChanges: newChanges,
                    syncStatus: 'ahead' as const,
                  }
                : r
            ),
          };
        });
      },

      clearStagedChanges: (repoId) => {
        set((s) => ({
          repositories: s.repositories.map((r) =>
            r.id === repoId
              ? { ...r, stagedChanges: [], artefacts: r.artefacts.map((a) => ({ ...a, isDirty: false })), syncStatus: 'up-to-date' as const }
              : r
          ),
        }));
      },

      // ─── UI Actions
      setLocale: (locale) => {
        const translations = buildTranslations(locale);
        set((s) => ({
          preferences: { ...s.preferences, locale },
          translations,
        }));
      },

      setThemeMode: (themeMode) =>
        set((s) => ({ preferences: { ...s.preferences, themeMode } })),

      setDefaultEditorMode: (defaultEditorMode) =>
        set((s) => ({ preferences: { ...s.preferences, defaultEditorMode } })),

      setMarkdownEditorStyle: (markdownEditorStyle) =>
        set((s) => ({ preferences: { ...s.preferences, markdownEditorStyle } })),

      openPushPanel: () => set({ isPushPanelOpen: true }),
      closePushPanel: () => set({ isPushPanelOpen: false }),
      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false }),

      addToast: (toast) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        if (!toast.persistent) {
          setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
          }, 4000);
        }
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'aml-studio-state',
      storage: idbStorage,
      partialize: (state) => ({
        repositories: state.repositories,
        activeRepoId: state.activeRepoId,
        preferences: state.preferences,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.translations = buildTranslations(state.preferences.locale);
          // If IndexedDB failed during getItem (before the store was ready),
          // the flag is already set — fire the warning now that the store is live.
          if (_idbUnavailable) {
            _fireIdbWarning();
          }
        }
      },
    }
  )
);

/** Convenience hook for translations */
export function useT() {
  return useStore((s) => s.translations);
}
