import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { gradeQuestion, isAnswered } from '../../src/core/grading';
import { progress, remainingSec } from '../../src/core/session';
import type { Response } from '../../src/core/types';
import { useExamStore } from '../../src/store/examStore';
import { Button, ErrorNotice, Loading } from '../../src/ui/components/common';
import { alertDialog, confirm } from '../../src/ui/components/DialogHost';
import { ExamHeader } from '../../src/ui/components/ExamHeader';
import { NavigatorSheet } from '../../src/ui/components/NavigatorSheet';
import { QuestionView } from '../../src/ui/questions/QuestionView';
import { fontSize, radius, spacing, useTheme } from '../../src/ui/theme';

/**
 * The exam runner. Owns the one-second tick that drives the countdown and the
 * per-question timing, and blocks accidental exits while an attempt is live.
 */
export default function SessionScreen() {
  const theme = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const { session, questions, loading, error, resume, dispatch, answer, toggleMark, submit, persist, saveError } =
    useExamStore();

  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<ScrollView>(null);
  const autoSubmitted = useRef(false);
  const finishing = useRef(false);

  // Nobody wants the screen dimming mid-question. Deactivation waits for the
  // activation promise so a fast exit can't hit "wake lock has not activated yet".
  useEffect(() => {
    const tag = 'exam-session';
    const activation = activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      void activation.then(() => deactivateKeepAwake(tag).catch(() => {}));
    };
  }, []);

  useEffect(() => {
    autoSubmitted.current = false;
    void resume(sessionId);
  }, [sessionId, resume]);

  const active = session?.status === 'active';

  // One tick per second: bills time to the current question and, for a timed
  // attempt, moves the countdown. Untimed attempts still tick so per-question
  // timings land in the score report.
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      dispatch({ type: 'TICK' });
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [active, dispatch]);

  const finish = useCallback(
    async (reason: 'manual' | 'expired') => {
      if (finishing.current) return;
      finishing.current = true;
      autoSubmitted.current = true;
      setSubmitting(true);
      try {
        const result = await submit();
        if (result) {
          void Haptics.notificationAsync(
            result.passed
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning,
          ).catch(() => {});
          if (reason === 'expired') {
            await alertDialog('Time expired', 'Your exam has been submitted automatically.');
          }
          router.replace(`/results/${result.id}`);
        }
      } catch (err) {
        await alertDialog('Could not submit', (err as Error).message);
      } finally {
        finishing.current = false;
        setSubmitting(false);
      }
    },
    [submit],
  );

  // The reducer flips status to 'submitted' the moment the clock hits zero;
  // this turns that into navigation exactly once.
  useEffect(() => {
    if (session?.status === 'submitted' && !autoSubmitted.current && !submitting) {
      autoSubmitted.current = true;
      void finish(remainingSec(session) === 0 ? 'expired' : 'manual');
    }
  }, [session?.status, submitting, finish]);

  const confirmExit = useCallback(() => {
    void (async () => {
      const ok = await confirm({
        title: 'Leave exam?',
        message: 'Your progress will be saved before leaving. You can resume from the library.',
        confirmLabel: 'Leave',
        cancelLabel: 'Stay',
        destructive: true,
      });
      if (ok) {
        try {
          await persist();
          router.replace('/');
        } catch (err) {
          await alertDialog('Could not save progress', (err as Error).message);
        }
      }
    })();
    return true;
  }, [persist]);

  // Every exit must flush, including a paused attempt or a failed submission.
  useEffect(() => {
    if (!session) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', confirmExit);
    return () => sub.remove();
  }, [session?.id, confirmExit]);

  const item = session?.items[session.currentIndex];
  const question = item ? questions.get(item.questionId) : undefined;

  const stats = useMemo(
    () => (session ? progress(session, questions) : { total: 0, answered: 0, fraction: 0, marked: 0, unanswered: 0 }),
    [session, questions],
  );

  if (loading && !session) return <Loading label="Loading attempt…" />;

  if (error || !session) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg, gap: spacing.lg }}>
        <ErrorNotice message={error ?? 'That attempt could not be loaded.'} />
        <Button label="Back to library" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  if (!item || !question) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg, gap: spacing.lg }}>
        <ErrorNotice message="This question is missing from the bank. It may have been re-imported." />
        <Button label="Back to library" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const left = remainingSec(session, now);
  const answered = isAnswered(question, item.response);
  const outcome = item.revealed ? gradeQuestion(question, item.response, {
    partialCredit: session.config.partialCredit,
  }) : null;

  const isLast = session.currentIndex === session.items.length - 1;
  const locked = item.revealed || session.status !== 'active';

  const onAnswer = (response: Response) => {
    answer(session.currentIndex, response);
    void Haptics.selectionAsync().catch(() => {});
  };

  const goTo = (index: number) => {
    dispatch({ type: 'GOTO', index });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const confirmSubmit = () => {
    const unanswered = stats.unanswered;
    void (async () => {
      const ok = await confirm({
        title: 'Submit exam?',
        message:
          unanswered > 0
            ? `${unanswered} question${unanswered === 1 ? '' : 's'} still unanswered. Unanswered questions are marked incorrect.`
            : 'All questions answered. Ready to see your score?',
        confirmLabel: 'Submit',
        cancelLabel: 'Keep working',
        destructive: unanswered > 0,
      });
      if (ok) await finish('manual');
    })();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave exam"
          onPress={confirmExit}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>Exit</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, fontWeight: '700' }}>
          {session.config.mode.toUpperCase()} MODE
        </Text>
      </View>

      {saveError && (
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <ErrorNotice message={saveError} />
          <Button
            label={session.status === 'submitted' ? 'Retry submission' : 'Retry save'}
            loading={submitting}
            onPress={() => {
              if (session.status === 'submitted') void finish('manual');
              else void persist().catch(() => {});
            }}
          />
        </View>
      )}

      <ExamHeader
        index={session.currentIndex}
        total={session.items.length}
        answered={stats.answered}
        remainingSec={left}
        paused={session.status === 'paused'}
        marked={item.marked}
        onTogglePause={() =>
          dispatch({ type: session.status === 'paused' ? 'RESUME' : 'PAUSE' })
        }
        onToggleMark={() => toggleMark(session.currentIndex)}
        onOpenNavigator={() => setNavigatorOpen(true)}
      />

      {session.status === 'paused' ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.lg,
            padding: spacing.xl,
          }}
        >
          <Ionicons name="pause-circle" size={64} color={theme.textFaint} />
          <Text style={{ color: theme.text, fontSize: fontSize.xl, fontWeight: '700' }}>Paused</Text>
          <Text style={{ color: theme.textMuted, fontSize: fontSize.md, textAlign: 'center' }}>
            The clock is stopped and the question is hidden.
          </Text>
          <Button label="Resume" icon="play" onPress={() => dispatch({ type: 'RESUME' })} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, fontWeight: '700' }}>
              QUESTION {session.currentIndex + 1}
              {question.number ? ` · #${question.number} IN BANK` : ''}
            </Text>
            {outcome && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  backgroundColor: outcome.correct ? theme.successBg : theme.dangerBg,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: radius.sm,
                }}
              >
                <Ionicons
                  name={outcome.correct ? 'checkmark-circle' : 'close-circle'}
                  size={13}
                  color={outcome.correct ? theme.success : theme.danger}
                />
                <Text
                  style={{
                    color: outcome.correct ? theme.success : theme.danger,
                    fontSize: fontSize.xs,
                    fontWeight: '700',
                  }}
                >
                  {outcome.correct ? 'CORRECT' : 'INCORRECT'}
                </Text>
              </View>
            )}
          </View>

          <QuestionView
            question={question}
            choiceOrder={item.choiceOrder}
            response={item.response}
            onChange={onAnswer}
            revealed={item.revealed}
            disabled={locked}
          />
        </ScrollView>
      )}

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.lg,
          paddingTop: spacing.md,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          backgroundColor: theme.surface,
        }}
      >
        <Button
          label="Previous"
          icon="chevron-back"
          variant="secondary"
          disabled={session.currentIndex === 0}
          onPress={() => goTo(session.currentIndex - 1)}
          style={{ flex: 1 }}
        />

        {/* In practice mode the answer is checked before advancing, so the
            primary action changes to "Check" until the answer is revealed. */}
        {session.status === 'active' && session.config.instantFeedback && !item.revealed && answered ? (
          <Button
            label="Check answer"
            icon="eye"
            onPress={() => dispatch({ type: 'REVEAL', index: session.currentIndex })}
            style={{ flex: 1.4 }}
          />
        ) : isLast ? (
          <Button
            label="Submit"
            icon="checkmark-done"
            loading={submitting}
            onPress={confirmSubmit}
            style={{ flex: 1.4 }}
          />
        ) : (
          <Button
            label="Next"
            icon="chevron-forward"
            disabled={!session.config.allowSkip && !answered}
            onPress={() => goTo(session.currentIndex + 1)}
            style={{ flex: 1.4 }}
          />
        )}
      </View>

      <NavigatorSheet
        visible={navigatorOpen}
        items={session.items}
        questions={questions}
        currentIndex={session.currentIndex}
        onSelect={goTo}
        onClose={() => setNavigatorOpen(false)}
        onSubmit={() => {
          setNavigatorOpen(false);
          confirmSubmit();
        }}
      />
    </SafeAreaView>
  );
}
