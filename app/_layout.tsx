import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { isValid, getDataUser } from '@/scripts/store/AuthStore';
import { ErrorOverlay } from '@/components/ErrorOverlay';

// Define a premium light theme for the application
const BillingsTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0D9488', // Teal accent
    background: '#F8FAFC', // Slate 50 background
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: '#EF4444',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const activeSegmentGroup = segments[0];
  const [loading, setLoading] = useState(true);

  const checkAuthentication = useCallback(async () => {
    try {
      const isLoggingIn = activeSegmentGroup === 'login';

      const isTokenValid = await isValid();
      const user = await getDataUser();
      const authenticated = !!(isTokenValid && user);

      if (!authenticated && !isLoggingIn) {
        // Not logged in -> go to login
        router.replace('/login');
      } else if (authenticated && isLoggingIn) {
        // Already logged in -> go to tabs home
        router.replace('/(tabs)');
      }
    } catch {
      if (activeSegmentGroup !== 'login') {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [activeSegmentGroup, router]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider value={BillingsTheme}>
      <AuthGuard>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Info' }} />
        </Stack>
      </AuthGuard>
      <ErrorOverlay />
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
