import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REVISION_RESOURCES } from '../src/content/revisionResources';
import { Card } from '../src/ui/components/common';
import { fontSize, radius, spacing, useTheme } from '../src/ui/theme';

export default function ResourcesScreen() {
  const theme = useTheme(), insets = useSafeAreaInsets();
  const subjects = ['All', ...new Set(REVISION_RESOURCES.map((item) => item.subject).filter((s) => s !== 'All subjects'))];
  const [subject, setSubject] = useState('All');
  const shown = useMemo(() => REVISION_RESOURCES.filter((item) => subject === 'All' || item.subject === subject || item.subject === 'All subjects'), [subject]);
  return <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}>
    <View style={{ gap: spacing.xs }}><Text style={{ color: theme.text, fontSize: fontSize.xxl, fontWeight: '900' }}>Revision Hub</Text><Text style={{ color: theme.textMuted, fontSize: fontSize.md, lineHeight: 22 }}>Trusted videos, official past papers and focused revision for your subjects.</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{subjects.map((item) => <Pressable key={item} onPress={() => setSubject(item)} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: subject === item ? theme.primary : theme.surface }}><Text style={{ color: subject === item ? theme.primaryText : theme.textMuted, fontWeight: '700' }}>{item}</Text></Pressable>)}</ScrollView>
    <View style={{ gap: spacing.md }}>{shown.map((item) => <Pressable key={item.url} onPress={() => void Linking.openURL(item.url)}><Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}><View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt }}><Ionicons name={item.kind === 'Video' ? 'play' : item.kind === 'Past papers' ? 'document-text' : 'book'} size={22} color={theme.primary} /></View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>{item.provider} · {item.kind}</Text></View><Ionicons name="open-outline" size={19} color={theme.textFaint} /></Card></Pressable>)}</View>
    <Text style={{ color: theme.textFaint, fontSize: fontSize.xs, lineHeight: 18 }}>External resources open in your browser. GradeSpark is not affiliated with the listed exam boards or publishers.</Text>
  </ScrollView>;
}
