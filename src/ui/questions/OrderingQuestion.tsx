import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question, Response } from '../../core/types';
import { Button } from '../components/common';
import { fontSize, radius, spacing, useTheme } from '../theme';

/**
 * Sequencing question ("put these steps in order").
 *
 * Reordering is done with explicit up/down controls rather than a free drag: on
 * a phone a long list scrolls under the finger, and arrows stay usable with
 * assistive technologies.
 */
export function OrderingQuestion({
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
  const byId = new Map((question.choices ?? []).map((c) => [c.id, c]));

  // Before the first move, the working order is the shuffled presentation order.
  const order = response.length === choiceOrder.length ? response : choiceOrder;

  const move = (from: number, to: number) => {
    if (disabled || revealed) return;
    if (to < 0 || to >= order.length) return;
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
        Arrange the items into the correct order, first at the top.
      </Text>

      {order.map((choiceId, index) => {
        const choice = byId.get(choiceId);
        if (!choice) return null;

        const inRightPlace = revealed && question.correct[index] === choiceId;
        const borderColor = revealed
          ? inRightPlace
            ? theme.success
            : theme.danger
          : theme.border;

        return (
          <View
            key={choiceId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: theme.surface,
              borderColor,
              borderWidth: revealed ? 1.5 : StyleSheet.hairlineWidth,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: radius.pill,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.primaryText, fontSize: fontSize.sm, fontWeight: '700' }}>
                {index + 1}
              </Text>
            </View>

            <Text style={{ color: theme.text, fontSize: fontSize.md, flex: 1, lineHeight: 21 }}>
              {choice.text}
            </Text>

            {!revealed && !disabled && (
              <View style={{ gap: 2 }}>
                <MoveButton
                  direction="up"
                  disabled={index === 0}
                  onPress={() => move(index, index - 1)}
                />
                <MoveButton
                  direction="down"
                  disabled={index === order.length - 1}
                  onPress={() => move(index, index + 1)}
                />
              </View>
            )}
          </View>
        );
      })}

      {!disabled && !revealed && response.length === 0 && (
        <Button label="Use this order" variant="secondary" onPress={() => onChange(order.slice())} />
      )}

      {revealed && (
        <View
          style={{
            backgroundColor: theme.surfaceAlt,
            borderRadius: radius.md,
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Text style={{ color: theme.success, fontSize: fontSize.sm, fontWeight: '700' }}>
            Correct order
          </Text>
          {question.correct.map((id, i) => (
            <Text key={id} style={{ color: theme.text, fontSize: fontSize.sm, lineHeight: 20 }}>
              {i + 1}. {byId.get(id)?.text ?? id}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function MoveButton({
  direction,
  disabled,
  onPress,
}: {
  direction: 'up' | 'down';
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${direction}`}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      hitSlop={6}
      style={{
        width: 32,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.sm,
        backgroundColor: theme.surfaceAlt,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons
        name={direction === 'up' ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={theme.text}
      />
    </Pressable>
  );
}
