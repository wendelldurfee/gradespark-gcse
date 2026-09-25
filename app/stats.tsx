import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDuration } from '../src/core/scoring';
import {
  READINESS_LABEL,
  readinessBand,
  readinessScore,
  summariseAttempts,
} from '../src/core/stats';
import type { AttemptResult } from '../src/core/types';
import { listAttempts } from '../src/db/repositories';
import { useLibraryStore } from '../src/store/libraryStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  ProgressBar,
  SectionTitle,
  StatRow,
} from '../src/ui/components/common';
import { fontSize, radius, spacing, useTheme } from '../src/ui/theme';

/** Study analytics: readiness per bank, score trend, and attempt history. */
export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const banks = useLibraryStore((s) => s.banks);
  const refresh = useLibraryStore((s) => s.refresh);

  const [attempts, setAttempts] = useState<AttemptResult[] | null>(null);

  const load = useCallback(async () => {
    await refresh();
    setAttempts(await listAttempts(undefined, 500));
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  if (attempts === null) return <Loading label="Crunching your history…" />;

  if (attempts.length === 0) {
    return (
      <View style={{ padding: spacing.lg }}>
        <Card>
          <EmptyState
            icon="stats-chart-outline"
            title="No attempts yet"
            message="Finish an exam and your scores, trends and weak domains will show up here."
            action={<Button label="Go to library" onPress={() => router.replace('/')} />}
          />
        </Card>
      </View>
    );
  }

  const totalStudySec = attempts.reduce((sum, a) => sum + a.durationSec, 0);
  const passCount = attempts.filter((a) => a.passed).length;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <Card>
        <SectionTitle>Overall</SectionTitle>
        <StatRow label="Exams taken" value={`${attempts.length}`} />
        <StatRow label="Passed" value={`${passCount}`} valueColor={theme.success} />
        <StatRow label="Failed" value={`${attempts.length - passCount}`} valueColor={theme.danger} />
        <StatRow label="Total study time" value={formatDuration(totalStudySec)} />
      </Card>

      {banks.map((bank) => {
        const stats = summariseAttempts(bank.id, attempts);
        if (stats.attempts === 0) return null;

        const score = readinessScore(stats, bank.totalQuestions, bank.passingScore);
        const band = readinessBand(score);
        const accent =
          band === 'ready' ? theme.success : band === 'not-ready' ? theme.danger : theme.warning;

        const history = attempts
          .filter((a) => a.bankId === bank.id)
          .slice()
          .sort((a, b) => a.finishedAt - b.finishedAt);

        return (
          <Card key={bank.id} style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: '800' }}>
                {bank.code}
              </Text>
              <View style={{ flex: 1 }} />
              <Badge label={`${READINESS_LABEL[band]} · ${score}%`} tone={band === 'ready' ? 'success' : band === 'not-ready' ? 'danger' : 'warning'} />
            </View>

            <ProgressBar fraction={score / 100} color={accent} height={8} />

            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <Metric label="Best" value={`${stats.bestPercent}%`} />
              <Metric label="Last" value={`${stats.lastPercent}%`} />
              <Metric label="Average" value={`${stats.averagePercent}%`} />
              <Metric
                label="Trend"
                value={`${stats.trend > 0 ? '+' : ''}${stats.trend}`}
                color={stats.trend > 0 ? theme.success : stats.trend < 0 ? theme.danger : undefined}
              />
            </View>

            <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>
              {stats.questionsSeen} of {bank.totalQuestions} questions attempted ·{' '}
              {stats.attempts} exam{stats.attempts === 1 ? '' : 's'} ·{' '}
              {formatDuration(stats.totalStudySec)} studied
            </Text>

            <ScoreTrend history={history} passingScore={bank.passingScore} />

            <View style={{ gap: spacing.xs }}>
              {history
                .slice()
                .reverse()
                .slice(0, 5)
                .map((attempt) => (
                  <View
                    key={attempt.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderTopColor: theme.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    }}
                  >
                    <Ionicons
                      name={attempt.passed ? 'checkmark-circle' : 'close-circle'}
                      size={15}
                      color={attempt.passed ? theme.success : theme.danger}
                    />
                    <Text style={{ color: theme.text, fontSize: fontSize.sm, width: 54 }}>
                      {attempt.percent}%
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, flex: 1 }}>
                      {new Date(attempt.finishedAt).toLocaleDateString()} · {attempt.mode} ·{' '}
                      {attempt.correct}/{attempt.totalQuestions}
                    </Text>
                    <Button
                      label="Review"
                      variant="ghost"
                      onPress={() => router.push(`/results/${attempt.id}`)}
                      style={{ paddingVertical: 2, paddingHorizontal: spacing.sm, minHeight: 0 }}
                    />
                  </View>
                ))}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>{label}</Text>
      <Text style={{ color: color ?? theme.text, fontSize: fontSize.lg, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

/** A compact column chart of score over time, with the cut score marked. */
function ScoreTrend({
  history,
  passingScore,
}: {
  history: AttemptResult[];
  passingScore: number;
}) {
  const theme = useTheme();
  if (history.length < 2) return null;

  const recent = history.slice(-12);
  const height = 64;

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{
          height,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 3,
          borderBottomColor: theme.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        }}
      >
        {/* Cut-score guide line */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: (passingScore / 100) * height,
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.textFaint,
          }}
        />
        {recent.map((attempt) => (
          <View
            key={attempt.id}
            accessibilityLabel={`${attempt.percent} percent`}
            style={{
              flex: 1,
              height: Math.max(2, (attempt.percent / 100) * height),
              backgroundColor: attempt.passed ? theme.success : theme.danger,
              borderTopLeftRadius: radius.sm,
              borderTopRightRadius: radius.sm,
              opacity: 0.85,
            }}
          />
        ))}
      </View>
      <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>
        Last {recent.length} attempts · line marks the {passingScore}% pass mark
      </Text>
    </View>
  );
}
