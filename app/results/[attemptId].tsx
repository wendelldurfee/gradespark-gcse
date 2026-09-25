import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { averageSecPerQuestion, formatDuration, weakestSections } from '../../src/core/scoring';
import type { AttemptResult } from '../../src/core/types';
import { getAttempt } from '../../src/db/repositories';
import { useExamStore } from '../../src/store/examStore';
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Loading,
  ProgressBar,
  SectionTitle,
  StatRow,
} from '../../src/ui/components/common';
import { fontSize, radius, spacing, useTheme } from '../../src/ui/theme';

/** The post-exam score report: verdict, scaled score, and the domain breakdown. */
export default function ResultsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const clearSession = useExamStore((s) => s.clear);

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getAttempt(attemptId);
        if (cancelled) return;
        if (!found) setError('That score report could not be found.');
        else setResult(found);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (error) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <ErrorNotice message={error} />
        <Button label="Back to library" onPress={() => router.replace('/')} />
      </View>
    );
  }

  if (!result) return <Loading label="Scoring…" />;

  const accent = result.passed ? theme.success : theme.danger;
  const weak = weakestSections(result, 3);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <Card style={{ alignItems: 'center', gap: spacing.md, borderColor: accent, borderWidth: 1.5 }}>
        <Ionicons
          name={result.passed ? 'trophy' : 'alert-circle'}
          size={48}
          color={accent}
        />
        <Text style={{ color: accent, fontSize: fontSize.xxl, fontWeight: '800', letterSpacing: 1 }}>
          {result.passed ? 'PASS' : 'FAIL'}
        </Text>

        <Text style={{ color: theme.text, fontSize: 44, fontWeight: '800' }}>
          {result.percent}%
        </Text>

        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
          Scaled score {result.scaledScore} / 1000 · pass mark {result.passingScore}%
        </Text>

        <View style={{ width: '100%', gap: spacing.xs, marginTop: spacing.sm }}>
          <ProgressBar fraction={result.percent / 100} color={accent} height={10} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>0%</Text>
            <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>
              cut score {result.passingScore}%
            </Text>
            <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>100%</Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle>Breakdown</SectionTitle>
        <StatRow label="Correct" value={`${result.correct}`} valueColor={theme.success} />
        <StatRow label="Incorrect" value={`${result.incorrect}`} valueColor={theme.danger} />
        <StatRow label="Unanswered" value={`${result.skipped}`} valueColor={theme.warning} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginVertical: spacing.xs }} />
        <StatRow label="Total questions" value={`${result.totalQuestions}`} />
        <StatRow label="Time taken" value={formatDuration(result.durationSec)} />
        <StatRow label="Average per question" value={`${averageSecPerQuestion(result)}s`} />
        <StatRow label="Mode" value={result.mode} />
      </Card>

      {result.sections.length > 0 && (
        <Card>
          <SectionTitle>By domain</SectionTitle>
          <View style={{ gap: spacing.md }}>
            {result.sections.map((section) => {
              const color =
                section.percent >= result.passingScore
                  ? theme.success
                  : section.percent >= result.passingScore * 0.7
                    ? theme.warning
                    : theme.danger;

              return (
                <View key={section.sectionId} style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ color: theme.text, fontSize: fontSize.sm, flex: 1 }}>
                      {section.title}
                    </Text>
                    <Text style={{ color, fontSize: fontSize.sm, fontWeight: '700' }}>
                      {section.percent}%
                    </Text>
                    <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, width: 48, textAlign: 'right' }}>
                      {section.correct}/{section.total}
                    </Text>
                  </View>
                  <ProgressBar fraction={section.percent / 100} color={color} />
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {weak.length > 0 && !result.passed && (
        <Card style={{ gap: spacing.sm, borderColor: theme.warning }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="bulb-outline" size={18} color={theme.warning} />
            <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: '700' }}>
              Focus your study here
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {weak.map((section) => (
              <Badge
                key={section.sectionId}
                label={`${section.title} · ${section.percent}%`}
                tone="warning"
              />
            ))}
          </View>
          <Text style={{ color: theme.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Start a custom exam filtered to “Previously wrong” to drill the questions you missed.
          </Text>
        </Card>
      )}

      <View style={{ gap: spacing.sm }}>
        <Button
          label="Review answers"
          icon="list-outline"
          onPress={() => router.push(`/results/review/${result.id}`)}
        />
        <Button
          label="Retake exam"
          icon="refresh"
          variant="secondary"
          onPress={() => {
            clearSession();
            router.replace(`/exam/${result.bankId}`);
          }}
        />
        <Button
          label="Back to library"
          variant="ghost"
          onPress={() => {
            clearSession();
            router.replace('/');
          }}
        />
      </View>
    </ScrollView>
  );
}
