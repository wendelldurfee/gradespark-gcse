import { Platform, useColorScheme } from 'react-native';

/**
 * GradeSpark uses energetic violet with bright subject accents and keeps
 * contrast high in both system colour schemes.
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
  bg: '#100D1D',
  surface: '#1C172D',
  surfaceAlt: '#29213F',
  border: '#3D3358',
  text: '#FAF8FF',
  textMuted: '#B7AEC9',
  textFaint: '#817794',
  primary: '#8B5CF6',
  primaryText: '#FFFFFF',
  success: '#34D399',
  successBg: '#0F3A2E',
  danger: '#F87171',
  dangerBg: '#3F1A1D',
  warning: '#FBBF24',
  warningBg: '#3A2E10',
  info: '#60A5FA',
  markBg: '#3A2E10',
};

const light: Theme = {
  dark: false,
  bg: '#F7F5FC',
  surface: '#FFFFFF',
  surfaceAlt: '#EEE9FA',
  border: '#DED7EB',
  text: '#211A31',
  textMuted: '#655C76',
  textFaint: '#91879F',
  primary: '#6D28D9',
  primaryText: '#FFFFFF',
  success: '#047857',
  successBg: '#D5F5E6',
  danger: '#B91C1C',
  dangerBg: '#FDE2E2',
  warning: '#B45309',
  warningBg: '#FDF0D5',
  info: '#1D4ED8',
  markBg: '#FDF0D5',
};

export function useTheme(): Theme {
  return useColorScheme() === 'light' ? light : dark;
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
