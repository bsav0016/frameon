import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { watchUnreadCount } from '@/lib/data/notifications';
import { useUid } from '@/lib/queries';
import { settingsHref } from '@/lib/routes';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'image-outline', iconFocused: 'image' },
  { name: 'explore', title: 'Search', icon: 'search-outline', iconFocused: 'search' },
  { name: 'camera', title: 'Post', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  { name: 'notifications', title: 'Activity', icon: 'notifications-outline', iconFocused: 'notifications' },
  { name: 'profile', title: 'Profile', icon: 'person-circle-outline', iconFocused: 'person-circle' },
];

export default function TabsLayout() {
  const theme = useTheme();
  const uid = useUid();
  const [unread, setUnread] = useState(0);

  useEffect(() => (uid ? watchUnreadCount(uid, setUnread) : undefined), [uid]);

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
            tabBarBadge: tab.name === 'notifications' && unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
            headerRight:
              tab.name === 'profile'
                ? () => (
                    <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push(settingsHref)} style={{ marginRight: 16 }}>
                      <Ionicons name="settings-outline" size={22} color={theme.text} />
                    </Pressable>
                  )
                : undefined,
            tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
