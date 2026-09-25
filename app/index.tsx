import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readinessScore, summariseAttempts } from '../src/core/stats';
import type { SessionState } from '../src/core/types';
import { getResumableSession, listAttempts } from '../src/db/repositories';
import { useLibraryStore } from '../src/store/libraryStore';
import { Badge, Button, Card, ProgressBar } from '../src/ui/components/common';
import { fontSize, radius, spacing, useTheme } from '../src/ui/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = { Mathematics: 'calculator', 'English Language': 'book', 'English Literature': 'library', 'Combined Science': 'flask', Biology: 'leaf', Chemistry: 'beaker', Physics: 'planet', History: 'time', Geography: 'earth', 'Computer Science': 'code-slash' };
const COLOURS: Record<string, string> = { Mathematics: '#7C3AED', 'English Language': '#EC4899', 'English Literature': '#DB2777', 'Combined Science': '#10B981', Biology: '#16A34A', Chemistry: '#0891B2', Physics: '#4F46E5', History: '#F59E0B', Geography: '#06B6D4', 'Computer Science': '#3B82F6' };

export default function HomeScreen() {
  const theme = useTheme(), insets = useSafeAreaInsets();
  const { banks, loading, refresh } = useLibraryStore();
  const [board, setBoard] = useState('All boards');
  const [readiness, setReadiness] = useState<Record<string, number>>({});
  const [resumable, setResumable] = useState<SessionState | null>(null);
  const load = useCallback(async () => {
    await refresh();
    const attempts = await listAttempts(undefined, 500);
    setResumable(await getResumableSession());
    const scores: Record<string, number> = {};
    for (const bank of useLibraryStore.getState().banks) scores[bank.id] = readinessScore(summariseAttempts(bank.id, attempts), bank.totalQuestions, bank.passingScore);
    setReadiness(scores);
  }, [refresh]);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const boards = ['All boards', ...new Set(banks.map((bank) => bank.vendor).filter((value): value is string => Boolean(value)))];
  const shown = useMemo(() => banks.filter((bank) => board === 'All boards' || bank.vendor === board), [banks, board]);
  return <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}>
    <View style={{ borderRadius: 28, overflow: 'hidden', backgroundColor: '#6D28D9', padding: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: '#DDD6FE', fontSize: fontSize.sm, fontWeight: '800', letterSpacing: 1.4 }}>GRADESPARK GCSE</Text><Text style={{ color: '#FFF', fontSize: 32, lineHeight: 38, fontWeight: '900', marginTop: 6 }}>Small sessions. Big results.</Text></View><View style={{ width: 74, height: 74, borderRadius: 24, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="flash" size={38} color="#FDE047" /></View></View>
      <Text style={{ color: '#EDE9FE', fontSize: fontSize.md, lineHeight: 22 }}>Build confidence with quick practice, instant worked answers and focused revision.</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}><Button label="Revision Hub" icon="sparkles" onPress={() => router.push('/resources')} style={{ flex: 1 }} /><Button label="My progress" icon="stats-chart" variant="secondary" onPress={() => router.push('/stats')} style={{ flex: 1 }} /></View>
    </View>
    {resumable && <Card style={{ gap: spacing.sm, borderColor: theme.primary }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><Ionicons name="play-circle" size={24} color={theme.primary} /><Text style={{ color: theme.text, fontWeight: '800', fontSize: fontSize.lg, flex: 1 }}>Pick up where you left off</Text></View><Text style={{ color: theme.textMuted }}>{resumable.currentIndex + 1} of {resumable.items.length} questions complete</Text><Button label="Continue practice" icon="arrow-forward" onPress={() => router.push(`/session/${resumable.id}`)} /></Card>}
    <View style={{ gap: spacing.md }}><View style={{ flexDirection: 'row', alignItems: 'baseline' }}><Text style={{ color: theme.text, fontSize: fontSize.xl, fontWeight: '900', flex: 1 }}>Choose your course</Text><Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>{shown.length} sets</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{boards.map((item) => <Pressable key={item} onPress={() => setBoard(item)} style={{ paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: board === item ? theme.primary : theme.surface }}><Text style={{ color: board === item ? theme.primaryText : theme.textMuted, fontWeight: '800' }}>{item}</Text></Pressable>)}</ScrollView>
      <View style={{ gap: spacing.md }}>{shown.map((bank) => { const colour = COLOURS[bank.title] ?? theme.primary; const score = readiness[bank.id] ?? 0; return <Pressable key={bank.id} onPress={() => router.push(`/exam/${bank.id}`)} style={({ pressed }) => ({ opacity: pressed ? .82 : 1 })}><Card style={{ gap: spacing.md, borderRadius: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}><View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: `${colour}20`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ICONS[bank.title] ?? 'school'} size={27} color={colour} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.text, fontSize: fontSize.lg, fontWeight: '900' }}>{bank.title}</Text><Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>{bank.vendor} · {bank.totalQuestions} questions</Text></View><Ionicons name="chevron-forward" size={20} color={theme.textFaint} /></View><View style={{ gap: 6 }}><View style={{ flexDirection: 'row' }}><Text style={{ color: theme.textMuted, fontSize: fontSize.xs, flex: 1 }}>Readiness</Text><Badge label={`${score}%`} tone={score >= 70 ? 'success' : score >= 35 ? 'warning' : 'info'} /></View><ProgressBar fraction={score / 100} color={colour} /></View></Card></Pressable>; })}</View>
    </View>
    <Pressable onPress={() => router.push('/settings')} style={{ flexDirection: 'row', padding: spacing.lg, borderRadius: radius.lg, backgroundColor: theme.surface, alignItems: 'center', gap: spacing.md }}><Ionicons name="settings-outline" size={21} color={theme.textMuted} /><Text style={{ color: theme.textMuted, fontWeight: '700', flex: 1 }}>Settings and accessibility</Text><Ionicons name="chevron-forward" size={18} color={theme.textFaint} /></Pressable>
  </ScrollView>;
}
