import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExamStore } from '../src/store/examStore';
import { resetDatabase } from '../src/db/database';
import { useLibraryStore } from '../src/store/libraryStore';
import { Button, Card, SectionTitle, StatRow } from '../src/ui/components/common';
import { alertDialog, confirm } from '../src/ui/components/DialogHost';
import { fontSize, spacing, useTheme } from '../src/ui/theme';
import appConfig from '../app.json';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { banks, seedSamples, refresh } = useLibraryStore();
  const [busy, setBusy] = useState(false);

  const totalQuestions = banks.reduce((sum, b) => sum + b.totalQuestions, 0);

  const confirmReset = async () => {
    const ok = await confirm({
      title: 'Erase all data?',
      message:
        'Every imported bank, attempt and note will be deleted from this device. This cannot be undone.',
      confirmLabel: 'Erase everything',
      destructive: true,
    });
    if (!ok) return;

    setBusy(true);
    try {
      useExamStore.getState().clear();
      await resetDatabase();
      await seedSamples();
      await refresh();
      router.replace('/');
    } catch (err) {
      await alertDialog('Could not reset', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        width: '100%', maxWidth: 1000, alignSelf: 'center',
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <Card>
        <SectionTitle>Library</SectionTitle>
        <StatRow label="Installed banks" value={`${banks.length}`} />
        <StatRow label="Total questions" value={`${totalQuestions}`} />
        <StatRow label="Storage" value="On this device (SQLite)" />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SectionTitle>Data</SectionTitle>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          Everything lives locally: banks, attempts, notes and flags. Nothing is sent to a server,
          and the app works fully offline.
        </Text>
        <Button
          label="Refresh practice library"
          icon="refresh-outline"
          variant="secondary"
          onPress={() => void seedSamples().then(refresh)}
        />
        <Button
          label="Erase all data"
          icon="trash-outline"
          variant="danger"
          loading={busy}
          onPress={() => void confirmReset()}
        />
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <SectionTitle>About</SectionTitle>
        <StatRow label="Version" value={appConfig.expo.version} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          GradeSpark GCSE helps you build confidence with subject missions, worked answers,
          revision videos and official exam-board resources.
        </Text>
        <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, lineHeight: 18 }}>
          Practice and progress are saved on this device. Linked revision videos and past papers
          need an internet connection. Readiness is a practice guide, not a predicted GCSE grade.
        </Text>
      </Card>
    </ScrollView>
  );
}
