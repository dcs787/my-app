import {
  AtSign,
  Bike,
  ChevronDown,
  Copy,
  Download,
  Footprints,
  Layers,
  MessageCircle,
  Palette,
  Plus,
  Share,
  Type,
  X,
} from '@/ui/icons';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, space, tokens, type ColorRole, type TypeRole } from '@/theme';
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  ListRow,
  SegmentedTabs,
  Sheet,
  StatBlock,
  Swatches,
  TemplateTile,
  Text,
  TextField,
  useToast,
} from '@/ui';

/** Living style guide: every token and primitive in its states. Dev only. */
export default function DesignScreen() {
  const toast = useToast();
  const [tab, setTab] = useState<'activity' | 'totals' | 'gear'>('activity');
  const [filter, setFilter] = useState<'week' | 'month' | 'year'>('week');
  const [units, setUnits] = useState<'mi' | 'km'>('mi');
  const [colour, setColour] = useState('#FFFFFF');
  const [sheet, setSheet] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.page} testID="design-page">
      <Section title="Colour roles">
        <View style={styles.swatchGrid}>
          {(Object.keys(colors) as ColorRole[]).map((k) => (
            <View key={k} style={styles.swatchCell}>
              <View style={[styles.swatch, { backgroundColor: colors[k] }]} />
              <Text variant="caption" weight="600">
                {k}
              </Text>
              <Text variant="caption" color="textMuted">
                {colors[k]}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Type">
        {(Object.keys(tokens.type) as TypeRole[]).map((r) => (
          <Text key={r} variant={r} numberOfLines={1}>
            {r} {tokens.type[r].fontSize}/{tokens.type[r].lineHeight}: 6.2 mi in 48:10
          </Text>
        ))}
      </Section>

      <Section title="Spacing and radius">
        <View style={styles.row}>
          {space.slice(1).map((s) => (
            <View key={s} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: s, height: s, backgroundColor: colors.textMuted }} />
              <Text variant="caption" color="textMuted">
                {s}
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          {Object.entries(radius).map(([k, r]) => (
            <View key={k} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 48, height: 48, borderRadius: Math.min(r, 24), backgroundColor: colors.surfaceRaised }} />
              <Text variant="caption" color="textMuted">
                {k}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Button">
        <View style={styles.wrap}>
          <Button label="Share to Stories" icon={Share} onPress={() => toast('Primary pressed')} />
          <Button label="Save" icon={Download} variant="secondary" />
          <Button label="Skip" variant="ghost" />
          <Button label="Delete" variant="danger" />
        </View>
        <View style={styles.wrap}>
          <Button label="Small" size="sm" />
          <Button label="Medium" size="md" />
          <Button label="Large" size="lg" />
        </View>
        <View style={styles.wrap}>
          <Button label="Exporting" loading />
          <Button label="Disabled" disabled />
        </View>
        <Button label="Full width" fullWidth variant="secondary" />
      </Section>

      <Section title="IconButton">
        <View style={[styles.wrap, styles.photoBg]}>
          <IconButton icon={X} label="Close" />
          <IconButton icon={ChevronDown} label="Collapse" size={36} />
          <IconButton icon={Layers} label="Layers" selected />
          <IconButton icon={Type} label="Text" variant="solid" />
          <IconButton icon={Palette} label="Colour" variant="plain" />
          <IconButton icon={Plus} label="Add" disabled />
        </View>
      </Section>

      <Section title="Chip">
        <View style={styles.wrap}>
          <Chip label="comment" icon={MessageCircle} onPress={() => toast('Chip pressed')} />
          <Chip label="text" icon={Type} />
          <Chip label="mention" icon={AtSign} />
        </View>
        <View style={styles.wrap}>
          <Chip label="mi" variant="toggle" selected={units === 'mi'} onPress={() => setUnits('mi')} />
          <Chip label="km" variant="toggle" selected={units === 'km'} onPress={() => setUnits('km')} />
          <Chip label="trail" variant="tag" />
          <Chip label="Disabled" disabled />
        </View>
      </Section>

      <Section title="Tabs">
        <SegmentedTabs
          accessibilityLabel="Sticker type"
          items={[
            { key: 'activity', label: 'Activity' },
            { key: 'totals', label: 'Totals' },
            { key: 'gear', label: 'Gear' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={{ height: 12 }} />
        <SegmentedTabs
          variant="pill"
          accessibilityLabel="Period"
          items={[
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'year', label: 'Year' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Section>

      <Section title="TemplateTile">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TemplateTile
            label="Distance"
            copied={copied === 'a'}
            onPress={() => {
              setCopied('a');
              toast('Copied', Copy);
              setTimeout(() => setCopied(null), 1200);
            }}>
            <Text variant="caption" color="textMuted" uppercase>
              Distance
            </Text>
            <Text variant="xl" weight="800">
              6.2 mi
            </Text>
          </TemplateTile>
          <TemplateTile label="Route and stats" unavailableReason="No route">
            <Text variant="title" weight="700">
              Route
            </Text>
          </TemplateTile>
        </View>
      </Section>

      <Section title="StatBlock">
        <StatBlock
          hero
          stats={[
            { label: 'Distance', value: '6.21', unit: 'mi' },
            { label: 'Pace', value: '7:45', unit: '/mi' },
            { label: 'Time', value: '48:10' },
            { label: 'Elevation', value: '312', unit: 'ft' },
            { label: 'Avg HR', value: null },
            { label: 'Calories', value: '640' },
          ]}
        />
      </Section>

      <Section title="ListRow" flush>
        <ListRow icon={Footprints} title="Morning run" subtitle="Tue, Nov 17 · Apple Health" trailing="6.2 mi" />
        <ListRow icon={Bike} title="Hill repeats on the long road" subtitle="Sun, Nov 15 · Strava" trailing="24.8 mi" />
      </Section>

      <Section title="TextField">
        <View style={{ gap: 16 }}>
          <TextField label="Title" placeholder="Morning run" helper="Shown on templates that use the title" />
          <TextField label="Distance" defaultValue="abc" error="Enter a number, like 6.2" keyboardType="decimal-pad" />
          <TextField label="Source" defaultValue="Apple Health" disabled />
        </View>
      </Section>

      <Section title="Swatches">
        <Swatches value={colour} onChange={setColour} />
      </Section>

      <Section title="Sheet and Toast">
        <View style={styles.wrap}>
          <Button label="Open sheet" variant="secondary" onPress={() => setSheet(true)} />
          <Button label="Show toast" variant="secondary" onPress={() => toast('Saved to Photos', Download)} />
        </View>
      </Section>

      <Section title="EmptyState" flush>
        <EmptyState
          icon={Footprints}
          title="No totals yet"
          body="Totals appear once you have a week of activities."
          actions={<Button label="Import activities" fullWidth />}
        />
      </Section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Add a sticker">
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <SegmentedTabs
            items={[
              { key: 'activity', label: 'Activity' },
              { key: 'totals', label: 'Totals' },
              { key: 'gear', label: 'Gear' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Text variant="sm" color="textMuted">
            Template tiles go here.
          </Text>
          <Button label="Done" fullWidth onPress={() => setSheet(false)} />
        </View>
      </Sheet>
    </ScrollView>
  );
}

function Section({ title, children, flush }: { title: string; children: ReactNode; flush?: boolean }) {
  return (
    <View style={styles.section}>
      <Text variant="footnote" color="textMuted" uppercase style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        {title}
      </Text>
      <View style={flush ? undefined : { paddingHorizontal: 16, gap: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: 16, maxWidth: tokens.layout.maxWidth, width: '100%', alignSelf: 'center' },
  section: { marginBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchCell: { width: '30%', gap: 2 },
  swatch: { height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  photoBg: { backgroundColor: '#4A5A6A', padding: 12, borderRadius: radius.md },
});
