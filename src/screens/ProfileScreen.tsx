import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useAppStore } from '../store/appStore';

export function ProfileScreen() {
    const streakDays = useAppStore((s) => s.streakDays);
    const journalEntries = useAppStore((s) => s.journalEntries);
    const drawHistory = useAppStore((s) => s.drawHistory);
    const microcopyStyle = useAppStore((s) => s.userMicrocopyStyle);
    const setMicrocopyStyle = useAppStore((s) => s.setStyle);

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
                    <Text style={styles.sectionTitle}>Nastavení</Text>

                    {/* Microcopy Style */}
                    <View style={styles.settingCard}>
                        <View style={styles.settingHeader}>
                            <Ionicons name="text-outline" size={20} color={colors.lavender} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.settingTitle}>Styl textu</Text>
                        </View>
                        <Text style={styles.settingDescription}>
                            Vyber si, jak s tebou chceš, aby aplikace mluvila
                        </Text>
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                onPress={() => setMicrocopyStyle('soft')}
                                style={[
                                    styles.toggleOption,
                                    microcopyStyle === 'soft' && styles.toggleOptionActive,
                                ]}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.toggleText,
                                        microcopyStyle === 'soft' && styles.toggleTextActive,
                                    ]}
                                >
                                    🌙 Soft
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setMicrocopyStyle('genz')}
                                style={[
                                    styles.toggleOption,
                                    microcopyStyle === 'genz' && styles.toggleOptionActive,
                                    { marginRight: 0 }
                                ]}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.toggleText,
                                        microcopyStyle === 'genz' && styles.toggleTextActive,
                                    ]}
                                >
                                    ✨ GenZ
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>O aplikaci</Text>
                    <View style={styles.aboutCard}>
                        <Text style={styles.aboutText}>
                            Tarot App je tvůj denní průvodce k sebereflexi a mindfulness.
                            Vytáhni si kartu každý den a objevuj její význam.
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
    settingCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.softLinen,
    },
    settingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    settingDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    toggleContainer: {
        flexDirection: 'row',
    },
    toggleOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.softLinen,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    toggleOptionActive: {
        backgroundColor: colors.lavender + '20',
        borderColor: colors.lavender,
        borderWidth: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    toggleTextActive: {
        color: colors.text,
        fontWeight: '600',
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
});
