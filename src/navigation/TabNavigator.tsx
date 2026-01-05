import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
    HomeScreen,
    TarotReadingScreen, // Updated import
    JournalScreen,
    CollectionScreen,
    ProfileScreen,
} from '../screens';

const Tab = createBottomTabNavigator();

interface TabNavigatorProps {
    onDrawCard: (subsetIds?: string[]) => void;
    onAskUniverse: (question: string) => Promise<void>;
    onOpenMystic?: () => void;
}

export function TabNavigator({ onDrawCard, onAskUniverse, onOpenMystic }: TabNavigatorProps) {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 10,
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
                {() => <TarotReadingScreen />}
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
