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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { allCards } from '../data';
import { TarotCard } from '../types/tarot';
import { CardImage } from '../components/CardImage';
import { CardRevealScreen } from './CardRevealScreen';

type FilterType = 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.lg * 3) / 2;

export function CollectionScreen() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);

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
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Kolekce</Text>
                <Text style={styles.subtitle}>{allCards.length} karet</Text>
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
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.cardContainer}
                        activeOpacity={0.8}
                        onPress={() => setSelectedCard(item)}
                    >
                        <View style={styles.cardWrapper}>
                            <CardImage imageName={item.imageName} width={cardWidth} height={cardWidth * 1.5} />
                        </View>
                        <Text style={styles.cardName} numberOfLines={2}>
                            {item.czechName || item.nameCzech}
                        </Text>
                        <Text style={styles.cardSuit}>{item.suit || 'Unknown'}</Text>
                    </TouchableOpacity>
                )}
            />

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.md,
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
    filters: {
        marginBottom: spacing.lg,
    },
    filtersContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm, // Add padding to prevent clipping of shadows/borders
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16, // Explicit px for control
        paddingVertical: 10,   // Increased vertical padding
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
        minHeight: 40,        // Increased min height
    },
    filterChipActive: {
        backgroundColor: colors.surfaceHighlight,
        borderColor: colors.lavender,
        borderWidth: 1.5,
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
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    cardSuit: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
