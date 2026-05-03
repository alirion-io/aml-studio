/**
 * AML Studio — MUI Theme
 * Builds on MUI's theming system using the Alirion design tokens.
 * MIT-licensed MUI components (https://github.com/mui/material-ui).
 *
 * Credits:
 *   - Material UI (MUI) — https://github.com/mui/material-ui — MIT License
 *   - Sora font — Google Fonts — OFL License
 *   - JetBrains Mono — JetBrains — OFL License
 *   - Heroicons — Tailwind Labs — MIT License
 *   - Monaco Editor — Microsoft — MIT License
 *   - Cytoscape.js — The Cytoscape Consortium — MIT License
 *   - js-yaml — Vitaly Puzrin — MIT License
 *   - Ajv — Evgeny Poberezkin — MIT License
 *   - JSZip — Stuart Knightley — MIT License
 *   - react-router-dom — Remix Software — MIT License
 *   - Zustand — Paul Henschel — MIT License
 */

import { createTheme } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { brandPalette, kindChipColors, kindColors, radius, semanticTokens, typography } from './tokens';

export function buildTheme(mode: PaletteMode) {
  const tokens = mode === 'dark' ? semanticTokens.dark : semanticTokens.light;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.accent,
        light: tokens.accentHover,
        dark: brandPalette.depth,
      },
      secondary: {
        main: brandPalette.emergence,
      },
      success: {
        main: tokens.success,
      },
      warning: {
        main: tokens.warning,
      },
      error: {
        main: tokens.error,
      },
      info: {
        main: tokens.info,
      },
      background: {
        default: tokens.surfaceBase,
        paper: tokens.surfaceElevated,
      },
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary,
        disabled: tokens.textDisabled,
      },
      divider: tokens.borderDefault,
    },
    typography: {
      fontFamily: typography.fontFamily,
      h1: {
        fontFamily: typography.fontFamily,
        fontWeight: typography.heading1.fontWeight,
        fontSize: typography.heading1.fontSize,
        lineHeight: typography.heading1.lineHeight,
        letterSpacing: typography.heading1.letterSpacing,
      },
      h2: {
        fontFamily: typography.fontFamily,
        fontWeight: typography.heading2.fontWeight,
        fontSize: typography.heading2.fontSize,
        lineHeight: typography.heading2.lineHeight,
      },
      h3: {
        fontFamily: typography.fontFamily,
        fontWeight: typography.heading3.fontWeight,
        fontSize: typography.heading3.fontSize,
        lineHeight: typography.heading3.lineHeight,
      },
      body1: {
        fontFamily: typography.fontFamily,
        fontWeight: typography.body.fontWeight,
        fontSize: typography.body.fontSize,
        lineHeight: typography.body.lineHeight,
      },
      body2: {
        fontFamily: typography.fontFamily,
        fontWeight: typography.bodySmall.fontWeight,
        fontSize: typography.bodySmall.fontSize,
        lineHeight: typography.bodySmall.lineHeight,
      },
      caption: {
        fontFamily: typography.fontFamily,
        fontWeight: 400,
        fontSize: '12px',
        lineHeight: '18px',
      },
      overline: {
        fontFamily: typography.fontFamily,
        fontWeight: typography.label.fontWeight,
        fontSize: typography.label.fontSize,
        lineHeight: typography.label.lineHeight,
        letterSpacing: typography.label.letterSpacing,
        textTransform: typography.label.textTransform,
      },
      button: {
        fontFamily: typography.fontFamily,
        fontWeight: 500,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: radius.md,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: '36px',
            borderRadius: radius.md,
            padding: '6px 14px',
            textTransform: 'none',
            fontFamily: typography.fontFamily,
            fontWeight: 500,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: radius.pill,
            fontFamily: typography.fontFamily,
            fontSize: '12px',
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: mode === 'light' ? 'none' : `1px solid ${tokens.borderDefault}`,
            boxShadow: mode === 'light'
              ? '0 1px 3px rgba(26,107,138,0.10), 0 3px 10px rgba(26,107,138,0.07)'
              : 'none',
            borderRadius: radius.md,
            backgroundColor: tokens.surfaceElevated,
            transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            maxWidth: '320px',
            fontFamily: typography.fontFamily,
            fontSize: '12px',
          },
        },
        defaultProps: {
          enterDelay: 300,
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: tokens.surfaceElevated,
            borderBottom: `1px solid ${tokens.borderDefault}`,
            color: tokens.textPrimary,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.surfaceElevated,
            borderRight: `1px solid ${tokens.borderDefault}`,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'small',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: tokens.surfaceBase,
          },
        },
      },
      MuiSelect: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: radius.lg,
          },
        },
      },
    },
    // Expose brand colors as custom vars
    cssVariables: false,
  });
}

export { kindChipColors, kindColors, brandPalette, semanticTokens, radius };
