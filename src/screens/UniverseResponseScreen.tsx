import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { TarotCard } from '../types/tarot';
import { CardImage } from '../components/CardImage';

interface UniverseResponseScreenProps {
    question: string;
    answer: string;
    cards: TarotCard[];
    onClose: () => void;
    onSaveToJournal?: () => void;
}

export function UniverseResponseScreen({
    question,
    answer,
    cards,
    onClose,
    onSaveToJournal,
}: UniverseResponseScreenProps) {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Odpověď vesmíru</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Question */}
                <View style={styles.questionContainer}>
                    <Text style={styles.questionLabel}>Tvoje otázka:</Text>
                    <Text style={styles.questionText}>{question}</Text>
                </View>

                {/* Cards */}
                <View style={styles.cardsContainer}>
                    <Text style={styles.sectionLabel}>Vytažené karty:</Text>
                    <View style={styles.cardsRow}>
                        {cards.map((card, index) => (
                            <View key={index} style={styles.cardWrapper}>
                                <View style={styles.cardImageWrapper}>
                                    <CardImage imageName={card.imageName} />
                                </View>
                                <Text style={styles.cardName}>{card.nameCzech || card.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* AI Answer */}
                <View style={styles.answerContainer}>
                    <Text style={styles.sectionLabel}>Odpověď:</Text>
                    <Text style={styles.answerText}>{answer}</Text>
                </View>

                {/* Actions */}
                {onSaveToJournal && (
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={onSaveToJournal}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="bookmark-outline" size={20} color={colors.background} />
                        <Text style={styles.saveButtonText}>Uložit do deníku</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.softLinen,
    },
    closeButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    questionContainer: {
        marginTop: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderLeftWidth: 3,
        borderLeftColor: colors.lavender,
    },
    questionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textLight,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    questionText: {
        fontSize: 16,
        color: colors.text,
        fontStyle: 'italic',
    },
    cardsContainer: {
        marginTop: spacing.lg,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
    cardsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
    },
    cardWrapper: {
        alignItems: 'center',
        flex: 1,
        maxWidth: 120,
    },
    cardImageWrapper: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
    },
    cardName: {
        fontSize: 12,
        color: colors.textLight,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    answerContainer: {
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    answerText: {
        fontSize: 16,
        lineHeight: 24,
        color: colors.text,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.lavender,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.full,
        marginBottom: spacing.xl,
        gap: spacing.xs,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.background,
    },
});
