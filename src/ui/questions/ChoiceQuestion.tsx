import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expectedCount } from '../../core/grading';
import type { Question, Response } from '../../core/types';
import { fontSize, radius, spacing, useTheme, type Theme } from '../theme';

/**
 * Single-choice, multi-choice and true/false. Options are rendered in
 * `choiceOrder`, which is the shuffled presentation order for this attempt.
 */

export function ChoiceQuestion({
  question,
  choiceOrder,
  response,
  onChange,
  revealed,
  disabled,
}: {
  question: Question;
  choiceOrder: string[];
  response: Response;
  onChange: (next: Response) => void;
  revealed: boolean;
  disabled: boolean;
}) {
  const theme = useTheme();
  const multi = question.type === 'multiple';
  const limit = expectedCount(question);
  const selected = new Set(response);

  const toggle = (choiceId: string) => {
    if (disabled) return;

    if (!multi) {
      onChange([choiceId]);
      return;
    }

    const next = new Set(selected);
    if (next.has(choiceId)) {
      next.delete(choiceId);
    } else {
      // At the limit, the oldest pick drops out rather than blocking the tap —
      // the same behaviour as the desktop players.
      if (next.size >= limit) {
        const oldest = response.find((id) => next.has(id));
        if (oldest) next.delete(oldest);
      }
      next.add(choiceId);
    }

    // Preserve the bank's canonical order so stored responses are comparable.
    onChange(choiceOrder.filter((id) => next.has(id)));
  };

  const byId = new Map((question.choices ?? []).map((c) => [c.id, c]));

  return (
    <View style={{ gap: spacing.sm }}>
      {multi && (
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm, marginBottom: spacing.xs }}>
          Select {limit}. {selected.size} of {limit} chosen.
        </Text>
      )}

      {choiceOrder.map((choiceId, position) => {
        const choice = byId.get(choiceId);
        if (!choice) return null;

        const isSelected = selected.has(choiceId);
        const isCorrect = question.correct.includes(choiceId);
        const state = resolveState({ revealed, isSelected, isCorrect });
        const colors = stateColors(theme, state);

        return (
          <Pressable
            key={choiceId}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: isSelected, disabled }}
            accessibilityLabel={`Option ${String.fromCharCode(65 + position)}. ${choice.text}`}
            onPress={() => toggle(choiceId)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.md,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              borderWidth: state === 'idle' ? StyleSheet.hairlineWidth : 1.5,
              borderRadius: radius.md,
              padding: spacing.md,
              opacity: pressed && !disabled ? 0.85 : 1,
            })}
          >
            <Marker
              letter={String.fromCharCode(65 + position)}
              multi={multi}
              selected={isSelected}
              state={state}
            />
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.md,
                lineHeight: fontSize.md * 1.45,
                flex: 1,
              }}
            >
              {choice.text}
            </Text>
            {revealed && state === 'correct' && (
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            )}
            {revealed && state === 'wrong' && (
              <Ionicons name="close-circle" size={20} color={theme.danger} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed';

function resolveState({
  revealed,
  isSelected,
  isCorrect,
}: {
  revealed: boolean;
  isSelected: boolean;
  isCorrect: boolean;
}): OptionState {
  if (!revealed) return isSelected ? 'selected' : 'idle';
  if (isCorrect && isSelected) return 'correct';
  if (isCorrect && !isSelected) return 'missed';
  if (!isCorrect && isSelected) return 'wrong';
  return 'idle';
}

function stateColors(theme: Theme, state: OptionState) {
  switch (state) {
    case 'selected':
      return { bg: theme.surfaceAlt, border: theme.primary, text: theme.text };
    case 'correct':
      return { bg: theme.successBg, border: theme.success, text: theme.text };
    case 'wrong':
      return { bg: theme.dangerBg, border: theme.danger, text: theme.text };
    case 'missed':
      // The right answer the candidate did not pick: outlined, not filled.
      return { bg: 'transparent', border: theme.success, text: theme.text };
    case 'idle':
    default:
      return { bg: theme.surface, border: theme.border, text: theme.text };
  }
}

function Marker({
  letter,
  multi,
  selected,
  state,
}: {
  letter: string;
  multi: boolean;
  selected: boolean;
  state: OptionState;
}) {
  const theme = useTheme();
  const active = selected || state === 'correct' || state === 'wrong';

  const tint =
    state === 'correct'
      ? theme.success
      : state === 'wrong'
        ? theme.danger
        : state === 'missed'
          ? theme.success
          : selected
            ? theme.primary
            : theme.border;

  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: multi ? radius.sm : radius.pill,
        borderWidth: 1.5,
        borderColor: tint,
        backgroundColor: active ? tint : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: active ? theme.primaryText : theme.textMuted,
          fontSize: fontSize.sm,
          fontWeight: '700',
        }}
      >
        {letter}
      </Text>
    </View>
  );
}
