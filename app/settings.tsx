import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
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
          label="Restore sample banks"
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
          A VCE-style exam simulator. It ships with a small set of originally written sample
          questions and imports your own question banks.
        </Text>
        <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, lineHeight: 18 }}>
          Exam content you import is your responsibility. Redistributing copyrighted or leaked
          vendor exam material generally breaches the certification agreements you signed and the
          copyright of the exam owner. Use material you are licensed to use, and always verify
          answers against official vendor documentation — community answer keys are frequently
          wrong.
        </Text>
        <Button
          label="Certification exam policies"
          icon="open-outline"
          variant="ghost"
          onPress={() => {
            void Linking.openURL('https://www.certguard.com/whatiscertguard.asp').catch(() => {});
          }}
        />
      </Card>
    </ScrollView>
  );
}
