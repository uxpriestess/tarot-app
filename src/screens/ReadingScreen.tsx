import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';

interface ReadingScreenProps {
    onDrawCard: () => void;
}

export function ReadingScreen({ onDrawCard }: ReadingScreenProps) {
    const readingTypes = [
        {
            id: 'single',
            icon: 'flash',
            title: 'Jednoduchý výklad',
            subtitle: '1 karta',
            description: 'Rychlá odpověď na tvou otázku',
            color: colors.bronze,
        },
        {
            id: 'three',
            icon: 'triangle',
            title: 'Tři karty',
            subtitle: 'Minulost・Současnost・Budoucnost',
            description: 'Hlubší pohled na situaci',
            color: colors.lavender,
        },
        {
            id: 'celtic',
            icon: 'grid',
            title: 'Keltský kříž',
            subtitle: '10 karet',
            description: 'Kompletní analýza života',
            color: colors.sage,
            disabled: true,
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Čtení</Text>
                    <Text style={styles.subtitle}>Vyber typ výkladu</Text>
                </View>

                {/* Reading Types */}
                <View style={styles.cardsContainer}>
                    {readingTypes.map((type) => (
                        <TouchableOpacity
                            key={type.id}
                            style={[
                                styles.readingCard,
                                type.disabled && styles.readingCardDisabled,
                            ]}
                            onPress={() => {
                                if (!type.disabled && type.id === 'single') {
                                    onDrawCard();
                                }
                            }}
                            disabled={type.disabled}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.iconWrapper, { backgroundColor: type.color + '20' }]}>
                                <Ionicons name={type.icon as any} size={32} color={type.color} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{type.title}</Text>
                                <Text style={styles.cardSubtitle}>{type.subtitle}</Text>
                                <Text style={styles.cardDescription}>{type.description}</Text>
                            </View>
                            {type.disabled && (
                                <View style={styles.comingSoonBadge}>
                                    <Text style={styles.comingSoonText}>Brzy</Text>
                                </View>
                            )}
                            {!type.disabled && (
                                <Ionicons
                                    name="chevron-forward"
                                    size={24}
                                    color={colors.textLight}
                                    style={styles.chevron}
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quick Tips */}
                <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>💡 Tipy pro čtení</Text>
                    <View style={styles.tipCard}>
                        <Ionicons name="moon-outline" size={20} color={colors.lavender} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.tipText}>
                            Vytáhni si kartu v klidu, když máš čas přemýšlet
                        </Text>
                    </View>
                    <View style={styles.tipCard}>
                        <Ionicons name="heart-outline" size={20} color={colors.rose} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.tipText}>
                            Zaměř se na konkrétní otázku před tažením
                        </Text>
                    </View>
                    <View style={styles.tipCard}>
                        <Ionicons name="book-outline" size={20} color={colors.sage} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.tipText}>
                            Zapiš si své pocity a interpretace do deníku
                        </Text>
                    </View>
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
    cardsContainer: {
        marginBottom: spacing.xxl,
    },
    readingCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.softLinen,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: spacing.md,
    },
    readingCardDisabled: {
        opacity: 0.6,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    cardContent: {
        marginBottom: spacing.sm,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    cardSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    cardDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    comingSoonBadge: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.lavender + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    comingSoonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.lavender,
    },
    chevron: {
        position: 'absolute',
        right: spacing.md,
        bottom: spacing.md,
    },
    tipsContainer: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.softLinen,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});
