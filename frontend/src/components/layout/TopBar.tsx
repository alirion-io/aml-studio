/**
 * AML Studio — Global Top Bar
 * The persistent top bar per design system §4.1.
 *
 * UX upgrades over the previous version:
 *   • Repo chip is now a switcher (click → menu of repositories) so users
 *     don't have to round-trip through the dashboard to switch.
 *   • Theme toggle uses an explicit menu (Light / Dark / System) rather than
 *     a 3-state cycler with hidden affordance.
 *   • A "?" shortcut + an inline icon opens the keyboard-shortcuts cheatsheet.
 */

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  ThemeProvider,
} from '@mui/material';
import { buildTheme } from '../../theme/theme';

const darkChrome = buildTheme('dark');
import { useNavigate, useParams } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useStore, useT } from '../../store/store';
import { SearchModal } from '../search/SearchModal';
import { ProviderIcon } from '../shared/ProviderIcon';
import { ShortcutsModal } from '../shared/ShortcutsModal';

const TopBarInner: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { repoId } = useParams<{ repoId?: string }>();
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [repoMenuAnchor, setRepoMenuAnchor] = useState<HTMLElement | null>(null);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<HTMLElement | null>(null);

  const repositories = useStore((s) => s.repositories);
  const activeRepo = repositories.find((r) => r.id === repoId);
  const stagedCount = activeRepo?.stagedChanges?.length ?? 0;
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const openPushPanel = useStore((s) => s.openPushPanel);
  const themeMode = useStore((s) => s.preferences.themeMode);
  const setThemeMode = useStore((s) => s.setThemeMode);

  const ThemeIcon = themeMode === 'light' ? LightModeIcon : themeMode === 'dark' ? DarkModeIcon : SettingsBrightnessIcon;
  const themeLabel = themeMode === 'light' ? t.light : themeMode === 'dark' ? t.dark : t.systemDefault;

  // Bind ? to open the shortcuts modal (when not typing in an input)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isInput && e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isDark = theme.palette.mode === 'dark';
  const logoSrc = isDark ? './alirion-icon-transparent-dark.svg' : './alirion-icon-transparent-light.svg';

  const handleSwitchRepo = (id: string) => {
    setRepoMenuAnchor(null);
    setActiveRepo(id);
    navigate(`/${id}/overview`);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          height: 56,
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important', px: 2, gap: 1.5 }}>
          {/* Logo */}
          <Box
            component="img"
            src={logoSrc}
            alt="AML Studio"
            sx={{ height: 40, width: 'auto', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => navigate('/')}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <Typography
            variant="h3"
            onClick={() => navigate('/')}
            sx={{
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '15px',
              letterSpacing: '0.01em',
              color: theme.palette.primary.main,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {t.appName}
          </Typography>

          {/* Repository switcher */}
          {activeRepo && (
            <>
              <Box sx={{ color: theme.palette.text.disabled, fontSize: 14, mx: 0.5 }}>/</Box>
              <Tooltip title={t.switchRepository ?? 'Switch repository'}>
                <Chip
                  icon={<Box sx={{ display: 'inline-flex', color: theme.palette.primary.main, ml: 0.5 }}><ProviderIcon provider={activeRepo.provider} size={14} /></Box>}
                  deleteIcon={<ExpandMoreIcon />}
                  onDelete={(e) => setRepoMenuAnchor(e.currentTarget as HTMLElement)}
                  onClick={(e) => setRepoMenuAnchor(e.currentTarget as HTMLElement)}
                  label={activeRepo.fullName ?? activeRepo.name}
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.primary.main + '14',
                    color: theme.palette.primary.main,
                    borderRadius: '999px',
                    fontSize: '12px',
                    maxWidth: 240,
                    cursor: 'pointer',
                    '& .MuiChip-deleteIcon': {
                      color: theme.palette.primary.main,
                      fontSize: 16,
                      '&:hover': { color: theme.palette.primary.main },
                    },
                    '& .MuiChip-icon': { color: theme.palette.primary.main },
                  }}
                />
              </Tooltip>
              <Menu
                anchorEl={repoMenuAnchor}
                open={Boolean(repoMenuAnchor)}
                onClose={() => setRepoMenuAnchor(null)}
                slotProps={{ paper: { sx: { minWidth: 240, mt: 0.5 } } }}
              >
                {repositories.map((r) => (
                  <MenuItem
                    key={r.id}
                    selected={r.id === repoId}
                    onClick={() => handleSwitchRepo(r.id)}
                  >
                    <ListItemIcon sx={{ minWidth: 28, color: theme.palette.text.secondary }}>
                      <ProviderIcon provider={r.provider} size={16} />
                    </ListItemIcon>
                    <ListItemText
                      primary={r.name}
                      secondary={r.fullName !== r.name ? r.fullName : undefined}
                      slotProps={{
                        primary: { sx: { fontSize: '13px' } },
                        secondary: { sx: { fontSize: '11px', color: theme.palette.text.secondary } },
                      }}
                    />
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem onClick={() => { setRepoMenuAnchor(null); navigate('/'); }}>
                  <ListItemText primary={t.allRepositories} slotProps={{ primary: { sx: { fontSize: '12px', color: theme.palette.text.secondary } } }} />
                </MenuItem>
              </Menu>

              {/* Not connected to Git indicator */}
              {activeRepo?.isLocal && (
                <Tooltip title={t.offlineBanner}>
                  <Chip
                    icon={<CloudOffIcon sx={{ fontSize: '13px !important' }} />}
                    label="Local only"
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.warning.main + '1A',
                      color: theme.palette.warning.main,
                      borderRadius: '999px',
                      fontSize: '11px',
                      '& .MuiChip-icon': { color: theme.palette.warning.main },
                    }}
                  />
                </Tooltip>
              )}
            </>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Search */}
          {activeRepo && (
            <Tooltip title={`${t.search} (⌘K)`}>
              <IconButton
                size="small"
                onClick={() => setSearchOpen(true)}
                sx={{ color: theme.palette.text.secondary, p: 1 }}
                aria-label={t.search}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Keyboard shortcuts */}
          <Tooltip title={`${t.shortcutsTitle ?? 'Keyboard shortcuts'} (?)`}>
            <IconButton
              size="small"
              onClick={() => setShortcutsOpen(true)}
              sx={{ color: theme.palette.text.secondary, p: 1 }}
              aria-label={t.shortcutsTitle ?? 'Keyboard shortcuts'}
            >
              <KeyboardIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip title={`${t.colourTheme}: ${themeLabel}`}>
            <IconButton
              size="small"
              onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
              sx={{ color: theme.palette.text.secondary, p: 1 }}
              aria-label={t.colourTheme}
            >
              <ThemeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={themeMenuAnchor}
            open={Boolean(themeMenuAnchor)}
            onClose={() => setThemeMenuAnchor(null)}
            slotProps={{ paper: { sx: { minWidth: 180 } } }}
          >
            <MenuItem
              selected={themeMode === 'light'}
              onClick={() => { setThemeMode('light'); setThemeMenuAnchor(null); }}
            >
              <ListItemIcon><LightModeIcon fontSize="small" /></ListItemIcon>
              <ListItemText>{t.light}</ListItemText>
            </MenuItem>
            <MenuItem
              selected={themeMode === 'dark'}
              onClick={() => { setThemeMode('dark'); setThemeMenuAnchor(null); }}
            >
              <ListItemIcon><DarkModeIcon fontSize="small" /></ListItemIcon>
              <ListItemText>{t.dark}</ListItemText>
            </MenuItem>
            <MenuItem
              selected={themeMode === 'system'}
              onClick={() => { setThemeMode('system'); setThemeMenuAnchor(null); }}
            >
              <ListItemIcon><SettingsBrightnessIcon fontSize="small" /></ListItemIcon>
              <ListItemText>{t.systemDefault}</ListItemText>
            </MenuItem>
          </Menu>

          {/* Unpushed changes pill */}
          {activeRepo && stagedCount > 0 && (
            <Chip
              icon={<ArrowUpwardIcon sx={{ fontSize: 13 }} />}
              label={t.unpushedShort?.(stagedCount) ?? `${stagedCount} unpushed`}
              size="small"
              onClick={openPushPanel}
              sx={{
                backgroundColor: theme.palette.info.main + '1A',
                color: theme.palette.info.main,
                borderRadius: '999px',
                fontSize: '11px',
                cursor: 'pointer',
                '& .MuiChip-icon': { color: theme.palette.info.main },
              }}
            />
          )}
        </Toolbar>
      </AppBar>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} repoId={repoId} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
};

export const TopBar: React.FC = () => (
  <ThemeProvider theme={darkChrome}>
    <TopBarInner />
  </ThemeProvider>
);
