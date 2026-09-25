import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question, Response } from '../../core/types';
import { fontSize, radius, spacing, useTheme } from '../theme';

/**
 * Drag-and-drop and matching questions.
 *
 * The desktop VCE player uses a literal drag. On a phone that fights the
 * scroll view, so this uses the standard mobile equivalent: tap a token to pick
 * it up, then tap a drop zone to place it. Tapping a filled zone returns its
 * token to the tray.
 *
 * Responses are stored as `targetId=choiceId` pairs, which is what the grader
 * expects for both `dragdrop` and `matching`.
 */
export function DragDropQuestion({
  question,
  response,
  onChange,
  revealed,
  disabled,
}: {
  question: Question;
  response: Response;
  onChange: (next: Response) => void;
  revealed: boolean;
  disabled: boolean;
}) {
  const theme = useTheme();
  const [held, setHeld] = useState<string | null>(null);

  const targets = question.targets ?? [];
  const choices = question.choices ?? [];
  const byChoiceId = new Map(choices.map((c) => [c.id, c]));

  const placements = new Map<string, string>();
  for (const pair of response) {
    const [targetId, choiceId] = splitPair(pair);
    if (targetId && choiceId) placements.set(targetId, choiceId);
  }

  const expected = new Map<string, string>();
  for (const pair of question.correct) {
    const [targetId, choiceId] = splitPair(pair);
    if (targetId && choiceId) expected.set(targetId, choiceId);
  }

  const usedChoices = new Set(placements.values());
  const tray = choices.filter((c) => !usedChoices.has(c.id));

  const commit = (next: Map<string, string>) => {
    onChange([...next.entries()].map(([targetId, choiceId]) => `${targetId}=${choiceId}`));
  };

  const onTargetPress = (targetId: string) => {
    if (disabled || revealed) return;
    const next = new Map(placements);

    if (held) {
      // Placing onto an occupied zone swaps the old token back to the tray.
      next.set(targetId, held);
      setHeld(null);
    } else if (next.has(targetId)) {
      next.delete(targetId);
    } else {
      return;
    }

    commit(next);
  };

  const onTokenPress = (choiceId: string) => {
    if (disabled || revealed) return;
    setHeld((current) => (current === choiceId ? null : choiceId));
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
        {revealed
          ? 'Your placements are shown against the correct answers.'
          : held
            ? 'Now tap a drop zone to place the selected item.'
            : 'Tap an item, then tap the drop zone it belongs to.'}
      </Text>

      <View style={{ gap: spacing.sm }}>
        {targets.map((target) => {
          const placedId = placements.get(target.id);
          const placed = placedId ? byChoiceId.get(placedId) : undefined;
          const correctId = expected.get(target.id);
          const isRight = revealed && placedId === correctId;

          const borderColor = revealed
            ? isRight
              ? theme.success
              : theme.danger
            : held
              ? theme.primary
              : theme.border;

          return (
            <Pressable
              key={target.id}
              accessibilityRole="button"
              accessibilityLabel={`Drop zone ${target.label}${placed ? `, contains ${placed.text}` : ', empty'}`}
              onPress={() => onTargetPress(target.id)}
              style={{
                backgroundColor: theme.surface,
                borderColor,
                borderWidth: revealed || held ? 1.5 : StyleSheet.hairlineWidth,
                borderStyle: placed ? 'solid' : 'dashed',
                borderRadius: radius.md,
                padding: spacing.md,
                gap: spacing.xs,
              }}
            >
              <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, fontWeight: '700' }}>
                {target.label.toUpperCase()}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text
                  style={{
                    color: placed ? theme.text : theme.textFaint,
                    fontSize: fontSize.md,
                    flex: 1,
                  }}
                >
                  {placed?.text ?? 'Empty'}
                </Text>
                {revealed && (
                  <Ionicons
                    name={isRight ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={isRight ? theme.success : theme.danger}
                  />
                )}
              </View>

              {revealed && !isRight && correctId && (
                <Text style={{ color: theme.success, fontSize: fontSize.sm }}>
                  Correct: {byChoiceId.get(correctId)?.text ?? correctId}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {!revealed && (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, fontWeight: '700' }}>
            AVAILABLE ITEMS
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {tray.length === 0 && (
              <Text style={{ color: theme.textFaint, fontSize: fontSize.sm }}>
                All items placed.
              </Text>
            )}
            {tray.map((choice) => {
              const isHeld = held === choice.id;
              return (
                <Pressable
                  key={choice.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isHeld }}
                  accessibilityLabel={choice.text}
                  onPress={() => onTokenPress(choice.id)}
                  style={{
                    backgroundColor: isHeld ? theme.primary : theme.surfaceAlt,
                    borderColor: isHeld ? theme.primary : theme.border,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderRadius: radius.pill,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }}
                >
                  <Text
                    style={{
                      color: isHeld ? theme.primaryText : theme.text,
                      fontSize: fontSize.sm,
                      fontWeight: isHeld ? '700' : '500',
                    }}
                  >
                    {choice.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function splitPair(entry: string): [string, string] {
  const idx = entry.indexOf('=');
  if (idx === -1) return [entry, ''];
  return [entry.slice(0, idx).trim(), entry.slice(idx + 1).trim()];
}
