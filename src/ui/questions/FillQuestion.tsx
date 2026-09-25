import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { Question, Response } from '../../core/types';
import { gradeQuestion } from '../../core/grading';
import { fontSize, monoFont, radius, spacing, useTheme } from '../theme';

/** Free-text answer, matched case- and whitespace-insensitively. */
export function FillQuestion({
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
  const value = response[0] ?? '';
  const outcome = revealed ? gradeQuestion(question, response) : null;

  const borderColor = outcome
    ? outcome.correct
      ? theme.success
      : theme.danger
    : theme.border;

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        value={value}
        onChangeText={(text) => onChange([text])}
        editable={!disabled && !revealed}
        placeholder="Type your answer"
        placeholderTextColor={theme.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        accessibilityLabel="Answer input"
        style={{
          color: theme.text,
          backgroundColor: theme.surface,
          borderColor,
          borderWidth: outcome ? 1.5 : StyleSheet.hairlineWidth,
          borderRadius: radius.md,
          padding: spacing.md,
          fontSize: fontSize.md,
          fontFamily: monoFont,
          minHeight: 52,
        }}
      />

      {revealed && (
        <View
          style={{
            backgroundColor: outcome?.correct ? theme.successBg : theme.dangerBg,
            borderRadius: radius.md,
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Text
            style={{
              color: outcome?.correct ? theme.success : theme.danger,
              fontSize: fontSize.sm,
              fontWeight: '700',
            }}
          >
            {outcome?.correct ? 'Correct' : 'Incorrect'}
          </Text>
          <Text style={{ color: theme.text, fontSize: fontSize.sm, lineHeight: 20 }}>
            Accepted {question.correct.length === 1 ? 'answer' : 'answers'}:{' '}
            {question.correct.join('  •  ')}
          </Text>
        </View>
      )}
    </View>
  );
}
