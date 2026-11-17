import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { Text } from './Text';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body?: string;
  /** Up to two Buttons, stacked. */
  actions?: ReactNode;
};

export function EmptyState({ icon: Icon, title, body, actions }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Icon size={26} color={colors.text} strokeWidth={2} />
      </View>
      <Text variant="title" weight="600" align="center" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="sm" color="textMuted" align="center" style={{ maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 32 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actions: { marginTop: 12, gap: 10, alignSelf: 'stretch', maxWidth: 320, width: '100%' },
});
