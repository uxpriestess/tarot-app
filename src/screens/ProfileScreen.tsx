import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useAppStore } from '../store/appStore';

export function ProfileScreen() {
    const streakDays = useAppStore((s) => s.streakDays);
    const journalEntries = useAppStore((s) => s.journalEntries);
    const drawHistory = useAppStore((s) => s.drawHistory);

    const handleResetOnboarding = async () => {
        Alert.alert(
            'Reset Onboarding',
            'Znovu zobrazit úvodní obrazovku při příštím spuštění?',
            [
                {
                    text: 'Zrušit',
                    style: 'cancel',
                },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.removeItem('onboarding_complete');
                            Alert.alert('Hotovo!', 'Onboarding bude zobrazen při příštím spuštění aplikace.');
                        } catch (error) {
                            Alert.alert('Chyba', 'Nepodařilo se resetovat onboarding');
                        }
                    },
                },
            ]
        );
    };

    const stats = [
        { icon: 'flame', label: 'Série', value: streakDays, color: colors.bronze },
        { icon: 'book', label: 'Záznamy', value: journalEntries, color: colors.lavender },
        { icon: 'sparkles', label: 'Výklady', value: drawHistory.length, color: colors.sage },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarEmoji}>🔮</Text>
                    </View>
                    <Text style={styles.title}>Tvůj profil</Text>
                    <Text style={styles.subtitle}>Sleduj svůj pokrok</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <View key={index} style={[styles.statCard, index === stats.length - 1 && { marginRight: 0 }]}>
                            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>O aplikaci</Text>
                    <View style={styles.aboutCard}>
                        <Text style={styles.aboutText}>
                            Tarotka je prostor pro velké otázky i malé rituály. Pomůže ti zastavit, podívat se dovnitř a lépe porozumět otázkám, které ti nedají spát. Objev, co ti přinese nová denní karta. Pokládej vlastní otázky, objevuj výklady a zapisuj si to, co se v tobě právě odehrává.
                        </Text>
                        <Text style={styles.versionText}>Verze 1.0.0</Text>
                    </View>
                </View>

                {/* Links */}
                <View style={styles.linksContainer}>
                    <TouchableOpacity style={styles.linkButton} activeOpacity={0.7}>
                        <Ionicons name="help-circle-outline" size={20} color={colors.lavender} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.linkText}>Nápověda</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkButton} activeOpacity={0.7}>
                        <Ionicons name="mail-outline" size={20} color={colors.lavender} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.linkText}>Kontakt</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                </View>

                {/* Dev Section */}
                <View style={styles.devSection}>
                    <Text style={styles.devLabel}>DEV</Text>
                    <TouchableOpacity
                        style={styles.devButton}
                        onPress={handleResetOnboarding}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh" size={18} color={colors.error} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.devButtonText}>Reset Onboarding</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.lavender + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarEmoji: {
        fontSize: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    statsGrid: {
        flexDirection: 'row',
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.softLinen,
        marginRight: spacing.md,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
        letterSpacing: -0.3,
    },
    aboutCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.softLinen,
    },
    aboutText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    versionText: {
        fontSize: 12,
        color: colors.textLight,
    },
    linksContainer: {
        // gap removed
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.softLinen,
        marginBottom: spacing.sm,
    },
    linkText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    devSection: {
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
    },
    devLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.error,
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    devButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        borderWidth: 1,
        borderColor: colors.error + '30',
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    devButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.error,
    },
});
