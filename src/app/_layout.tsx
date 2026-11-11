import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { handleNotificationTap, registerForPush } from '@/lib/push';
import { StripeGate } from '@/lib/stripe';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  const uid = user?.uid;

  useEffect(() => {
    if (uid) registerForPush(uid);
  }, [uid]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => handleNotificationTap(r.notification.request.content.data));
    // App launched by tapping a notification while it was closed.
    const last = Notifications.getLastNotificationResponse();
    if (last) handleNotificationTap(last.notification.request.content.data);
    return () => sub.remove();
  }, []);

  const theme = useTheme();
  const detailOptions = {
    headerShown: true,
    headerBackTitle: 'Back',
    headerTintColor: theme.primary,
    headerStyle: { backgroundColor: theme.surface },
    headerTitleStyle: { color: theme.text },
    headerShadowVisible: false,
  } as const;

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" options={detailOptions} />
        <Stack.Screen name="user/[uid]" options={detailOptions} />
        <Stack.Screen name="settings" options={{ ...detailOptions, title: 'Settings' }} />
        <Stack.Screen name="checkout/[postId]" options={{ ...detailOptions, title: 'Checkout' }} />
        <Stack.Screen name="orders" options={{ ...detailOptions, title: 'Orders' }} />
        <Stack.Screen name="review/[sellerUid]" options={{ ...detailOptions, title: 'Review seller' }} />
        <Stack.Screen name="report" options={{ ...detailOptions, title: 'Report' }} />
        <Stack.Screen name="blocked" options={{ ...detailOptions, title: 'Blocked users' }} />
      </Stack.Protected>
      <Stack.Screen name="legal/[doc]" options={detailOptions} />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="auto" />
            <StripeGate>
              <RootNavigator />
            </StripeGate>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
