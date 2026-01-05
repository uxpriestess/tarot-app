import React, { useState, useEffect, useRef } from 'react';
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
    Animated,
    Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useAppStore, JournalEntry } from '../store/appStore';
import { getCardById } from '../data';
import { CardImage } from '../components/CardImage';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.round(width * 0.85); // Slightly smaller than reveal screen
const IMAGE_RATIO = 1384 / 1040;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * IMAGE_RATIO);

// Shimmer component for the shiny glimmer effect
const Glimmer = () => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 3500, // Very slow, gentle sweep
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.delay(8000), // Long magical pause
            ])
        ).start();
    }, []);

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width * 0.8, width * 0.8],
    });

    const opacity = anim.interpolate({
        inputRange: [0, 0.3, 0.7, 1],
        outputRange: [0, 0.3, 0.3, 0], // Very soft visibility
    });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        transform: [{ translateX }, { skewX: '-30deg' }],
                        width: '40%',
                        opacity,
                    },
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255, 255, 255, 0.15)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                />
            </Animated.View>
        </View>
    );
};

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
        <>
            <ImmersiveScreen screenName="journal">
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
                        <Glimmer />
                        <View style={styles.statItem}>
                            <Ionicons name="book-outline" size={20} color="#D8DDE3" />
                            <Text style={styles.statNumber}>{journalEntries}</Text>
                            <Text style={styles.statLabel}>Záznamy</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statItem}>
                            <Ionicons name="bookmark-outline" size={20} color="#C5A059" />
                            <Text style={styles.statNumber}>{journalHistory.length}</Text>
                            <Text style={styles.statLabel}>Uloženo</Text>
                        </View>
                    </View>

                    {/* Journal Entries */}
                    <View style={styles.entriesContainer}>
                        <Text style={styles.sectionTitle}>Poslední výklady</Text>

                        {journalHistory.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
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
                                        <Glimmer />
                                        <View style={styles.entryIconWrapper}>
                                            <CardImage imageName={card.imageName} width={36} height={50} />
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
                                            color="rgba(255, 255, 255, 0.4)"
                                        />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            </ImmersiveScreen>

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
                                    <Ionicons name="close" size={28} color="#fff" />
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
                                            <Glimmer />
                                            <Ionicons name="save-outline" size={16} color="#fff" />
                                            <Text style={styles.saveNoteButtonText}>Uložit poznámku</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    );
                })()}
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: 120, // Enough for the tab bar
    },
    header: {
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.sm,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
    },
    statSeparator: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignSelf: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    entriesContainer: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: spacing.md,
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
    entryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: spacing.sm,
        borderRadius: 16,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    entryIconWrapper: {
        width: 36,
        height: 50,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
        color: '#fff',
        marginBottom: 2,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    entryDate: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    entryPosition: {
        fontSize: 11,
        color: colors.lavender,
        marginTop: 2,
        opacity: 0.9,
    },
    entryNotePreview: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 4,
        fontStyle: 'italic',
    },
    // Detail View Styles
    detailContainer: {
        flex: 1,
        backgroundColor: '#1a1425', // Dark mystical purple-black
    },
    detailContent: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: spacing.lg,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 0,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    detailCardSection: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: spacing.xl,
    },
    detailCardImageWrapper: {
        borderRadius: borderRadius.lg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    detailCardName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        marginTop: spacing.lg,
        marginBottom: 4,
    },
    detailPositionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginTop: spacing.sm,
    },
    detailPositionText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
    },
    detailKeywordText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
    },
    detailMeaningBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        marginBottom: spacing.lg,
    },
    detailMeaningText: {
        fontSize: 16,
        lineHeight: 24,
        color: 'rgba(255, 255, 255, 0.9)',
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
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        minHeight: 120,
        marginBottom: spacing.md,
    },
    saveNoteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        overflow: 'hidden',
    },
    saveNoteButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
        marginLeft: spacing.xs,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
});
