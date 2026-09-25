import React, { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDatabase } from '../src/db/database';
import { useExamStore } from '../src/store/examStore';
import { useLibraryStore } from '../src/store/libraryStore';
import { Loading } from '../src/ui/components/common';
import { DialogHost } from '../src/ui/components/DialogHost';
import { fontSize, spacing, useTheme } from '../src/ui/theme';

/**
 * App shell: opens the database, seeds the bundled sample banks on first launch,
 * then hands over to the router.
 */
export default function RootLayout() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const seedSamples = useLibraryStore((s) => s.seedSamples);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await getDatabase();
        await seedSamples();
      } catch (err) {
        if (!cancelled) setFatal((err as Error).message);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seedSamples]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      const exam = useExamStore.getState();
      if (state === 'active') exam.dispatch({ type: 'TICK' });
      else void exam.persist().catch(() => {});
    });
    return () => listener.remove();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <Loading label="Getting your revision ready…" />
      </View>
    );
  }

  if (fatal) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
          gap: spacing.md,
        }}
      >
        <Text style={{ color: theme.danger, fontSize: fontSize.lg, fontWeight: '700' }}>
          Could not start
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.md, textAlign: 'center' }}>
          {fatal}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: theme.bg },
            headerShadowVisible: false,
          }}
        >
          {/* The home screen renders its own banner hero instead of the plain header. */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="import" options={{ title: 'Add Practice Set' }} />
          <Stack.Screen name="resources" options={{ title: 'Revision Hub' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="stats" options={{ title: 'Study Statistics' }} />
          <Stack.Screen name="exam/[bankId]" options={{ title: 'Choose Practice Mode' }} />
          {/* The runner owns its own chrome and must not be swiped away mid-exam. */}
          <Stack.Screen
            name="session/[sessionId]"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="results/[attemptId]"
            options={{ title: 'Score Report', headerBackVisible: false }}
          />
          <Stack.Screen name="results/review/[attemptId]" options={{ title: 'Review Answers' }} />
        </Stack>
        <DialogHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
