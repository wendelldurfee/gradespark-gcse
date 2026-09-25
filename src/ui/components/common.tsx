import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, radius, spacing, useTheme, type Theme } from '../theme';

/** Small shared building blocks used across every screen. */

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { bg, fg, border } = buttonColors(theme, variant);
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: border === 'transparent' ? 0 : StyleSheet.hairlineWidth,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          minHeight: 48,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        icon && <Ionicons name={icon} size={18} color={fg} />
      )}
      <Text style={{ color: fg, fontSize: fontSize.md, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function buttonColors(theme: Theme, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: theme.primary, fg: theme.primaryText, border: 'transparent' };
    case 'secondary':
      return { bg: theme.surfaceAlt, fg: theme.text, border: theme.border };
    case 'danger':
      return { bg: theme.dangerBg, fg: theme.danger, border: theme.danger };
    case 'ghost':
    default:
      return { bg: 'transparent', fg: theme.textMuted, border: 'transparent' };
  }
}

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const tones = {
    neutral: { bg: theme.surfaceAlt, fg: theme.textMuted },
    success: { bg: theme.successBg, fg: theme.success },
    danger: { bg: theme.dangerBg, fg: theme.danger },
    warning: { bg: theme.warningBg, fg: theme.warning },
    info: { bg: theme.surfaceAlt, fg: theme.info },
  } as const;
  const { bg, fg } = tones[tone];

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          borderRadius: radius.sm,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.3 }}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({
  fraction,
  color,
  height = 6,
}: {
  fraction: number;
  color?: string;
  height?: number;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
      style={{
        height,
        backgroundColor: theme.surfaceAlt,
        borderRadius: radius.pill,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: color ?? theme.primary,
          borderRadius: radius.pill,
        }}
      />
    </View>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        {
          color: theme.textFaint,
          fontSize: fontSize.xs,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: spacing.xxl, gap: spacing.md }}>
      <Ionicons name={icon} size={44} color={theme.textFaint} />
      <Text style={{ color: theme.text, fontSize: fontSize.lg, fontWeight: '700' }}>{title}</Text>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: fontSize.md,
          textAlign: 'center',
          lineHeight: 21,
        }}
      >
        {message}
      </Text>
      {action}
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={{ color: theme.textMuted, fontSize: fontSize.md }}>{label}</Text>
    </View>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        backgroundColor: theme.dangerBg,
        borderColor: theme.danger,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Ionicons name="alert-circle" size={18} color={theme.danger} />
      <Text style={{ color: theme.danger, fontSize: fontSize.sm, flex: 1, lineHeight: 19 }}>
        {message}
      </Text>
    </View>
  );
}

/** A labelled row with a value on the right — used across the report screens. */
export function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
      }}
    >
      <Text style={{ color: theme.textMuted, fontSize: fontSize.md }}>{label}</Text>
      <Text style={{ color: valueColor ?? theme.text, fontSize: fontSize.md, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}
