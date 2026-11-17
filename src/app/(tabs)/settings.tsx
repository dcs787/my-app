import { router } from 'expo-router';
import { Palette, Ruler } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { ListRow, Text } from '@/ui';

export default function SettingsScreen() {
  return (
    <ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <Text variant="footnote" color="textMuted" uppercase>
          App
        </Text>
      </View>
      <ListRow icon={Ruler} title="Units" subtitle="Miles" />
      {__DEV__ && (
        <ListRow
          icon={Palette}
          title="Design system"
          subtitle="Tokens and components (dev only)"
          onPress={() => router.push('/design')}
        />
      )}
    </ScrollView>
  );
}
