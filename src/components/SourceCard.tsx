import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { Text } from '@/ui';

/** One data source in Settings: name, status line, and its actions. */
export function SourceCard({
  icon: Icon,
  name,
  status,
  note,
  children,
}: {
  icon: LucideIcon;
  name: string;
  status: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.card} accessible={false}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon size={20} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="base" weight="600">
            {name}
          </Text>
          <Text variant="footnote" color="textMuted">
            {status}
          </Text>
        </View>
      </View>
      {note ? (
        <Text variant="footnote" color="textMuted">
          {note}
        </Text>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
