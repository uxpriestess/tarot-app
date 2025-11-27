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

export function JournalScreen() {
    const drawHistory = useAppStore((s) => s.drawHistory);
    const journalEntries = useAppStore((s) => s.journalEntries);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Deník</Text>
                    <Text style={styles.subtitle}>
                        {journalEntries} {journalEntries === 1 ? 'záznam' : 'záznamy'}
                    </Text>
                </View>

                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Ionicons name="book-outline" size={24} color={colors.lavender} />
                        <Text style={styles.statNumber}>{journalEntries}</Text>
                        <Text style={styles.statLabel}>Záznamy</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="sparkles-outline" size={24} color={colors.bronze} />
                        <Text style={styles.statNumber}>{drawHistory.length}</Text>
                        <Text style={styles.statLabel}>Výklady</Text>
                    </View>
                </View>

                {/* Journal Entries */}
                <View style={styles.entriesContainer}>
                    <Text style={styles.sectionTitle}>Poslední výklady</Text>

                    {drawHistory.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={48} color={colors.textLight} />
                            <Text style={styles.emptyText}>Zatím nemáš žádné výklady</Text>
                            <Text style={styles.emptySubtext}>
                                Vytáhni první kartu a začni svou cestu
                            </Text>
                        </View>
                    ) : (
                        drawHistory.slice().reverse().map((cardName, index) => (
                            <TouchableOpacity
                                key={`${cardName}-${index}`}
                                style={styles.entryCard}
                                activeOpacity={0.7}
                            >
                                <View style={styles.entryIconWrapper}>
                                    <Ionicons
                                        name="sparkles"
                                        size={20}
                                        color={colors.lavender}
                                    />
                                </View>
                                <View style={styles.entryContent}>
                                    <Text style={styles.entryTitle}>{cardName}</Text>
                                    <Text style={styles.entryDate}>
                                        {new Date().toLocaleDateString('cs-CZ')}
                                    </Text>
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color={colors.textLight}
                                />
                            </TouchableOpacity>
                        ))
                    )}
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
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    entriesContainer: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
        letterSpacing: -0.3,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    entryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.softLinen,
    },
    entryIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: colors.softLinen,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    entryContent: {
        flex: 1,
    },
    entryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    entryDate: {
        fontSize: 13,
        color: colors.textSecondary,
    },
});
