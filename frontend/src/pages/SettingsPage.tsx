/**
 * AML Studio — Settings Page (P-13)
 * Repository settings + user preferences (editor, theme, language).
 */

import React from 'react';
import {
  Box,
  Typography,
  Switch,
  Select,
  MenuItem,
  FormControl,
  Divider,
  Chip,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { get as idbGet } from 'idb-keyval';
import { useParams } from 'react-router-dom';
import { useStore, useT } from '../store/store';
import type { ThemeMode, EditorMode, MarkdownStyle } from '../store/store';
import { getAvailableLocales } from '../i18n';
import config from '../config/config';

export const SettingsPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const t = useT();

  const repositories = useStore((s) => s.repositories);
  const preferences = useStore((s) => s.preferences);
  const updateRepository = useStore((s) => s.updateRepository);
  const setThemeMode = useStore((s) => s.setThemeMode);
  const setDefaultEditorMode = useStore((s) => s.setDefaultEditorMode);
  const setMarkdownEditorStyle = useStore((s) => s.setMarkdownEditorStyle);
  const setLocale = useStore((s) => s.setLocale);

  const repo = repositories.find((r) => r.id === repoId);
  const locales = getAvailableLocales();

  const handleExportIdb = async () => {
    const confirmed = window.confirm(
      'This will export all app state including artefact content to a JSON file. Continue?'
    );
    if (!confirmed) return;
    const raw = await idbGet<string>('aml-studio-state');
    const data = raw ? JSON.parse(raw) : { error: 'No data found in IndexedDB' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aml-studio-state-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sectionHeader = (title: string) => (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        mb: 2,
        mt: 3,
        fontWeight: 400,
        fontSize: '11px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {title}
    </Typography>
  );

  const row = (label: string, description: string | undefined, control: React.ReactNode) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box sx={{ flex: 1, pr: 4 }}>
        <Typography variant="body2">{label}</Typography>
        {description && (
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{control}</Box>
    </Box>
  );

  return (
    <Box sx={{ p: 4, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h1" sx={{ fontWeight: 300, mb: 0.5 }}>{t.settingsTitle}</Typography>
      <Typography variant="body2" color="text.secondary">
        {repo ? repo.name : t.appliesToAll}
      </Typography>

      {/* Repository settings */}
      {repo && (
        <>
          {sectionHeader(t.repositorySettings)}

          {row(
            t.reviewWorkflow,
            t.reviewWorkflowDescription,
            <Switch
              checked={repo.reviewWorkflowEnabled}
              onChange={(e) =>
                updateRepository(repo.id, { reviewWorkflowEnabled: e.target.checked })
              }
              size="small"
            />
          )}

          {row(
            t.amlSchemaVersion,
            t.currentlyBundled(config.amlSchemaVersion),
            <Chip label={config.amlSchemaVersion} size="small" />
          )}

          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* User preferences */}
      {sectionHeader(t.userPreferences)}

      {row(
        t.defaultEditorMode,
        undefined,
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={preferences.defaultEditorMode}
            onChange={(e) => setDefaultEditorMode(e.target.value as EditorMode)}
          >
            <MenuItem value="form">{t.visualForm}</MenuItem>
            <MenuItem value="raw">{t.rawEditor}</MenuItem>
          </Select>
        </FormControl>
      )}

      {row(
        t.markdownEditorStyle,
        undefined,
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={preferences.markdownEditorStyle}
            onChange={(e) => setMarkdownEditorStyle(e.target.value as MarkdownStyle)}
          >
            <MenuItem value="wysiwyg">{t.wysiwyg}</MenuItem>
            <MenuItem value="code-preview">{t.codeAndPreview}</MenuItem>
          </Select>
        </FormControl>
      )}

      {row(
        t.colourTheme,
        undefined,
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={preferences.themeMode}
            onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
          >
            <MenuItem value="system">{t.systemDefault}</MenuItem>
            <MenuItem value="light">{t.light}</MenuItem>
            <MenuItem value="dark">{t.dark}</MenuItem>
          </Select>
        </FormControl>
      )}

      {row(
        t.language,
        undefined,
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={preferences.locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            {locales.map((l) => (
              <MenuItem key={l.locale} value={l.locale}>{l.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Divider sx={{ my: 3 }} />

      {sectionHeader(t.diagnostics)}
      {row(
        t.exportAppState,
        t.exportAppStateDescription,
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon fontSize="small" />}
          onClick={handleExportIdb}
        >
          {t.exportLabel}
        </Button>
      )}
    </Box>
  );
};
