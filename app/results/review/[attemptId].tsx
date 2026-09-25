import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDuration } from '../../../src/core/scoring';
import type { AttemptResult, ExamBank, GradedItem } from '../../../src/core/types';
import { getAttempt, getBank, getNote, saveNote } from '../../../src/db/repositories';
import { Badge, Button, Card, ErrorNotice, Loading } from '../../../src/ui/components/common';
import { QuestionView } from '../../../src/ui/questions/QuestionView';
import { fontSize, radius, spacing, useTheme } from '../../../src/ui/theme';

/** Walk back through every question with the answer key and explanation shown. */

type Filter = 'all' | 'incorrect' | 'marked' | 'skipped';

export default function ReviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [bank, setBank] = useState<ExamBank | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const attempt = await getAttempt(attemptId);
        if (!attempt) {
          if (!cancelled) setError('That score report could not be found.');
          return;
        }
        const loaded = await getBank(attempt.bankId);
        if (cancelled) return;
        setResult(attempt);
        setBank(loaded);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const questions = useMemo(
    () => new Map((bank?.questions ?? []).map((q) => [q.id, q])),
    [bank],
  );

  const visible = useMemo(() => {
    const items = result?.items ?? [];
    switch (filter) {
      case 'incorrect':
        return items.filter((i) => !i.correct);
      case 'marked':
        return items.filter((i) => i.marked);
      case 'skipped':
        return items.filter((i) => !i.answered);
      default:
        return items;
    }
  }, [result, filter]);

  const openItem = async (item: GradedItem) => {
    const next = expanded === item.questionId ? null : item.questionId;
    setExpanded(next);
    if (next && notes[next] === undefined) {
      const stored = await getNote(next);
      setNotes((prev) => ({ ...prev, [next]: stored ?? '' }));
    }
  };

  if (error) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <ErrorNotice message={error} />
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  if (!result || !bank) return <Loading label="Loading review…" />;

  const counts = {
    all: result.items.length,
    incorrect: result.items.filter((i) => !i.correct).length,
    marked: result.items.filter((i) => i.marked).length,
    skipped: result.items.filter((i) => !i.answered).length,
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      >
        {(['all', 'incorrect', 'marked', 'skipped'] as Filter[]).map((value) => {
          const active = filter === value;
          const label = value.charAt(0).toUpperCase() + value.slice(1);
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setFilter(value)}
              style={{
                backgroundColor: active ? theme.primary : theme.surfaceAlt,
                borderRadius: radius.pill,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
              }}
            >
              <Text
                style={{
                  color: active ? theme.primaryText : theme.text,
                  fontSize: fontSize.sm,
                  fontWeight: '600',
                }}
              >
                {label} ({counts[value]})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.md,
        }}
      >
        {visible.length === 0 && (
          <Card>
            <Text style={{ color: theme.textMuted, fontSize: fontSize.md, textAlign: 'center' }}>
              Nothing matches this filter.
            </Text>
          </Card>
        )}

        {visible.map((item) => {
          const question = questions.get(item.questionId);
          const isOpen = expanded === item.questionId;
          const number = result.items.indexOf(item) + 1;

          const tone = !item.answered ? 'warning' : item.correct ? 'success' : 'danger';
          const label = !item.answered ? 'SKIPPED' : item.correct ? 'CORRECT' : 'INCORRECT';

          return (
            <Card key={item.questionId} style={{ gap: spacing.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`Question ${number}, ${label.toLowerCase()}`}
                onPress={() => void openItem(item)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <Badge label={`Q${number}`} tone="neutral" />
                <Badge label={label} tone={tone} />
                {item.marked && <Ionicons name="flag" size={14} color={theme.warning} />}
                <View style={{ flex: 1 }} />
                <Text style={{ color: theme.textFaint, fontSize: fontSize.xs }}>
                  {formatDuration(Math.round(item.timeSpentMs / 1000))}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.textFaint}
                />
              </Pressable>

              {!isOpen && question && (
                <Text numberOfLines={2} style={{ color: theme.textMuted, fontSize: fontSize.sm, lineHeight: 19 }}>
                  {question.stem}
                </Text>
              )}

              {isOpen &&
                (question ? (
                  <View style={{ gap: spacing.lg }}>
                    <QuestionView
                      question={question}
                      choiceOrder={(question.choices ?? []).map((c) => c.id)}
                      response={item.response}
                      onChange={() => {}}
                      revealed
                      disabled
                    />
                    <NoteEditor
                      value={notes[item.questionId] ?? ''}
                      onChange={(text) => setNotes((prev) => ({ ...prev, [item.questionId]: text }))}
                      onSave={() =>
                        void saveNote(bank.id, item.questionId, notes[item.questionId] ?? '')
                      }
                    />
                  </View>
                ) : (
                  <Text style={{ color: theme.textFaint, fontSize: fontSize.sm }}>
                    This question is no longer in the bank.
                  </Text>
                ))}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Personal notes, stored per question and kept across attempts. */
function NoteEditor({
  value,
  onChange,
  onSave,
}: {
  value: string;
  onChange: (text: string) => void;
  onSave: () => void;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);

  if (!editing && value.trim().length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setEditing(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <Ionicons name="create-outline" size={16} color={theme.textMuted} />
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>Add a note</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.8 }}>
        MY NOTES
      </Text>
      <NoteInput value={value} onChange={onChange} editing={editing} onFocus={() => setEditing(true)} />
      {editing && (
        <Button
          label="Save note"
          variant="secondary"
          icon="save-outline"
          onPress={() => {
            onSave();
            setEditing(false);
          }}
        />
      )}
    </View>
  );
}

function NoteInput({
  value,
  onChange,
  editing,
  onFocus,
}: {
  value: string;
  onChange: (text: string) => void;
  editing: boolean;
  onFocus: () => void;
}) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onFocus={onFocus}
      editable
      multiline
      placeholder="Why was this wrong? What do you need to remember?"
      placeholderTextColor={theme.textFaint}
      accessibilityLabel="Question note"
      style={{
        color: theme.text,
        backgroundColor: theme.bg,
        borderColor: editing ? theme.primary : theme.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.md,
        padding: spacing.md,
        fontSize: fontSize.sm,
        minHeight: 64,
      }}
    />
  );
}
