import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { HomeScreen } from '../screens/HomeScreen';
import { TarotReadingScreen } from '../screens/TarotReadingScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

interface TabNavigatorProps {
    onDrawCard: (subsetIds?: string[]) => void;
    onAskUniverse: (question: string) => Promise<void>;
    onOpenMystic?: () => void;
    onOpenLoveReading?: () => void;
}

export function TabNavigator({ onDrawCard, onAskUniverse, onOpenMystic, onOpenLoveReading }: TabNavigatorProps) {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    elevation: 0, // Remove shadow on Android
                },
                tabBarActiveTintColor: colors.lavender,
                tabBarInactiveTintColor: colors.textLight,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600' as any,
                },
            }}
        >
            <Tab.Screen
                name="Domů"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            >
                {() => (
                    <HomeScreen
                        onDrawCard={onDrawCard}
                        onAskUniverse={onAskUniverse}
                        onOpenMystic={onOpenMystic}
                        hasReadToday={false}
                        streak={3}
                    />
                )}
            </Tab.Screen>

            <Tab.Screen
                name="Čtení"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="sparkles" size={size} color={color} />
                    ),
                }}
            >
                {() => <TarotReadingScreen onOpenLoveReading={onOpenLoveReading} />}
            </Tab.Screen>


            <Tab.Screen
                name="Deník"
                component={JournalScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="book" size={size} color={color} />
                    ),
                }}
            />

            <Tab.Screen
                name="Kolekce"
                component={CollectionScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid" size={size} color={color} />
                    ),
                }}
            />

            <Tab.Screen
                name="Profil"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}
