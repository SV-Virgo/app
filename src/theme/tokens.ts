// Design tokens ported 1:1 from the Virgo Design System (Claude Design export).
// project/_ds/.../tokens/{colors,typography,spacing,effects}.css

export const colors = {
  cream50: '#fffcf8',
  cream100: '#faf5ec',
  cream200: '#f2e9db',
  ink900: '#241f1c',
  ink700: '#4a4038',
  ink500: '#6b5f55',
  ink300: '#a89c8e',
  ink150: '#dcd1c2',
  blue700: '#153e63',
  blue600: '#1c4f7d',
  blue500: '#2563a8',
  blue400: '#5088bf',
  blue200: '#a8c7de',
  blue100: '#d6e4ef',
  blue50: '#eef4f9',
  burgundy700: '#4d1f1f',
  burgundy600: '#642626',
  burgundy500: '#7a2e2e',
  burgundy300: '#b06a63',
  burgundy100: '#f0d9d5',
  success: '#3f6b45',
  error: '#a5342a',
} as const;

export const surface = {
  page: colors.cream100,
  pageAlt: colors.cream50,
  card: colors.cream50,
  sunken: colors.cream200,
  brand: colors.blue500,
  brandHover: colors.blue600,
  brandPress: colors.blue700,
  brandTint: colors.blue50,
  accent: colors.burgundy500,
  accentTint: colors.burgundy100,
  inverse: colors.ink900,
} as const;

export const text = {
  heading: colors.ink900,
  body: colors.ink700,
  muted: colors.ink500,
  onBrand: colors.cream50,
  onInverse: colors.cream100,
  link: colors.blue700,
  linkHover: colors.blue600,
} as const;

export const border = {
  subtle: colors.ink150,
  default: colors.ink300,
  brand: colors.blue500,
  width: 1.5,
} as const;

export const fontFamily = {
  display: 'SpaceGrotesk_700Bold',
  displaySemibold: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Mulish_400Regular',
  bodyMedium: 'Mulish_500Medium',
  bodySemibold: 'Mulish_600SemiBold',
  bodyBold: 'Mulish_700Bold',
  bodyExtrabold: 'Mulish_800ExtraBold',
  script: 'ShadowsIntoLight_400Regular',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  '2xl': 36,
  '3xl': 48,
} as const;

export const leading = {
  tight: 1.08,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const tracking = {
  tight: -0.3,
  normal: 0,
  wide: 1,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const shadow = {
  sm: { shadowColor: colors.ink900, shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: colors.ink900, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  lg: { shadowColor: colors.ink900, shadowOpacity: 0.14, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
} as const;
