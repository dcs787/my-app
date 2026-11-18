import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/ui';

// Replaced by the editor in the next commit.
export default function EditorScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Editor for {activityId}</Text>
    </View>
  );
}
