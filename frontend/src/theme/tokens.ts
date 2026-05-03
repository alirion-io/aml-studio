/**
 * AML Studio — Design Tokens
 * Derived from the Alirion brand palette as defined in 00-design-system.md
 * These tokens are the canonical source of truth for all colour decisions.
 */

export const brandPalette = {
  deepCurrent: '#1a6b8a',
  flowGreen: '#3d9b7a',
  surfaceLight: '#4ab8d8',
  mist: '#e8f4f8',
  depth: '#0e1a1f',
  emergence: '#7c6bb0',
} as const;

export const semanticTokens = {
  light: {
    surfaceBase: '#FFFFFF',
    surfaceElevated: '#F9F9F9',
    surfaceSunken: '#FCFCFC',
    borderDefault: '#E8E8E8',
    textPrimary: '#0e1a1f',
    textSecondary: '#2d5a6e',
    // #4f7278 — 5.25:1 on #FFFFFF (WCAG AA)
    textDisabled: '#4f7278',
    accent: '#1a6b8a',
    accentHover: '#155a75',
    success: '#2f8a6c',
    warning: '#a86a00',
    error: '#b53224',
    info: '#1a6b8a',
    review: '#6f5da3',
  },
  dark: {
    surfaceBase: '#0b161a',
    surfaceElevated: '#152830',
    surfaceSunken: '#081115',
    borderDefault: '#23404e',
    textPrimary: '#f0f8fb',
    textSecondary: '#9bcad9',
    // #6a9aad — 5.99:1 on #0b161a (WCAG AA)
    textDisabled: '#6a9aad',
    accent: '#4ab8d8',
    accentHover: '#6dcce6',
    success: '#5bbf9a',
    warning: '#e6ac3d',
    error: '#e57373',
    info: '#4ab8d8',
    // #b0a2d4 — 4.62:1 on dark chip bg (WCAG AA); was #a395cc (4.28:1, failed)
    review: '#b0a2d4',
  },
} as const;

export const kindColors = {
  agent: '#1a6b8a',
  tool: '#3d9b7a',
  kb: '#0e7490',
  iam: '#b45309',
  model: '#7c6bb0',
  collection: '#0a5a6b',
  guardrail: '#c0392b',
} as const;

/**
 * Accessible chip text colours for each artefact kind.
 * The ${color}1A pattern (10 % opacity tint on the theme surface) is used as
 * chip background; these values are chosen so that text on that tint meets
 * WCAG AA (≥ 4.5:1) in both light and dark modes.
 *
 * Light: dark shades (text on near-white tinted bg).
 * Dark:  light shades (text on near-dark tinted bg).
 */
export const kindChipColors = {
  light: {
    agent:      '#1a6b8a', // 5.44:1
    tool:       '#237055', // 5.47:1
    kb:         '#0e7490', // 4.95:1
    iam:        '#b45309', // 4.56:1
    model:      '#614d98', // 6.36:1
    collection: '#0a5a6b', // 7.10:1
    guardrail:  '#c0392b', // 5.00:1
  },
  dark: {
    agent:      '#4ab8d8', // 4.72:1
    tool:       '#67c4a0', // 4.92:1
    kb:         '#3fbfd8', // 4.83:1
    iam:        '#e09830', // 4.57:1
    model:      '#b4a5e0', // 4.77:1
    collection: '#50c0d8', // 4.89:1
    guardrail:  '#f08878', // 4.53:1
  },
} as const;

// Typography ramp: hierarchy is established by both size *and* weight rather
// than size alone. h1 (the page heading) stays light to preserve the brand
// feel, but h2 and h3 step up so sectioning reads at a glance, and body sits
// at 400 to remove the "ghostly" cast caused by 300 at small sizes.
export const typography = {
  fontFamily: '"Sora", "Helvetica Neue", Arial, sans-serif',
  fontFamilyCode: '"JetBrains Mono", "Fira Code", monospace',
  heading1: { fontWeight: 400, fontSize: '24px', lineHeight: '30px', letterSpacing: '-0.01em' },
  heading2: { fontWeight: 500, fontSize: '18px', lineHeight: '24px' },
  heading3: { fontWeight: 500, fontSize: '14px', lineHeight: '21px' },
  body: { fontWeight: 400, fontSize: '14px', lineHeight: '21px' },
  bodySmall: { fontWeight: 400, fontSize: '12px', lineHeight: '18px' },
  label: { fontWeight: 500, fontSize: '11px', lineHeight: '16px', letterSpacing: '0.06em', textTransform: 'uppercase' as const },
  code: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontWeight: 400, fontSize: '13px', lineHeight: '20px' },
} as const;

// Three-tier border-radius scale used across the app so chips/inputs/cards/
// modals all share a coherent geometry.
export const radius = {
  sm: 4,   // chips, inputs, small badges
  md: 6,   // cards, buttons, primary surfaces
  lg: 12,  // modals, slide-overs
  pill: 999, // status / kind badges
} as const;
