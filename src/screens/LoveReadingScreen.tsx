/**
 * LoveReadingScreen_v2.tsx
 * 
 * STORY MODE VERSION
 * 
 * Flow:
 * 1. ONE card at a time (full screen, spacious)
 * 2. Card pulses → tap → flips → meaning appears
 * 3. Heart icon to progress to next card
 * 4. After 3rd card: "Celý výklad" button
 * 5. Timeline view with all cards visible
 * 
 * Key Features:
 * - Position labels integrated into flip animation
 * - Clean, aesthetic background (easy to customize)
 * - Anti-cramped design
 * - Smooth transitions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ScrollView,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { CardImage } from '../components/CardImage';
import { performReading, ReadingSection } from '../services/universe';
import { colors, spacing, borderRadius } from '../theme/colors';
import { drawCard } from '../data';
import { TarotCard } from '../types/tarot';

// Optional: Import haptics if available
let Haptics: any = null;
try {
    Haptics = require('expo-haptics');
} catch (e) {
    console.log('Haptics not available');
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.7, 280);
const CARD_HEIGHT = CARD_WIDTH * 1.5;

type Stage = 'ritual' | 'story' | 'timeline';

interface CardData {
    card: TarotCard;
    position: string;
    meaning: string;
}

interface LoveReadingScreenProps {
    onClose?: () => void;
}

// Helper to parse **bold** markdown
function parseMeaningText(text: string) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            return (
                <Text key={index} style={{ fontWeight: '700' }}>
                    {boldText}
                </Text>
            );
        }
        return part;
    });
}

export const LoveReadingScreen = ({ onClose }: LoveReadingScreenProps) => {
    // Core state
    const [stage, setStage] = useState<Stage>('ritual');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [cardsData, setCardsData] = useState<CardData[]>([]);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [isLoadingMeanings, setIsLoadingMeanings] = useState(false);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const cardFlipAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const meaningFadeAnim = useRef(new Animated.Value(0)).current;
    const cardTransitionAnim = useRef(new Animated.Value(1)).current;

    // Fade in on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    // Pulse animation for unflipped cards
    useEffect(() => {
        if (stage === 'story' && !isCardFlipped) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [stage, isCardFlipped]);

    // Draw cards and fetch meanings
    const drawCardsAndFetchMeanings = async () => {
        console.log('=== DRAWING LOVE READING CARDS ===');

        // Draw 3 cards
        const draw1 = drawCard();
        const draw2 = drawCard([draw1.card.name]);
        const draw3 = drawCard([draw1.card.name, draw2.card.name]);

        const cards = [draw1.card, draw2.card, draw3.card];
        const positions = ['TY', 'PARTNER', 'VAŠE POUTO'];

        console.log('Cards drawn:', cards.map(c => c.name));

        // Fetch AI meanings
        setIsLoadingMeanings(true);
        try {
            const reading = await performReading({
                spreadName: 'Láska a vztahy',
                cards: cards.map((card, idx) => ({
                    name: card.name,
                    nameCzech: card.nameCzech,
                    position: 'upright',
                    label: positions[idx]
                })),
                question: 'Co je mezi námi?',
                mode: 'love'
            });

            console.log('API response:', reading);

            if (reading?.sections?.length === 3) {
                const cardsWithMeanings: CardData[] = cards.map((card, idx) => ({
                    card,
                    position: positions[idx],
                    meaning: reading.sections[idx].text
                }));
                setCardsData(cardsWithMeanings);
                console.log('Meanings loaded successfully');
            } else {
                console.error('Invalid API response structure');
            }
        } catch (error) {
            console.error('Error fetching meanings:', error);
        } finally {
            setIsLoadingMeanings(false);
        }

        // Move to story stage
        setStage('story');
    };

    // Handle card flip
    const handleCardFlip = () => {
        if (isCardFlipped) return; // Already flipped

        // Haptic feedback
        if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Flip animation
        Animated.timing(cardFlipAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Fade in meaning
        Animated.timing(meaningFadeAnim, {
            toValue: 1,
            duration: 800,
            delay: 400,
            useNativeDriver: true,
        }).start();

        setIsCardFlipped(true);
    };

    // Progress to next card
    const handleNextCard = () => {
        if (currentCardIndex >= 2) {
            // All cards revealed, go to timeline
            setStage('timeline');
            return;
        }

        // Haptic feedback
        if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Fade out current card
        Animated.timing(cardTransitionAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start(() => {
            // Move to next card
            setCurrentCardIndex(currentCardIndex + 1);
            setIsCardFlipped(false);

            // Reset animations
            cardFlipAnim.setValue(0);
            meaningFadeAnim.setValue(0);
            cardTransitionAnim.setValue(1);
        });
    };

    // Current card data
    const currentCard = cardsData[currentCardIndex];

    // Card rotation for flip effect
    const cardRotation = cardFlipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    // Ritual opening screen
    if (stage === 'ritual') {
        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    <Animated.View style={[styles.ritualContainer, { opacity: fadeAnim }]}>
                        <View style={styles.ritualContent}>
                            {/* DEBUG MARKER - REMOVE AFTER TESTING */}
                            <Text style={{ color: 'red', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
                                ✨ V2 - STORY MODE ✨
                            </Text>

                            <Ionicons name="heart" size={60} color={colors.lavender} />
                            <Text style={styles.ritualTitle}>Láska a vztahy</Text>
                            <Text style={styles.ritualDescription}>
                                Tři karty odhalí tvůj vnitřní svět, svět tvého partnera
                                a energii vašeho vztahu.
                            </Text>
                            <Text style={styles.ritualInstruction}>
                                Soustřeď se na svou otázku a když budeš připraven/á,
                                vytáhni karty.
                            </Text>

                            <TouchableOpacity
                                style={styles.beginButton}
                                onPress={drawCardsAndFetchMeanings}
                            >
                                <Text style={styles.beginButtonText}>Začít výklad</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    // Story Mode - One card at a time
    if (stage === 'story') {
        if (!currentCard) {
            return (
                <ImmersiveScreen screenName="LoveReading">
                    <SafeAreaView style={styles.container}>
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Vesmír skládá tvůj příběh...</Text>
                        </View>
                    </SafeAreaView>
                </ImmersiveScreen>
            );
        }

        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    <Animated.View
                        style={[
                            styles.storyContainer,
                            { opacity: cardTransitionAnim }
                        ]}
                    >
                        {/* Progress indicator */}
                        <View style={styles.progressContainer}>
                            {[0, 1, 2].map((idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.progressDot,
                                        idx === currentCardIndex && styles.progressDotActive,
                                        idx < currentCardIndex && styles.progressDotComplete,
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Position label */}
                        <Animated.View
                            style={[
                                styles.positionLabelContainer,
                                {
                                    opacity: cardFlipAnim,
                                    transform: [
                                        {
                                            translateY: cardFlipAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [20, 0],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <Text style={styles.positionLabel}>{currentCard.position}</Text>
                        </Animated.View>

                        {/* Card */}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={handleCardFlip}
                            disabled={isCardFlipped}
                        >
                            <Animated.View
                                style={[
                                    styles.cardWrapper,
                                    {
                                        transform: [
                                            { scale: isCardFlipped ? 1 : pulseAnim },
                                            { rotateY: cardRotation },
                                        ],
                                    },
                                ]}
                            >
                                <CardImage
                                    imageName={currentCard.card.imageName}
                                    width={CARD_WIDTH}
                                    height={CARD_HEIGHT}
                                    resizeMode="cover"
                                />

                                {/* Tap indicator when not flipped */}
                                {!isCardFlipped && (
                                    <View style={styles.tapIndicator}>
                                        <Ionicons name="hand-left-outline" size={24} color={colors.lavender} />
                                        <Text style={styles.tapText}>Ťukni pro výklad</Text>
                                    </View>
                                )}
                            </Animated.View>
                        </TouchableOpacity>

                        {/* Card name (appears on flip) */}
                        {isCardFlipped && (
                            <Animated.View
                                style={[
                                    styles.cardNameContainer,
                                    { opacity: meaningFadeAnim }
                                ]}
                            >
                                <Text style={styles.cardName}>
                                    {currentCard.card.nameCzech || currentCard.card.name}
                                </Text>
                            </Animated.View>
                        )}

                        {/* Meaning (appears on flip) */}
                        {isCardFlipped && (
                            <Animated.View
                                style={[
                                    styles.meaningContainer,
                                    { opacity: meaningFadeAnim }
                                ]}
                            >
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    style={styles.meaningScroll}
                                >
                                    <Text style={styles.meaningText}>
                                        {parseMeaningText(currentCard.meaning)}
                                    </Text>
                                </ScrollView>
                            </Animated.View>
                        )}

                        {/* Next button (heart icon) */}
                        {isCardFlipped && (
                            <Animated.View
                                style={[
                                    styles.nextButtonContainer,
                                    { opacity: meaningFadeAnim }
                                ]}
                            >
                                <TouchableOpacity
                                    style={styles.nextButton}
                                    onPress={handleNextCard}
                                >
                                    <Ionicons name="heart" size={24} color="#fff" />
                                    <Text style={styles.nextButtonText}>
                                        {currentCardIndex === 2 ? 'Celý výklad' : ''}
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </Animated.View>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    // Timeline View - All cards visible
    if (stage === 'timeline') {
        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    <ScrollView
                        style={styles.timelineScrollContainer}
                        contentContainerStyle={styles.timelineScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.timelineTitle}>Láska a vztahy</Text>
                        <Text style={styles.timelineSubtitle}>Tvůj kompletní výklad</Text>

                        {/* All cards in timeline */}
                        {cardsData.map((cardData, idx) => (
                            <View key={idx} style={styles.timelineCard}>
                                {/* Position label */}
                                <View style={styles.timelinePositionContainer}>
                                    <Text style={styles.timelinePosition}>{cardData.position}</Text>
                                </View>

                                {/* Card image (smaller) */}
                                <View style={styles.timelineCardImageWrapper}>
                                    <CardImage
                                        imageName={cardData.card.imageName}
                                        width={CARD_WIDTH * 0.6}
                                        height={CARD_HEIGHT * 0.6}
                                        resizeMode="cover"
                                    />
                                </View>

                                {/* Card name */}
                                <Text style={styles.timelineCardName}>
                                    {cardData.card.nameCzech || cardData.card.name}
                                </Text>

                                {/* Meaning */}
                                <View style={styles.timelineMeaningContainer}>
                                    <Text style={styles.timelineMeaningText}>
                                        {parseMeaningText(cardData.meaning)}
                                    </Text>
                                </View>

                                {/* Connection line (except for last card) */}
                                {idx < cardsData.length - 1 && (
                                    <View style={styles.connectionLine} />
                                )}
                            </View>
                        ))}

                        {/* Close button */}
                        <TouchableOpacity
                            style={styles.timelineDoneButton}
                            onPress={onClose}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.timelineDoneButtonText}>Zavřít výklad</Text>
                        </TouchableOpacity>

                        <View style={{ height: 60 }} />
                    </ScrollView>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    return null;
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ===== RITUAL STAGE =====
    ritualContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    ritualContent: {
        alignItems: 'center',
        maxWidth: 400,
    },
    ritualTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    ritualDescription: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.lg,
    },
    ritualInstruction: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: spacing.xl,
    },
    beginButton: {
        backgroundColor: colors.lavender,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        shadowColor: colors.lavender,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    beginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== STORY STAGE =====
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
    },
    storyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    progressContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
        position: 'absolute',
        top: 100,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    progressDotActive: {
        backgroundColor: colors.lavender,
        width: 24,
    },
    progressDotComplete: {
        backgroundColor: 'rgba(186, 148, 240, 0.6)',
    },
    positionLabelContainer: {
        marginBottom: spacing.md,
    },
    positionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.lavender,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    cardWrapper: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    tapIndicator: {
        position: 'absolute',
        bottom: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    tapText: {
        marginLeft: spacing.xs,
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    cardNameContainer: {
        marginBottom: spacing.md,
    },
    cardName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    meaningContainer: {
        flex: 1,
        maxHeight: SCREEN_HEIGHT * 0.3,
        width: '100%',
    },
    meaningScroll: {
        flex: 1,
    },
    meaningText: {
        fontSize: 15,
        lineHeight: 24,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },
    nextButtonContainer: {
        marginTop: spacing.lg,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.lavender,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        shadowColor: colors.lavender,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        gap: spacing.sm,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== TIMELINE STAGE =====
    timelineScrollContainer: {
        flex: 1,
    },
    timelineScrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 100,
        alignItems: 'center',
    },
    timelineTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    timelineSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    timelineCard: {
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    timelinePositionContainer: {
        marginBottom: spacing.sm,
    },
    timelinePosition: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.lavender,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    timelineCardImageWrapper: {
        marginBottom: spacing.md,
    },
    timelineCardName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    timelineMeaningContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        width: '100%',
    },
    timelineMeaningText: {
        fontSize: 14,
        lineHeight: 22,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'left',
    },
    connectionLine: {
        width: 2,
        height: 40,
        backgroundColor: 'rgba(186, 148, 240, 0.3)',
        marginTop: spacing.lg,
    },
    timelineDoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.lavender,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.full,
        marginTop: spacing.xl,
        shadowColor: colors.lavender,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        gap: spacing.sm,
    },
    timelineDoneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== SHARED =====
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
});
