import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question, Response } from '../../core/types';
import { fontSize, radius, spacing, useTheme } from '../theme';

/**
 * Hotspot / "select the answer from each drop-down" questions — the layout
 * Microsoft exams use for statement tables and configuration blades.
 *
 * Each region becomes a labelled row of segmented options. Responses are stored
 * as `hotspotId=option` pairs.
 */
export function HotspotQuestion({
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
  const hotspots = question.hotspots ?? [];

  const selections = new Map<string, string>();
  for (const pair of response) {
    const idx = pair.indexOf('=');
    if (idx > 0) selections.set(pair.slice(0, idx), pair.slice(idx + 1));
  }

  const select = (hotspotId: string, option: string) => {
    if (disabled || revealed) return;
    const next = new Map(selections);
    next.set(hotspotId, option);
    // Emit in the question's own region order so responses stay comparable.
    onChange(
      hotspots
        .filter((h) => next.has(h.id))
        .map((h) => `${h.id}=${next.get(h.id)}`),
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
        Choose one option for each row.
      </Text>

      {hotspots.map((hotspot) => {
        const picked = selections.get(hotspot.id);
        const isRight = revealed && picked === hotspot.correct;

        return (
          <View key={hotspot.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ color: theme.text, fontSize: fontSize.md, flex: 1, lineHeight: 21 }}>
                {hotspot.label}
              </Text>
              {revealed && (
                <Ionicons
                  name={isRight ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={isRight ? theme.success : theme.danger}
                />
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}
            >
              {hotspot.options.map((option) => {
                const isSelected = picked === option;
                const isCorrectOption = revealed && option === hotspot.correct;

                const bg = isCorrectOption
                  ? theme.successBg
                  : revealed && isSelected
                    ? theme.dangerBg
                    : isSelected
                      ? theme.primary
                      : theme.surface;

                const border = isCorrectOption
                  ? theme.success
                  : revealed && isSelected
                    ? theme.danger
                    : isSelected
                      ? theme.primary
                      : theme.border;

                const fg = isSelected && !revealed ? theme.primaryText : theme.text;

                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected, disabled: disabled || revealed }}
                    accessibilityLabel={`${hotspot.label}: ${option}`}
                    onPress={() => select(hotspot.id, option)}
                    style={{
                      backgroundColor: bg,
                      borderColor: border,
                      borderWidth: isSelected || isCorrectOption ? 1.5 : StyleSheet.hairlineWidth,
                      borderRadius: radius.md,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      minHeight: 40,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: fg, fontSize: fontSize.sm, fontWeight: isSelected ? '700' : '500' }}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}
