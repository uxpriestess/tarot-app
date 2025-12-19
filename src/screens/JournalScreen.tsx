import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useAppStore, JournalEntry } from '../store/appStore';
import { getCardById } from '../data';
import { CardImage } from '../components/CardImage';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.round(width * 0.85); // Slightly smaller than reveal screen
const IMAGE_RATIO = 1384 / 1040;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * IMAGE_RATIO);

export function JournalScreen() {
    const journalEntries = useAppStore((s) => s.journalEntries);
    const journalHistory = useAppStore((s) => s.journalHistory);
    const updateEntryNote = useAppStore((s) => s.updateEntryNote);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [noteText, setNoteText] = useState('');

    useEffect(() => {
        if (selectedEntry) {
            setNoteText(selectedEntry.note || '');
        }
    }, [selectedEntry]);

    const handleSaveNote = () => {
        if (selectedEntry) {
            updateEntryNote(selectedEntry.id, noteText);
            setSelectedEntry({ ...selectedEntry, note: noteText });
            Alert.alert("Uloženo", "Poznámka byla uložena.");
        }
    };

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
                                        {/* Note Preview */}
                                        {entry.note ? (
                                            <Text style={styles.entryNotePreview} numberOfLines={2}>
                                                {entry.note}
                                            </Text>
                                        ) : null}
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

                    const position = selectedEntry.position;
                    const meaning = position === 'upright' ? card.meaningUpright : (card.meaningReversed || card.meaningUpright);

                    return (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.detailContainer}
                        >
                            <ScrollView
                                contentContainerStyle={styles.detailContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Close Button */}
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setSelectedEntry(null)}
                                >
                                    <Ionicons name="close" size={28} color={colors.text} />
                                </TouchableOpacity>

                                {/* Card Image Section */}
                                <View style={styles.detailCardSection}>
                                    <View style={[styles.detailCardImageWrapper, position === 'reversed' && { transform: [{ rotate: '180deg' }] }]}>
                                        <CardImage
                                            imageName={card.imageName}
                                            width={CARD_WIDTH}
                                            height={IMAGE_HEIGHT}
                                        />
                                    </View>

                                    <Text style={styles.detailCardName}>{card.nameCzech}</Text>

                                    <View style={styles.detailPositionBadge}>
                                        <Ionicons
                                            name={position === 'upright' ? 'arrow-up-circle' : 'arrow-down-circle'}
                                            size={16}
                                            color={position === 'upright' ? colors.sage : colors.bronze}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.detailPositionText}>
                                            {position === 'upright' ? 'Vzpřímená' : 'Obrácená'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Content Section */}
                                <View style={styles.detailInfoSection}>
                                    {/* Keywords */}
                                    <View style={styles.detailKeywords}>
                                        {card.keywords.map((keyword, index) => (
                                            <View key={index} style={styles.detailKeywordBadge}>
                                                <Text style={styles.detailKeywordText}>{keyword}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Meaning */}
                                    <View style={styles.detailMeaningBox}>
                                        <Text style={styles.detailMeaningText}>{meaning}</Text>
                                    </View>

                                    {/* Note Section - Always visible and editable */}
                                    <View style={styles.detailNoteSection}>
                                        <Text style={styles.detailSectionTitle}>Tvé poznámky</Text>
                                        <TextInput
                                            style={styles.detailNoteInput}
                                            placeholder="Zapiš si své myšlenky..."
                                            placeholderTextColor={colors.textSecondary}
                                            multiline
                                            value={noteText}
                                            onChangeText={setNoteText}
                                            textAlignVertical="top"
                                        />
                                        <TouchableOpacity
                                            style={styles.saveNoteButton}
                                            onPress={handleSaveNote}
                                        >
                                            <Ionicons name="save-outline" size={18} color={colors.background} />
                                            <Text style={styles.saveNoteButtonText}>Uložit poznámku</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    );
                })()}
            </Modal>

        </View >
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
        borderColor: colors.border,
    },
    entryIconWrapper: {
        width: 40,
        height: 56, // Taller to match aspect ratio slightly
        borderRadius: borderRadius.sm,
        backgroundColor: colors.surfaceHighlight,
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
    entryNotePreview: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    // Detail View Styles
    detailContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    detailContent: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: spacing.lg,
    },
    closeButton: {
        position: 'absolute',
        top: 20, // Inside modal, 20 is enough usually if pageSheet
        right: 0,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    detailCardSection: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: spacing.xl,
    },
    detailCardImageWrapper: {
        borderRadius: borderRadius.lg,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        backgroundColor: colors.surface,
    },
    detailCardName: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginTop: spacing.lg,
        marginBottom: 4,
    },
    detailPositionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.sm,
    },
    detailPositionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    detailInfoSection: {
        width: '100%',
    },
    detailKeywords: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    detailKeywordBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surfaceHighlight,
        borderRadius: borderRadius.full,
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
    },
    detailKeywordText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    detailMeaningBox: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    detailMeaningText: {
        fontSize: 16,
        lineHeight: 24,
        color: colors.text,
    },
    detailNoteSection: {
        marginTop: spacing.sm,
    },
    detailSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
        marginLeft: 4,
    },
    detailNoteText: { // Keeping for legacy/ref if needed, can delete
        fontSize: 15,
        lineHeight: 22,
        color: colors.textSecondary,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailNoteInput: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.text,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 100,
        marginBottom: spacing.md,
    },
    saveNoteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.text,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
    },
    saveNoteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.background,
        marginLeft: spacing.xs,
    },
});
