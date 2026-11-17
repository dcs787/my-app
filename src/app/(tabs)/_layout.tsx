import { Tabs } from 'expo-router/js-tabs';
import { Activity, Settings } from 'lucide-react-native';
import type { ColorValue } from 'react-native';

import { colors, fontFamily } from '@/theme';
import { Text } from '@/ui';

const label = (text: string) =>
  function TabLabel({ color }: { color: ColorValue }) {
    return (
      <Text variant="caption" weight="500" style={{ color, fontSize: 11, lineHeight: 14 }}>
        {text}
      </Text>
    );
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fontFamily('600') },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Activities',
          tabBarLabel: label('Activities'),
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: label('Settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
