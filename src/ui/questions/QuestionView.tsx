import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { answerLetters, hasDisputedAnswer, topCommunityVote } from '../../core/grading';
import type { Question, Response } from '../../core/types';
import { Badge } from '../components/common';
import { Exhibits, RichText } from '../components/RichText';
import { fontSize, radius, spacing, useTheme } from '../theme';
import { ChoiceQuestion } from './ChoiceQuestion';
import { DragDropQuestion } from './DragDropQuestion';
import { FillQuestion } from './FillQuestion';
import { HotspotQuestion } from './HotspotQuestion';
import { OrderingQuestion } from './OrderingQuestion';

/**
 * Renders one question: the stem, the type-appropriate answer control, and —
 * once revealed — the answer key, explanation and community vote.
 */

export function QuestionView({
  question,
  choiceOrder,
  response,
  onChange,
  revealed,
  disabled = false,
  showMeta = true,
}: {
  question: Question;
  choiceOrder: string[];
  response: Response;
  onChange: (next: Response) => void;
  revealed: boolean;
  disabled?: boolean;
  showMeta?: boolean;
}) {
  const theme = useTheme();

  const controlProps = { question, response, onChange, revealed, disabled };

  return (
    <View style={{ gap: spacing.lg }}>
      <Exhibits uris={question.exhibits} />
      <RichText size={fontSize.lg}>{question.stem}</RichText>

      {renderControl(question, choiceOrder, controlProps)}

      {revealed && showMeta && <AnswerPanel question={question} />}
    </View>
  );
}

interface ControlProps {
  question: Question;
  response: Response;
  onChange: (next: Response) => void;
  revealed: boolean;
  disabled: boolean;
}

function renderControl(question: Question, choiceOrder: string[], props: ControlProps) {
  switch (question.type) {
    case 'fill':
      return <FillQuestion {...props} />;
    case 'ordering':
      return <OrderingQuestion {...props} choiceOrder={choiceOrder} />;
    case 'dragdrop':
    case 'matching':
      return <DragDropQuestion {...props} />;
    case 'hotspot':
      return <HotspotQuestion {...props} />;
    case 'single':
    case 'multiple':
    case 'truefalse':
    default:
      return <ChoiceQuestion {...props} choiceOrder={choiceOrder} />;
  }
}

/** The post-answer panel: key, explanation, reference, community consensus. */
function AnswerPanel({ question }: { question: Question }) {
  const theme = useTheme();
  const vote = topCommunityVote(question);
  const disputed = hasDisputedAnswer(question);
  const letters = question.choices ? answerLetters(question, question.correct) : '';

  return (
    <View
      style={{
        backgroundColor: theme.surfaceAlt,
        borderRadius: radius.md,
        borderColor: theme.border,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      {letters.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="key" size={16} color={theme.success} />
          <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: '700' }}>
            Correct answer: {letters}
          </Text>
        </View>
      )}

      {vote && (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="people" size={16} color={theme.info} />
            <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
              Community vote: <Text style={{ color: theme.text, fontWeight: '700' }}>{vote.answer}</Text>{' '}
              ({vote.percent}%)
            </Text>
          </View>

          {/* Dump keys are frequently wrong; surfacing the disagreement is the
              single most useful signal these sites carry. */}
          {disputed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Badge label="DISPUTED" tone="warning" />
              <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, flex: 1 }}>
                The community disagrees with the listed key — verify against vendor documentation.
              </Text>
            </View>
          )}

          {(question.communityVotes?.length ?? 0) > 1 && (
            <VoteBars question={question} />
          )}
        </View>
      )}

      {question.explanation && (
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.8 }}>
            EXPLANATION
          </Text>
          <RichText size={fontSize.sm} muted>
            {question.explanation}
          </RichText>
        </View>
      )}

      {question.reference && (
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.8 }}>
            REFERENCE
          </Text>
          <Text style={{ color: theme.info, fontSize: fontSize.sm, lineHeight: 19 }}>
            {question.reference}
          </Text>
        </View>
      )}
    </View>
  );
}

function VoteBars({ question }: { question: Question }) {
  const theme = useTheme();
  const votes = question.communityVotes ?? [];
  const total = votes.reduce((sum, v) => sum + v.count, 0);
  if (total === 0) return null;

  return (
    <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
      {votes.map((v) => {
        const share = v.count / total;
        return (
          <View key={v.answer} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text
              style={{
                color: theme.text,
                fontSize: fontSize.xs,
                fontWeight: '700',
                width: 42,
              }}
            >
              {v.answer}
            </Text>
            <View
              style={{
                flex: 1,
                height: 6,
                backgroundColor: theme.bg,
                borderRadius: radius.pill,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${share * 100}%`,
                  height: '100%',
                  backgroundColor: theme.info,
                }}
              />
            </View>
            <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, width: 36, textAlign: 'right' }}>
              {Math.round(share * 100)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}
