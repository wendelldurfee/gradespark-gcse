import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readinessScore, summariseAttempts } from '../src/core/stats';
import type { SessionState } from '../src/core/types';
import { getResumableSession, listAttempts } from '../src/db/repositories';
import { useLibraryStore } from '../src/store/libraryStore';
import { Button, Card, ErrorNotice, ProgressBar } from '../src/ui/components/common';
import { useTheme } from '../src/ui/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = { Mathematics: 'calculator-outline', 'English Language': 'book-outline', 'English Literature': 'library-outline', 'Combined Science': 'flask-outline', Biology: 'leaf-outline', Chemistry: 'beaker-outline', Physics: 'planet-outline', History: 'time-outline', Geography: 'earth-outline', 'Computer Science': 'code-slash-outline' };

export default function HomeScreen() {
  const theme = useTheme(), insets = useSafeAreaInsets(), { width } = useWindowDimensions();
  const { banks, loading, refresh } = useLibraryStore();
  const scroll = useRef<ScrollView>(null);
  const [routesY, setRoutesY] = useState(0);
  const [board, setBoard] = useState('AQA');
  const [readiness, setReadiness] = useState<Record<string, number>>({});
  const [resumable, setResumable] = useState<SessionState | null>(null);
  const [weekly, setWeekly] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      await refresh();
      const attempts = await listAttempts(undefined, 500);
      setResumable(await getResumableSession());
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
      weekStart.setHours(0, 0, 0, 0);
      setWeekly(attempts.filter(a => a.finishedAt >= weekStart.getTime()).length);
      const scores: Record<string, number> = {};
      for (const bank of useLibraryStore.getState().banks) scores[bank.id] = readinessScore(summariseAttempts(bank.id, attempts), bank.totalQuestions, bank.passingScore);
      setReadiness(scores);
      setError(null);
    } catch (err) { setError((err as Error).message); }
  }, [refresh]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const boards = ['All boards', ...new Set(banks.map(b => b.vendor).filter((v): v is string => Boolean(v)))];
  const shown = useMemo(() => banks.filter(b => board === 'All boards' || b.vendor === board), [banks, board]);
  const next = shown.find(b => b.title === 'Mathematics') ?? shown[0];
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const goMission = () => { if (next) router.push({ pathname: '/exam/[bankId]', params: { bankId: next.id, quick: 'true' } }); };
  return <View style={{ flex: 1, backgroundColor: theme.bg }}>
    <ScrollView ref={scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 22, paddingBottom: 28, gap: 24, width: '100%', maxWidth: 1100, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Ionicons name="planet-outline" color={theme.primary} size={27} /><Text style={{ color: theme.text, fontSize: 17, fontWeight: '900', letterSpacing: 1 }}>GRADESPARK</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings and accessibility" onPress={() => router.push('/settings')} style={{ backgroundColor: theme.surfaceAlt, padding: 11, borderRadius: 24 }}><Ionicons name="settings-outline" size={21} color={theme.textMuted} /></Pressable>
      </View>
      {error && <ErrorNotice message={error} />}
      <View style={{ gap: 10 }}><Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8 }}>YOUR GCSE ADVENTURE</Text><Text accessibilityRole="header" style={{ color: theme.text, fontSize: width >= 600 ? 48 : 36, lineHeight: width >= 600 ? 54 : 41, fontWeight: '900', letterSpacing: -1.3 }}>Next stop:{'\n'}“I get it.”</Text><Text style={{ color: theme.textMuted, fontSize: 15 }}>Build skills. Unlock your confidence.</Text></View>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 15, borderWidth: 0, borderRadius: 16 }}>
        <Ionicons name="shield-checkmark-outline" size={28} color={theme.primary} />
        <View style={{ flex: 1, gap: 8 }}><Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>Your weekly mission</Text><ProgressBar fraction={Math.min(weekly / 5, 1)} /><Text style={{ color: theme.textMuted, fontSize: 12 }}>{weekly >= 5 ? 'Weekly goal complete. Keep going at your own pace.' : `${weekly} of 5 sessions complete · Resets Monday`}</Text></View>
        <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 16 }}>{weekly}/5</Text>
      </Card>
      <Card style={{ borderRadius: 24, padding: 24, gap: 15 }}>
        <View style={{ alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: theme.successBg }}><Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{resumable ? 'MISSION IN PROGRESS' : 'YOUR NEXT MISSION'}</Text></View>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -.6 }}>{resumable ? 'Pick up your momentum.' : next?.title === 'Mathematics' ? 'Crack the\nalgebra code.' : `Explore ${next?.title ?? 'your subjects'}.`}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 14, lineHeight: 21 }}>{resumable ? `${resumable.items.filter(i => i.response.length > 0).length} of ${resumable.items.length} questions answered · Your progress is saved` : `${next?.vendor ?? ''} · 5 questions · Untimed practice`}</Text>
        {!resumable && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ borderRadius: 12, padding: 9, backgroundColor: theme.primary }}><Ionicons name="compass-outline" size={20} color={theme.primaryText} /></View><View style={{ height: 2, width: 22, backgroundColor: theme.border }} /><View style={{ borderRadius: 12, padding: 9, backgroundColor: theme.surfaceAlt }}><Ionicons name="flag-outline" size={20} color={theme.textMuted} /></View><Text style={{ flex: 1, color: theme.textMuted, fontSize: 12 }}>Practise → Understand</Text></View>}
        <Button label={resumable ? 'Continue mission' : 'Start mission'} icon="arrow-forward" disabled={!resumable && !next} onPress={() => resumable ? router.push(`/session/${resumable.id}`) : goMission()} />
      </Card>
      <View onLayout={event => setRoutesY(event.nativeEvent.layout.y)} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}><Text accessibilityRole="header" style={{ color: theme.text, fontWeight: '800', fontSize: 22, flex: 1 }}>Choose your route</Text><Text style={{ color: theme.textMuted, fontSize: 12 }}>{shown.length} practice sets</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>{boards.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: board === item }} onPress={() => setBoard(item)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: board === item ? theme.primary : theme.surface }}><Text style={{ color: board === item ? theme.primaryText : theme.textMuted, fontSize: 13, fontWeight: '700' }}>{item}</Text></Pressable>)}</ScrollView>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{shown.map(bank => <Pressable key={bank.id} accessibilityRole="button" accessibilityLabel={`${bank.title}, ${bank.vendor}, ${bank.totalQuestions} questions`} onPress={() => router.push(`/exam/${bank.id}`)} style={({ pressed }) => ({ width: `${100 / columns - (columns > 1 ? 2 : 0)}%`, opacity: pressed ? .8 : 1 })}>
          <Card style={{ gap: 14, borderWidth: 0, borderRadius: 18, height: '100%' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ padding: 10, borderRadius: 13, backgroundColor: theme.surfaceAlt }}><Ionicons name={ICONS[bank.title] ?? 'school-outline'} size={24} color={theme.primary} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{bank.title}</Text><Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>{bank.vendor} · {bank.totalQuestions} questions</Text></View><Ionicons name="chevron-forward" size={17} color={theme.textMuted} /></View><ProgressBar fraction={(readiness[bank.id] ?? 0) / 100} /><Text style={{ color: theme.textMuted, fontSize: 12 }}>{readiness[bank.id] ? `${readiness[bank.id]}% readiness · Keep building your skills` : 'Your next discovery starts here'}</Text></Card>
        </Pressable>)}</View>
      </View>
    </ScrollView>
    <View style={{ backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: 1, paddingBottom: Math.max(insets.bottom, 12), paddingTop: 10 }}><View style={{ flexDirection: 'row', maxWidth: 700, width: '100%', alignSelf: 'center' }}>{([
      ['compass-outline', 'Explore', () => scroll.current?.scrollTo({ y: 0, animated: true })],
      ['flag-outline', 'Missions', () => scroll.current?.scrollTo({ y: routesY, animated: true })],
      ['play-circle-outline', 'Revision', () => router.push('/resources')],
      ['stats-chart-outline', 'My skills', () => router.push('/stats')],
    ] as const).map(([icon, label, onPress], i) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 5 }}><Ionicons name={icon} color={i === 0 ? theme.primary : theme.textMuted} size={22} /><Text style={{ color: i === 0 ? theme.primary : theme.textMuted, fontSize: 11, fontWeight: '600' }}>{label}</Text></Pressable>)}</View></View>
  </View>;
}
