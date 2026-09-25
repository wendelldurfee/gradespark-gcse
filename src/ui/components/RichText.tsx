import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { fontSize, monoFont, radius, spacing, useTheme } from '../theme';

/**
 * Renders a question stem or explanation.
 *
 * Dumps routinely contain CLI output, config snippets and PowerShell, which are
 * unreadable when reflowed, so fenced blocks are kept monospaced and
 * horizontally intact. Everything else is plain text — deliberately not a full
 * Markdown engine.
 */

type Segment =
  | { kind: 'text'; content: string }
  | { kind: 'code'; content: string };

const FENCE = /```/g;

function parse(source: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  FENCE.lastIndex = 0;

  for (;;) {
    const open = source.indexOf('```', cursor);
    if (open === -1) break;
    const close = source.indexOf('```', open + 3);
    if (close === -1) break;

    if (open > cursor) segments.push({ kind: 'text', content: source.slice(cursor, open) });

    // Drop an optional language tag on the opening fence.
    const body = source.slice(open + 3, close).replace(/^[a-zA-Z0-9+#-]*\n/, '');
    segments.push({ kind: 'code', content: body.replace(/\n$/, '') });
    cursor = close + 3;
  }

  if (cursor < source.length) segments.push({ kind: 'text', content: source.slice(cursor) });
  return segments.filter((s) => s.content.trim().length > 0);
}

export function RichText({
  children,
  size = fontSize.md,
  muted = false,
}: {
  children: string;
  size?: number;
  muted?: boolean;
}) {
  const theme = useTheme();
  const segments = useMemo(() => parse(children), [children]);

  if (segments.length === 0) return null;

  return (
    <View style={{ gap: spacing.md }}>
      {segments.map((segment, i) =>
        segment.kind === 'code' ? (
          <View
            key={i}
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: radius.sm,
              padding: spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontFamily: monoFont,
                fontSize: size - 2,
                lineHeight: (size - 2) * 1.45,
              }}
            >
              {segment.content}
            </Text>
          </View>
        ) : (
          <Text
            key={i}
            style={{
              color: muted ? theme.textMuted : theme.text,
              fontSize: size,
              lineHeight: size * 1.5,
            }}
          >
            {segment.content.trim()}
          </Text>
        ),
      )}
    </View>
  );
}

/** Exhibit images attached to a question (network diagrams, portal screenshots). */
export function Exhibits({ uris }: { uris?: string[] }) {
  const theme = useTheme();
  if (!uris || uris.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      {uris.map((uri) => (
        <Image
          key={uri}
          source={{ uri }}
          accessibilityLabel="Question exhibit"
          resizeMode="contain"
          style={{
            width: '100%',
            height: 200,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border,
            backgroundColor: theme.surfaceAlt,
          }}
        />
      ))}
    </View>
  );
}
