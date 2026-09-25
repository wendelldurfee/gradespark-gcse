import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../../core/scoring';
import { fontSize, radius, spacing, useTheme } from '../theme';
import { ProgressBar } from './common';

/**
 * The exam ribbon: question counter, countdown clock, and the pause/navigator
 * controls, mirroring the toolbar of the desktop players.
 */
export function ExamHeader({
  index,
  total,
  answered,
  remainingSec,
  paused,
  marked,
  onTogglePause,
  onToggleMark,
  onOpenNavigator,
}: {
  index: number;
  total: number;
  answered: number;
  remainingSec: number | null;
  paused: boolean;
  marked: boolean;
  onTogglePause: () => void;
  onToggleMark: () => void;
  onOpenNavigator: () => void;
}) {
  const theme = useTheme();

  // Warn at five minutes, escalate to danger inside the last minute.
  const urgency =
    remainingSec === null
      ? 'none'
      : remainingSec <= 60
        ? 'danger'
        : remainingSec <= 300
          ? 'warning'
          : 'none';

  const clockColor =
    urgency === 'danger' ? theme.danger : urgency === 'warning' ? theme.warning : theme.text;

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderBottomColor: theme.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        paddingTop: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open question navigator"
          onPress={onOpenNavigator}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <Ionicons name="grid-outline" size={18} color={theme.textMuted} />
          <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: '700' }}>
            {index + 1}
            <Text style={{ color: theme.textFaint, fontWeight: '500' }}> / {total}</Text>
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={marked ? 'Remove review flag' : 'Flag for review'}
          accessibilityState={{ selected: marked }}
          onPress={onToggleMark}
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            backgroundColor: marked ? theme.markBg : 'transparent',
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.sm,
          }}
        >
          <Ionicons
            name={marked ? 'flag' : 'flag-outline'}
            size={17}
            color={marked ? theme.warning : theme.textMuted}
          />
          <Text
            style={{
              color: marked ? theme.warning : theme.textMuted,
              fontSize: fontSize.sm,
              fontWeight: '600',
            }}
          >
            Review
          </Text>
        </Pressable>

        {remainingSec !== null && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume exam' : 'Pause exam'}
            onPress={onTogglePause}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={16} color={clockColor} />
            <Text
              style={{
                color: clockColor,
                fontSize: fontSize.md,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDuration(remainingSec)}
            </Text>
          </Pressable>
        )}
      </View>

      <ProgressBar fraction={total === 0 ? 0 : answered / total} />
    </View>
  );
}
