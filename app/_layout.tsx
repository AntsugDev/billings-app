import {DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {router, Stack, useRouter, useSegments} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import 'react-native-reanimated';

import {isValid, getDataUser} from '@/scripts/store/AuthStore';
import {ErrorOverlay} from '@/components/ErrorOverlay';
import * as Sentry from '@sentry/react-native';

Sentry.init({
    dsn: 'https://222d66e7e3452f23d0f4249e26e3e065@o4510681510313984.ingest.de.sentry.io/4511811672932432',

    // Adds more context data to events (IP address, cookies, user, etc.)
    // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
    sendDefaultPii: true,

    // Enable Logs
    enableLogs: true,

    // Configure Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

    // uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: __DEV__,
});

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

/*
export const unstable_settings = {
    anchor: '(tabs)',
};
 */

function AuthGuard({children}: { children: React.ReactNode }) {
    const segments = useSegments()
    const [authState, setauthState] = useState(false)
    const router = useRouter()
    useEffect(() => {
        const check = async () => {
            const valid = await isValid()
            if (valid) {
                setauthState(true)
            } else {
                setauthState(false)
                if (!segments.includes('login'))
                    router.replace({
                        pathname:'/login',
                        params:{
                            logout:1
                        }
                    })
            }
        }
        check()
    }, []);

    if (!authState) {
        return (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC'}}>
                <ActivityIndicator size="large" color="#0D9488"/>
            </View>
        );
    }

    return <>{children}</>;
}

export default Sentry.wrap(function RootLayout() {
    return (
        <ThemeProvider value={BillingsTheme}>
            <AuthGuard>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{headerShown: false,}}/>
                    <Stack.Screen name="login" options={{headerShown: false, gestureEnabled: false}}/>
                    <Stack.Screen name="modal" options={{presentation: 'modal', title: 'Info'}}/>
                </Stack>
            </AuthGuard>
            <ErrorOverlay/>
            <StatusBar style="dark"/>
        </ThemeProvider>
    );
});
