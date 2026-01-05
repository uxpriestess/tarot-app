import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Modal,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { allCards } from '../data';
import { useAppStore } from '../store/appStore';
import { TarotCard } from '../types/tarot';
import { CardImage } from '../components/CardImage';
import { CardRevealScreen } from './CardRevealScreen';
import { ImmersiveScreen } from '../components/ImmersiveScreen';

type FilterType = 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.lg * 3) / 2;

export function CollectionScreen() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);
    const journalHistory = useAppStore((s) => s.journalHistory);

    // Get unique card IDs user has seen
    const discoveredCardIds = new Set(journalHistory.map(entry => entry.cardId));
    const discoveryPercent = Math.round((discoveredCardIds.size / allCards.length) * 100);

    const filteredCards = allCards.filter((card: TarotCard) => {
        if (filter === 'all') return true;
        if (filter === 'major') return card.suit === 'Major Arcana';
        if (!card.suit) return false;
        return card.suit.toLowerCase() === filter.toLowerCase();
    });

    const filterOptions: { key: FilterType; label: string; icon: string }[] = [
        { key: 'all', label: 'Vše', icon: 'apps-outline' },
        { key: 'major', label: 'Velká Arkána', icon: 'star-outline' },
        { key: 'wands', label: 'Hole', icon: 'flame-outline' },
        { key: 'cups', label: 'Poháry', icon: 'water-outline' },
        { key: 'pentacles', label: 'Pentakly', icon: 'leaf-outline' },
        { key: 'swords', label: 'Meče', icon: 'flash-outline' },
    ];

    return (
        <>
            <ImmersiveScreen screenName="collection">
                <View style={styles.header}>
                    <Text style={styles.title}>Kolekce</Text>

                    {/* Discovery Progress Card */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressTextSection}>
                            <Text style={styles.percentText}>{discoveryPercent}% karet v kapse!</Text>
                            <Text style={styles.promoText}>
                                {discoveryPercent < 100
                                    ? "Sbírej nové karty každý den."
                                    : "Gratulujeme! Máš kompletní balíček."}
                            </Text>
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{discoveredCardIds.size}/{allCards.length}</Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersContent}
                    style={styles.filters}
                >
                    {filterOptions.map((option) => (
                        <TouchableOpacity
                            key={option.key}
                            onPress={() => setFilter(option.key)}
                            style={[
                                styles.filterChip,
                                filter === option.key && styles.filterChipActive,
                            ]}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={option.icon as any}
                                size={16}
                                color={filter === option.key ? colors.text : colors.textSecondary}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                style={[
                                    styles.filterText,
                                    filter === option.key && styles.filterTextActive,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <FlatList
                    data={filteredCards}
                    numColumns={2}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.grid}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const isDiscovered = discoveredCardIds.has(item.id);
                        return (
                            <TouchableOpacity
                                style={styles.cardContainer}
                                activeOpacity={isDiscovered ? 0.8 : 0.6}
                                onPress={() => isDiscovered && setSelectedCard(item)}
                            >
                                <View style={styles.cardWrapper}>
                                    <CardImage
                                        imageName={item.imageName}
                                        width={cardWidth}
                                        height={cardWidth * 1.5}
                                        isDiscovered={isDiscovered}
                                    />
                                </View>
                                <Text style={styles.cardName} numberOfLines={2}>
                                    {item.czechName || item.nameCzech}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </ImmersiveScreen>

            <Modal
                visible={!!selectedCard}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedCard(null)}
            >
                {selectedCard && (
                    <CardRevealScreen
                        card={selectedCard}
                        position="upright"
                        onClose={() => setSelectedCard(null)}
                    />
                )}
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: 38, // Slightly bigger as requested
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    progressCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 20,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        marginTop: spacing.xs,
    },
    progressTextSection: {
        flex: 1,
    },
    percentText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    promoText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    countBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: { // Keep for ref or delete
        fontSize: 16,
        color: colors.textSecondary,
    },
    filters: {
        marginBottom: spacing.md,
    },
    filtersContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 4, // Room for top shadow/glow
        paddingBottom: 20, // Significantly more room for the bottom shadow
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255, 255, 255, 0.4)', // Glassy
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        marginRight: spacing.sm,
        minHeight: 40,
    },
    filterChipActive: {
        backgroundColor: '#fff', // Solid white when active
        borderColor: 'rgba(0, 0, 0, 0.1)',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    filterText: {
        fontSize: 14,
        lineHeight: 20,       // Explicit line height to prevent vertical clipping
        fontWeight: '500',
        color: colors.textSecondary,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    filterTextActive: {
        color: colors.text,
        fontWeight: '600',
    },
    grid: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    cardContainer: {
        width: cardWidth,
        marginBottom: spacing.sm,
    },
    cardWrapper: {
        width: cardWidth,
        height: cardWidth * 1.5,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        marginBottom: spacing.sm,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    cardName: {
        fontSize: 16, // Slightly bigger (was 14)
        fontWeight: '600',
        color: colors.text,
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    cardSuit: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
