import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isAnswered } from '../../core/grading';
import type { Question, SessionItem } from '../../core/types';
import { fontSize, radius, spacing, useTheme } from '../theme';
import { Button } from './common';

/**
 * The question navigator — the grid of numbered tiles from the desktop players.
 * Each tile is colour-coded so an unanswered or flagged question is obvious at a
 * glance before submitting.
 */
export function NavigatorSheet({
  visible,
  items,
  questions,
  currentIndex,
  onSelect,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  items: SessionItem[];
  questions: Map<string, Question>;
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();

  const answeredCount = items.filter((item) => {
    const question = questions.get(item.questionId);
    return question ? isAnswered(question, item.response) : false;
  }).length;
  const markedCount = items.filter((i) => i.marked).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close navigator" style={{ flex: 1 }} onPress={onClose} />

        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xl,
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
            }}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.lg, fontWeight: '700', flex: 1 }}>
              Questions
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.lg,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
            }}
          >
            <Legend color={theme.primary} label={`Answered ${answeredCount}`} />
            <Legend color={theme.border} label={`Unanswered ${items.length - answeredCount}`} />
            <Legend color={theme.warning} label={`Flagged ${markedCount}`} />
          </View>

          <ScrollView
            contentContainerStyle={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.lg,
            }}
          >
            {items.map((item, index) => {
              const question = questions.get(item.questionId);
              const done = question ? isAnswered(question, item.response) : false;
              const isCurrent = index === currentIndex;

              return (
                <Pressable
                  key={item.questionId}
                  accessibilityRole="button"
                  accessibilityLabel={`Question ${index + 1}${done ? ', answered' : ', unanswered'}${
                    item.marked ? ', flagged' : ''
                  }`}
                  onPress={() => {
                    onSelect(index);
                    onClose();
                  }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? theme.primary : theme.surfaceAlt,
                    borderColor: isCurrent ? theme.text : item.marked ? theme.warning : 'transparent',
                    borderWidth: isCurrent || item.marked ? 2 : 0,
                  }}
                >
                  <Text
                    style={{
                      color: done ? theme.primaryText : theme.textMuted,
                      fontSize: fontSize.sm,
                      fontWeight: '700',
                    }}
                  >
                    {index + 1}
                  </Text>
                  {item.marked && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 3,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.warning,
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              borderTopColor: theme.border,
              borderTopWidth: StyleSheet.hairlineWidth,
            }}
          >
            <Button label="Submit exam" icon="checkmark-done" onPress={onSubmit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>{label}</Text>
    </View>
  );
}
