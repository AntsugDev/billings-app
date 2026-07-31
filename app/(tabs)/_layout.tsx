import {Tabs, useRouter} from 'expo-router';
import React from 'react';
import {TouchableOpacity, Alert} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import {HapticTab} from '@/components/haptic-tab';
import {logoutStore, getDataUser} from '@/scripts/store/AuthStore';
import {logoutApi} from "@/scripts/api";

export default function TabLayout() {
    const router = useRouter();

    const handleLogout = async () => {
        Alert.alert(
            'Disconnessione',
            'Sei sicuro di voler uscire?',
            [
                {text: 'Annulla', style: 'cancel'},
                {
                    text: 'Esci',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const user = await getDataUser();
                            if (user && user.username) {
                                await logoutApi(btoa(user.username))
                            }
                            // Redirect is handled by AuthGuard automatically
                            router.replace('/login');
                        } catch (e) {
                            console.log('Errore logout:', e);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#0D9488', // Teal accent
                tabBarInactiveTintColor: '#64748B',
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                    elevation: 2,
                    shadowColor: '#0F172A',
                    shadowOffset: {width: 0, height: 1},
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                },
                headerTitleStyle: {
                    fontWeight: '700',
                    fontSize: 18,
                    color: '#0F172A',
                },
                headerRight: () => (
                    <TouchableOpacity onPress={handleLogout} style={{marginRight: 16, padding: 4}}>
                        <Ionicons name="log-out-outline" size={24} color="#EF4444"/>
                    </TouchableOpacity>
                ),
                tabBarButton: HapticTab,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Utenze',
                    tabBarLabel: 'Utenze',
                    tabBarIcon: ({color, focused}) => (
                        <Ionicons name={focused ? 'business' : 'business-outline'} size={24} color={color}/>
                    ),
                }}
            />
            <Tabs.Screen
                name="fatture"
                options={{
                    title: 'Gestione Inserimento/Lista Fatture',
                    tabBarLabel: 'Fatture',
                    tabBarIcon: ({color, focused}) => (
                        <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color}/>
                    ),
                }}
            />
            <Tabs.Screen
                name="situazione"
                options={{
                    title: 'Situazione Attuale',
                    tabBarLabel: 'Situazione',
                    tabBarIcon: ({color, focused}) => (
                        <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={24} color={color}/>
                    ),
                }}
            />
            <Tabs.Screen
                name="statistiche"
                options={{
                    title: 'Statistiche',
                    tabBarLabel: 'Statistiche',
                    tabBarIcon: ({color, focused}) => (
                        <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={24} color={color}/>
                    ),
                }}
            />
        </Tabs>
    );
}
