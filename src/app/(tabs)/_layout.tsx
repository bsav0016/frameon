import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'image-outline', iconFocused: 'image' },
  { name: 'explore', title: 'Search', icon: 'search-outline', iconFocused: 'search' },
  { name: 'camera', title: 'Post', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  { name: 'notifications', title: 'Activity', icon: 'notifications-outline', iconFocused: 'notifications' },
  { name: 'profile', title: 'Profile', icon: 'person-circle-outline', iconFocused: 'person-circle' },
];

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.surface },
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
