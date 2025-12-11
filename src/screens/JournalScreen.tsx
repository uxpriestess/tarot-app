import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useAppStore, JournalEntry } from '../store/appStore';
import { getCardById } from '../data'; // Ensure this assumes getCardById is exported from data
import { CardImage } from '../components/CardImage';
import { CardRevealScreen } from './CardRevealScreen';

export function JournalScreen() {
    const journalEntries = useAppStore((s) => s.journalEntries);
    const journalHistory = useAppStore((s) => s.journalHistory);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    const getCardForEntry = (id: string) => {
        return getCardById(id);
    };

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
                        <Ionicons name="filter-outline" size={24} color={colors.bronze} />
                        <Text style={styles.statNumber}>{journalHistory.length}</Text>
                        <Text style={styles.statLabel}>Uloženo</Text>
                    </View>
                </View>

                {/* Journal Entries */}
                <View style={styles.entriesContainer}>
                    <Text style={styles.sectionTitle}>Poslední výklady</Text>

                    {journalHistory.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={48} color={colors.textLight} />
                            <Text style={styles.emptyText}>Zatím nemáš žádné výklady</Text>
                            <Text style={styles.emptySubtext}>
                                Vytáhni první kartu a ulož si ji sem
                            </Text>
                        </View>
                    ) : (
                        journalHistory.map((entry) => {
                            const card = getCardForEntry(entry.cardId);
                            if (!card) return null;

                            return (
                                <TouchableOpacity
                                    key={entry.id}
                                    style={styles.entryCard}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedEntry(entry)}
                                >
                                    <View style={styles.entryIconWrapper}>
                                        <CardImage imageName={card.imageName} width={40} height={56} />
                                    </View>
                                    <View style={styles.entryContent}>
                                        <Text style={styles.entryTitle}>{card.nameCzech}</Text>
                                        <Text style={styles.entryDate}>
                                            {new Date(entry.date).toLocaleDateString('cs-CZ', {
                                                day: 'numeric',
                                                month: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                        <Text style={styles.entryPosition}>
                                            {entry.position === 'upright' ? 'Vzpřímená' : 'Obrácená'}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color={colors.textLight}
                                    />
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={!!selectedEntry}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedEntry(null)}
            >
                {selectedEntry && (() => {
                    const card = getCardForEntry(selectedEntry.cardId);
                    if (!card) return null;
                    return (
                        <CardRevealScreen
                            card={card}
                            position={selectedEntry.position}
                            onClose={() => setSelectedEntry(null)}
                        />
                    );
                })()}
            </Modal>
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
        height: 56, // Taller to match aspect ratio slightly
        borderRadius: borderRadius.sm,
        backgroundColor: colors.softLinen,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        overflow: 'hidden',
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
    entryPosition: {
        fontSize: 11,
        color: colors.lavender,
        marginTop: 2,
    },
});
