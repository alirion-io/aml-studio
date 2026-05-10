/**
 * AML Studio — Left Sidebar
 * Repository workspace navigation per design system §4.2.
 * Uses MUI Drawer with persistent variant.
 *
 * IA: section labels are distinct ("Workspace" vs "Artefacts" vs "Version
 * control") so the user can scan vertically. Each artefact entry is paired
 * with its kind colour (dot) so it matches the badge style used everywhere
 * else in the studio.
 */

import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Badge,
  Divider,
  useTheme,
  ThemeProvider,
} from '@mui/material';
import { buildTheme } from '../../theme/theme';

const darkChrome = buildTheme('dark');
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import type { SvgIconComponent } from '@mui/icons-material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useStore, useT } from '../../store/store';
import { useMediaQuery as useMuiMediaQuery } from '@mui/material';
import { ARTEFACT_KINDS, KIND_PLURAL_LABELS, KIND_URL_SEGMENTS } from '../../types/artefact';
import type { ArtefactKind } from '../../types/artefact';
import { kindChipColors } from '../../theme/tokens';
import { KIND_ICONS } from '../shared/kindIcons';

const DRAWER_WIDTH = 220;

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="caption"
      sx={{
        px: 2,
        pt: 1.25,
        pb: 0.5,
        display: 'block',
        color: theme.palette.text.secondary,
        fontWeight: 500,
        fontSize: '11px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  );
};

const SidebarInner: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { repoId } = useParams<{ repoId: string }>();
  const t = useT();
  const repositories = useStore((s) => s.repositories);
  const isMobileSidebarOpen = useStore((s) => s.isMobileSidebarOpen);
  const closeMobileSidebar = useStore((s) => s.closeMobileSidebar);
  const isMobile = useMuiMediaQuery(theme.breakpoints.down('md'));
  const activeRepo = repositories.find((r) => r.id === repoId);

  if (!repoId || !activeRepo) return null;

  const artefactCounts = ARTEFACT_KINDS.reduce(
    (acc, kind) => {
      acc[kind] = activeRepo.artefacts.filter((a) => a.kind === kind).length;
      return acc;
    },
    {} as Record<ArtefactKind, number>
  );

  const openPRCount = 0; // Will be loaded from API when connected
  const stagedCount = activeRepo.stagedChanges?.length ?? 0;

  const isActive = (path: string) =>
    location.pathname === `/${repoId}/${path}` || location.pathname.startsWith(`/${repoId}/${path}`);

  type NavItemOptions = { badge?: number; icon?: SvgIconComponent; iconColor?: string };

  const navItem = (label: string, path: string, opts: NavItemOptions = {}) => {
    const { badge, icon: Icon, iconColor } = opts;
    const active = isActive(path);
    return (
      <ListItemButton
        key={path}
        onClick={() => navigate(`/${repoId}/${path}`)}
        sx={{
          mx: 1,
          pl: 2,
          py: 0.6,
          borderRadius: '6px',
          backgroundColor: active ? `${theme.palette.primary.main}14` : 'transparent',
          '&:hover': { backgroundColor: active ? `${theme.palette.primary.main}1f` : `${theme.palette.primary.main}0A` },
          position: 'relative',
          // active rail — flush against the left edge of the row, doesn't shift content
          '&::before': active
            ? {
                content: '""',
                position: 'absolute',
                left: -8,
                top: 6,
                bottom: 6,
                width: 3,
                borderRadius: 2,
                backgroundColor: theme.palette.primary.main,
              }
            : {},
        }}
      >
        {Icon && (
          <Icon
            sx={{
              fontSize: '16px',
              color: iconColor ?? theme.palette.text.secondary,
              flexShrink: 0,
              mr: 1,
            }}
          />
        )}
        <ListItemText
          primary={label}
          slotProps={{
            primary: {
              sx: {
                fontSize: '13px',
                fontWeight: active ? 500 : 400,
                color: active ? theme.palette.primary.main : theme.palette.text.primary,
              },
            },
          }}
        />
        {badge !== undefined && badge > 0 && (
          <Badge
            badgeContent={badge}
            color="default"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '10px',
                height: '16px',
                minWidth: '16px',
                backgroundColor: theme.palette.action.selected,
                color: theme.palette.text.primary,
              },
            }}
          />
        )}
      </ListItemButton>
    );
  };

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? isMobileSidebarOpen : true}
      onClose={isMobile ? closeMobileSidebar : undefined}
      sx={{
        width: isMobile ? 0 : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: isMobile ? 0 : 56,
          height: isMobile ? '100%' : 'calc(100% - 56px)',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', pt: 1, px: 0 }}>
        {/* Back to repos */}
        <ListItemButton
          onClick={() => navigate('/')}
          sx={{ mx: 1, pl: 1.5, py: 0.5, borderRadius: '6px' }}
        >
          <ChevronLeftIcon sx={{ fontSize: 16, color: theme.palette.text.secondary, mr: 0.5 }} />
          <ListItemText
            primary={t.allRepositories}
            slotProps={{
              primary: {
                sx: {
                  fontSize: '12px',
                  color: theme.palette.text.secondary,
                },
              },
            }}
          />
        </ListItemButton>

        <Divider sx={{ my: 0.5 }} />

        {/* Workspace section */}
        <SectionLabel>{t.workspace ?? t.repository}</SectionLabel>
        <List disablePadding>{navItem(t.overview, 'overview', { badge: stagedCount || undefined })}</List>

        <Divider sx={{ my: 0.5 }} />

        {/* Artefacts section */}
        <SectionLabel>{t.artefacts}</SectionLabel>
        <List disablePadding>
          {ARTEFACT_KINDS.map((kind) =>
            navItem(KIND_PLURAL_LABELS[kind], KIND_URL_SEGMENTS[kind], {
              badge: artefactCounts[kind],
              icon: KIND_ICONS[kind],
              iconColor: kindChipColors[theme.palette.mode as 'light' | 'dark'][kind],
            })
          )}
        </List>

        <Divider sx={{ my: 0.5 }} />

        {/* Version control section */}
        <SectionLabel>{t.versionControl ?? t.repository}</SectionLabel>
        <List disablePadding>
          {navItem(t.pullRequests, 'pull-requests', { badge: openPRCount })}
          {navItem(t.graph, 'graph')}
          {navItem(t.settings, 'settings')}
        </List>
      </Box>
    </Drawer>
  );
};

export const Sidebar: React.FC = () => (
  <ThemeProvider theme={darkChrome}>
    <SidebarInner />
  </ThemeProvider>
);

export { DRAWER_WIDTH };
