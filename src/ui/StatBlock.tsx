import { StyleSheet, View } from 'react-native';

import { Text } from './Text';

export type Stat = { label: string; value?: string | null; unit?: string };

export type StatBlockProps = {
  stats: Stat[];
  columns?: 1 | 2 | 3;
  /** Make the first stat large. */
  hero?: boolean;
};

export function StatBlock({ stats, columns = 3, hero = false }: StatBlockProps) {
  return (
    <View style={styles.grid} accessibilityRole="summary">
      {stats.map((s, i) => {
        const big = hero && i === 0;
        const missing = s.value == null || s.value === '';
        return (
          <View
            key={s.label}
            style={{ width: big ? '100%' : `${100 / columns}%`, paddingVertical: 6 }}
            accessible
            accessibilityLabel={`${s.label} ${missing ? 'not available' : `${s.value} ${s.unit ?? ''}`}`}>
            <Text variant="caption" color="textMuted" uppercase>
              {s.label}
            </Text>
            <Text variant={big ? 'xl' : 'title'} weight="700">
              {missing ? '–' : s.value}
              {!missing && s.unit ? (
                <Text variant={big ? 'title' : 'sm'} weight="600" color="textMuted">
                  {' '}
                  {s.unit}
                </Text>
              ) : null}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
