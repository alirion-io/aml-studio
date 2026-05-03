/**
 * AML Studio — Artefact Edit Page
 * Full-width edit experience with no list panel — invoked from the Edit
 * button on ArtefactDetailPage or via "new" routes.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  useTheme,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CodeIcon from '@mui/icons-material/Code';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, useT } from '../store/store';
import type { ArtefactKind } from '../types/artefact';
import { KIND_PLURAL_LABELS, KIND_URL_SEGMENTS } from '../types/artefact';
import { ArtefactEditTab } from '../components/artefact/ArtefactEditTab';
import type { ArtefactEditTabHandle, ToolbarState } from '../components/artefact/ArtefactEditTab';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

interface Props {
  kind: ArtefactKind;
}

export const ArtefactEditPage: React.FC<Props> = ({ kind }) => {
  const theme = useTheme();
  const { repoId, artefactId } = useParams<{ repoId: string; artefactId: string }>();
  const navigate = useNavigate();
  const t = useT();

  const repositories = useStore((s) => s.repositories);
  const repo = repositories.find((r) => r.id === repoId);

  const deleteArtefactLocally = useStore((s) => s.deleteArtefactLocally);
  const addToast = useStore((s) => s.addToast);

  const isNew = !artefactId || artefactId === 'new';
  const artefact = isNew ? null : (repo?.artefacts.find((a) => a.id === artefactId && a.kind === kind) ?? null);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const urlSegment = KIND_URL_SEGMENTS[kind];
  const kindLabel = KIND_PLURAL_LABELS[kind];
  const kindSingular = kindLabel.slice(0, -1);

  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    mode: 'form', isDirty: false, isSaving: false, savedFeedback: false,
  });
  const editTabRef = useRef<ArtefactEditTabHandle>(null);
  const handleToolbarStateChange = useCallback((s: ToolbarState) => setToolbarState(s), []);


  if (!repo) return null;

  const handleDelete = () => {
    if (!repoId || !artefact) return;
    deleteArtefactLocally(repoId, artefact.id);
    addToast({ type: 'info', message: t.toastArtefactDeleted(artefact.id) });
    navigate(`/${repoId}/${urlSegment}`);
  };

  const editToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ToggleButtonGroup
        value={toolbarState.mode}
        exclusive
        onChange={(_, v) => v && editTabRef.current?.switchMode(v)}
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
        variant="text"
        size="small"
        onClick={() => {
          editTabRef.current?.discard();
          isNew ? navigate(`/${repoId}/${urlSegment}`) : navigate(`/${repoId}/${urlSegment}/${artefactId}`);
        }}
        sx={{ color: 'text.secondary' }}
      >
        {t.cancel}
      </Button>
      <Button
        variant="contained"
        size="small"
        onClick={() => editTabRef.current?.save()}
        disabled={!toolbarState.isDirty || toolbarState.isSaving}
      >
        {toolbarState.isSaving
          ? <CircularProgress size={14} color="inherit" />
          : toolbarState.savedFeedback ? t.savedSuccess : t.save}
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: 4 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h1" sx={{ fontWeight: 300 }}>
          {isNew ? `New ${kindSingular}` : (artefact?.displayName || artefact?.id || artefactId)}
        </Typography>
        {editToolbar}
      </Box>

      {/* Edit form */}
      <ArtefactEditTab
        ref={editTabRef}
        kind={kind}
        repoId={repoId!}
        artefact={artefact}
        onSaved={(id) => navigate(`/${repoId}/${urlSegment}/${id}`)}
        onToolbarStateChange={handleToolbarStateChange}
      />

      {/* Delete zone — only for existing artefacts */}
      {!isNew && artefact && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Box
            sx={{
              border: `1px solid ${theme.palette.error.main}33`,
              borderRadius: '6px',
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: theme.palette.error.main }}>
                Delete this artefact
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                This marks the artefact for deletion. Changes are staged and only applied when you push.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setDeleteOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={artefact ? t.deleteArtefactTitle(artefact.id) : ''}
        description={artefact ? t.deleteArtefactBody(artefact.id) : ''}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Box>
  );
};
