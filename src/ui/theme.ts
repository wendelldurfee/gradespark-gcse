import { Platform } from 'react-native';

/**
 * GradeSpark Quest uses a consistent navy and lime palette and keeps
 * contrast high across phones and tablets.
 */

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  info: string;
  markBg: string;
}

const dark: Theme = {
  dark: true,
  bg: '#141C2C',
  surface: '#1D2940',
  surfaceAlt: '#243048',
  border: '#3D4D65',
  text: '#F4F7FC',
  textMuted: '#B1BED4',
  textFaint: '#9BAAC2',
  primary: '#B5F36A',
  primaryText: '#18261A',
  success: '#34D399',
  successBg: '#293E2B',
  danger: '#F87171',
  dangerBg: '#3F1A1D',
  warning: '#FBBF24',
  warningBg: '#3A2E10',
  info: '#60A5FA',
  markBg: '#3A2E10',
};

export function useTheme(): Theme {
  return dark;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 30,
} as const;

/** Monospace family for code and CLI output inside a question stem. */
export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});
