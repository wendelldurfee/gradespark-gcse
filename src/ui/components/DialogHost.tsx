import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { create } from 'zustand';
import { fontSize, radius, spacing, useTheme } from '../theme';

/**
 * A cross-platform confirmation dialog.
 *
 * `Alert.alert` is native-only — React Native Web stubs it out, so any flow
 * gated behind a confirmation silently does nothing there. This renders a real
 * modal instead, works identically on Android, iOS and web, and exposes a
 * promise-based API so callers can simply `await confirm(...)`.
 *
 * Mount `<DialogHost />` once, near the root.
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Informational dialog with a single dismiss button. */
  alertOnly?: boolean;
}

interface DialogState {
  options: ConfirmOptions | null;
  resolve: ((confirmed: boolean) => void) | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  close: (confirmed: boolean) => void;
}

const useDialogStore = create<DialogState>((set, get) => ({
  options: null,
  resolve: null,

  open: (options) =>
    new Promise<boolean>((resolve) => {
      // A second dialog replaces the first; settle the old promise so no caller
      // is left awaiting forever.
      get().resolve?.(false);
      set({ options, resolve });
    }),

  close: (confirmed) => {
    const { resolve } = get();
    set({ options: null, resolve: null });
    resolve?.(confirmed);
  },
}));

/** Resolves true when confirmed, false when cancelled or dismissed. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useDialogStore.getState().open(options);
}

/** Informational dialog with a single button. Resolves once dismissed. */
export function alertDialog(title: string, message?: string): Promise<boolean> {
  return confirm({ title, message, alertOnly: true, confirmLabel: 'OK' });
}

export function DialogHost() {
  const theme = useTheme();
  const options = useDialogStore((s) => s.options);
  const close = useDialogStore((s) => s.close);

  if (!options) return null;

  const confirmColor = options.destructive ? theme.danger : theme.primary;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => close(false)}
      accessibilityViewIsModal
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#0009',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: theme.surface,
            borderRadius: radius.lg,
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          <Text style={{ color: theme.text, fontSize: fontSize.lg, fontWeight: '700' }}>
            {options.title}
          </Text>

          {options.message && (
            <Text style={{ color: theme.textMuted, fontSize: fontSize.md, lineHeight: 22 }}>
              {options.message}
            </Text>
          )}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: spacing.sm,
              marginTop: spacing.sm,
            }}
          >
            {!options.alertOnly && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={options.cancelLabel ?? 'Cancel'}
                onPress={() => close(false)}
                style={({ pressed }) => ({
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: theme.textMuted, fontSize: fontSize.md, fontWeight: '600' }}>
                  {options.cancelLabel ?? 'Cancel'}
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={options.confirmLabel ?? 'Confirm'}
              onPress={() => close(true)}
              style={({ pressed }) => ({
                backgroundColor: confirmColor,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.md,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: theme.primaryText, fontSize: fontSize.md, fontWeight: '700' }}>
                {options.confirmLabel ?? 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
