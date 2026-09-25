import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { configForMode } from '../../src/core/session';
import { randomSeed } from '../../src/core/random';
import type { ExamMode, QuestionFilter, SessionConfig } from '../../src/core/types';
import { countByFilter, getBank } from '../../src/db/repositories';
import { useExamStore } from '../../src/store/examStore';
import {
  Badge,
  Button,
  Card,
  ErrorNotice,
  Loading,
  SectionTitle,
} from '../../src/ui/components/common';
import { confirm } from '../../src/ui/components/DialogHost';
import { fontSize, radius, spacing, useTheme } from '../../src/ui/theme';

/** Mode picker and custom-exam configuration, mirroring the VCE setup dialog. */

const MODES: { mode: ExamMode; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    mode: 'exam',
    title: 'Exam simulation',
    description: 'Timed, shuffled, no feedback until you submit.',
    icon: 'timer-outline',
  },
  {
    mode: 'practice',
    title: 'Practice',
    description: 'Untimed, with the answer and explanation after each question.',
    icon: 'school-outline',
  },
  {
    mode: 'flashcard',
    title: 'Quick drill',
    description: '30 shuffled questions with instant feedback.',
    icon: 'flash-outline',
  },
  {
    mode: 'custom',
    title: 'Custom',
    description: 'Choose the domains, question count, timer and scoring.',
    icon: 'options-outline',
  },
];

const FILTERS: { value: QuestionFilter; label: string }[] = [
  { value: 'all', label: 'All questions' },
  { value: 'unseen', label: 'Not yet seen' },
  { value: 'incorrect', label: 'Previously wrong' },
  { value: 'marked', label: 'Flagged' },
];

export default function ExamSetupScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { bankId } = useLocalSearchParams<{ bankId: string }>();
  const startSession = useExamStore((s) => s.start);

  const [bank, setBank] = useState<Awaited<ReturnType<typeof getBank>>>(null);
  const [counts, setCounts] = useState({ total: 0, unseen: 0, incorrect: 0, marked: 0 });
  const [mode, setMode] = useState<ExamMode>('exam');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await getBank(bankId);
        if (cancelled) return;
        if (!loaded) {
          setError('That exam bank is no longer installed.');
          return;
        }
        setBank(loaded);
        setConfig(configForMode(loaded, 'exam', randomSeed()));
        setCounts(await countByFilter(bankId));
        navigation.setOptions({ title: loaded.code });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bankId, navigation]);

  const chooseMode = (next: ExamMode) => {
    if (!bank) return;
    setMode(next);
    setConfig(configForMode(bank, next, randomSeed()));
  };

  const poolSize = useMemo(() => {
    if (!config) return 0;
    switch (config.filter) {
      case 'unseen':
        return counts.unseen;
      case 'incorrect':
        return counts.incorrect;
      case 'marked':
        return counts.marked;
      default:
        return counts.total;
    }
  }, [config, counts]);

  const begin = async () => {
    if (!config || !bank) return;
    setStarting(true);
    setError(null);
    try {
      const sessionId = await startSession(bank.id, config);
      router.replace(`/session/${sessionId}`);
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  };

  if (error && !bank) {
    return (
      <View style={{ padding: spacing.lg }}>
        <ErrorNotice message={error} />
      </View>
    );
  }

  if (!bank || !config) return <Loading label="Loading exam…" />;

  const custom = mode === 'custom';
  const update = (patch: Partial<SessionConfig>) => setConfig({ ...config, ...patch });

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <Card style={{ gap: spacing.xs }}>
        <Text style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: '800' }}>
          {bank.code}
        </Text>
        <Text style={{ color: theme.text, fontSize: fontSize.xl, fontWeight: '700' }}>
          {bank.title}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          {bank.questions.length} questions · pass mark {bank.passingScore}% ·{' '}
          {bank.timeLimitMinutes} minutes
        </Text>
        {bank.source && (
          <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>
            Source: {bank.source}
          </Text>
        )}
      </Card>

      <View>
        <SectionTitle>Mode</SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {MODES.map((entry) => {
            const active = mode === entry.mode;
            return (
              <Pressable
                key={entry.mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={entry.title}
                onPress={() => chooseMode(entry.mode)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  backgroundColor: active ? theme.surfaceAlt : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                  borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <Ionicons
                  name={entry.icon}
                  size={22}
                  color={active ? theme.primary : theme.textMuted}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: '700' }}>
                    {entry.title}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: fontSize.sm, lineHeight: 19 }}>
                    {entry.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {custom && (
        <>
          <View>
            <SectionTitle>Question pool</SectionTitle>
            <Card style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {FILTERS.map((filter) => {
                  const active = config.filter === filter.value;
                  const available =
                    filter.value === 'unseen'
                      ? counts.unseen
                      : filter.value === 'incorrect'
                        ? counts.incorrect
                        : filter.value === 'marked'
                          ? counts.marked
                          : counts.total;

                  return (
                    <Pressable
                      key={filter.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active, disabled: available === 0 }}
                      onPress={() => available > 0 && update({ filter: filter.value })}
                      style={{
                        backgroundColor: active ? theme.primary : theme.surfaceAlt,
                        borderRadius: radius.pill,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        opacity: available === 0 ? 0.4 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? theme.primaryText : theme.text,
                          fontSize: fontSize.sm,
                          fontWeight: '600',
                        }}
                      >
                        {filter.label} ({available})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {(bank.sections?.length ?? 0) > 0 && (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
                    Domains {config.sectionIds.length === 0 ? '(all)' : `(${config.sectionIds.length} selected)`}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {bank.sections!.map((section) => {
                      const active = config.sectionIds.includes(section.id);
                      return (
                        <Pressable
                          key={section.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: active }}
                          onPress={() =>
                            update({
                              sectionIds: active
                                ? config.sectionIds.filter((id) => id !== section.id)
                                : [...config.sectionIds, section.id],
                            })
                          }
                          style={{
                            backgroundColor: active ? theme.surfaceAlt : 'transparent',
                            borderColor: active ? theme.primary : theme.border,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: radius.pill,
                            paddingVertical: spacing.xs,
                            paddingHorizontal: spacing.md,
                          }}
                        >
                          <Text style={{ color: theme.text, fontSize: fontSize.sm }}>
                            {section.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Card>
          </View>

          <View>
            <SectionTitle>Options</SectionTitle>
            <Card style={{ gap: spacing.xs }}>
              <Stepper
                label="Questions"
                value={Math.min(config.questionCount, Math.max(1, poolSize))}
                min={1}
                max={Math.max(1, poolSize)}
                step={5}
                onChange={(questionCount) => update({ questionCount })}
              />
              <Stepper
                label="Time limit (minutes)"
                value={config.timeLimitSec === null ? 0 : Math.round(config.timeLimitSec / 60)}
                min={0}
                max={300}
                step={15}
                formatValue={(v) => (v === 0 ? 'Untimed' : `${v} min`)}
                onChange={(minutes) => update({ timeLimitSec: minutes === 0 ? null : minutes * 60 })}
              />
              <Stepper
                label="Pass mark (%)"
                value={config.passingScore}
                min={20}
                max={100}
                step={5}
                onChange={(passingScore) => update({ passingScore })}
              />

              <Toggle
                label="Shuffle questions"
                value={config.shuffleQuestions}
                onChange={(shuffleQuestions) => update({ shuffleQuestions })}
              />
              <Toggle
                label="Shuffle answer options"
                value={config.shuffleChoices}
                onChange={(shuffleChoices) => update({ shuffleChoices })}
              />
              <Toggle
                label="Show answer after each question"
                value={config.instantFeedback}
                onChange={(instantFeedback) => update({ instantFeedback })}
              />
              <Toggle
                label="Partial credit on multi-answer"
                hint="Score each correct selection instead of all-or-nothing."
                value={config.partialCredit}
                onChange={(partialCredit) => update({ partialCredit })}
              />
            </Card>
          </View>
        </>
      )}

      {error && <ErrorNotice message={error} />}

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Badge
            label={`${Math.min(config.questionCount, Math.max(1, poolSize))} questions`}
            tone="info"
          />
          <Badge
            label={config.timeLimitSec === null ? 'Untimed' : `${Math.round(config.timeLimitSec / 60)} min`}
            tone="neutral"
          />
          <Badge label={`Pass ${config.passingScore}%`} tone="neutral" />
        </View>

        <Button
          label={starting ? 'Starting…' : 'Start exam'}
          icon="play"
          loading={starting}
          disabled={poolSize === 0}
          onPress={() => {
            void (async () => {
              if (mode === 'exam') {
                const ok = await confirm({
                  title: 'Start exam simulation?',
                  message:
                    'The clock starts immediately and runs until you submit or time expires.',
                  confirmLabel: 'Start',
                });
                if (!ok) return;
              }
              await begin();
            })();
          }}
        />

        {poolSize === 0 && (
          <Text style={{ color: theme.danger, fontSize: fontSize.sm, textAlign: 'center' }}>
            No questions match the selected filter.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  formatValue?: (value: number) => string;
}) {
  const theme = useTheme();
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.md,
      }}
    >
      <Text style={{ color: theme.text, fontSize: fontSize.md, flex: 1 }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        onPress={() => onChange(clamp(value - step))}
        hitSlop={8}
        style={{ padding: spacing.xs }}
      >
        <Ionicons name="remove-circle-outline" size={26} color={theme.textMuted} />
      </Pressable>
      <Text
        style={{
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: '700',
          minWidth: 74,
          textAlign: 'center',
        }}
      >
        {formatValue ? formatValue(value) : value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        onPress={() => onChange(clamp(value + step))}
        hitSlop={8}
        style={{ padding: spacing.xs }}
      >
        <Ionicons name="add-circle-outline" size={26} color={theme.textMuted} />
      </Pressable>
    </View>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: fontSize.md }}>{label}</Text>
        {hint && <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor={theme.surface}
      />
    </View>
  );
}
