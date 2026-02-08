/**
 * LoveReadingScreen.tsx
 * 
 * 3-CARD LOVE READING - ONE CARD PER SCREEN
 * 
 * Flow:
 * 1. Ritual screen → "Začít výklad"
 * 2. Screen: TY → Face-down card (pulsing) → Tap to flip → Meaning → "Další karta"
 * 3. Screen: PARTNER → Face-down card (pulsing) → Tap to flip → Meaning → "Další karta"
 * 4. Screen: VAŠE POUTO → Face-down card (pulsing) → Tap to flip → Meaning → "Zobrazit celý výklad"
 * 5. Timeline → All 3 cards + meanings together
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    Animated,
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

type Stage = 'ritual' | 'ty' | 'partner' | 'pouto' | 'timeline';

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
    console.log('🎯🎯🎯 LOVE READING - ONE CARD PER SCREEN VERSION 🎯🎯🎯');

    const [stage, setStage] = useState<Stage>('ritual');
    const [cardsData, setCardsData] = useState<CardData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Individual flip states for each card
    const [tyFlipped, setTyFlipped] = useState(false);
    const [partnerFlipped, setPartnerFlipped] = useState(false);
    const [poutoFlipped, setPoutoFlipped] = useState(false);

    // Draw cards and fetch meanings
    const handleStartReading = async () => {
        console.log('=== DRAWING LOVE READING CARDS ===');
        setIsLoading(true);

        // Draw 3 cards
        const draw1 = drawCard();
        const draw2 = drawCard([draw1.card.name]);
        const draw3 = drawCard([draw1.card.name, draw2.card.name]);

        const cards = [draw1.card, draw2.card, draw3.card];
        const positions = ['TY', 'PARTNER', 'VAŠE POUTO'];

        console.log('Cards drawn:', cards.map(c => c.name));

        // Fetch AI meanings
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
                mode: 'love_3_card'
            });

            console.log('API response:', reading);

            if (reading?.sections?.length === 3) {
                const cardsWithMeanings: CardData[] = cards.map((card, idx) => ({
                    card,
                    position: positions[idx],
                    meaning: reading.sections[idx].text
                }));
                setCardsData(cardsWithMeanings);
                setStage('ty'); // Move to first card screen
                console.log('Meanings loaded, moving to TY screen');
            } else {
                console.error('Invalid API response structure');
            }
        } catch (error) {
            console.error('Error fetching meanings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ===============================
    // RITUAL STAGE
    // ===============================
    if (stage === 'ritual') {
        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    <View style={styles.ritualContainer}>
                        <View style={styles.ritualContent}>
                            <Ionicons name="heart" size={60} color={colors.lavender} />
                            <Text style={styles.ritualTitle}>Láska a vztahy</Text>
                            <Text style={styles.ritualDescription}>
                                Odhal vaši dynamiku
                            </Text>
                            <Text style={styles.ritualInstruction}>
                                Tři karty odhalí tvůj vnitřní svět, svět tvého partnera
                                a energii vašeho vztahu.
                            </Text>

                            {/* Small face-down card icon */}
                            <View style={styles.faceDownCard}>
                                <Ionicons name="albums-outline" size={80} color={colors.lavender} />
                            </View>

                            <TouchableOpacity
                                style={styles.beginButton}
                                onPress={handleStartReading}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.beginButtonText}>Začít výklad</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    // ===============================
    // TY SCREEN
    // ===============================
    if (stage === 'ty') {
        if (!cardsData[0]) return null;
        return (
            <CardReadingDisplay
                cardData={cardsData[0]}
                isFlipped={tyFlipped}
                onFlip={() => setTyFlipped(true)}
                onNext={() => setStage('partner')}
                nextButtonText="Další karta"
                onClose={onClose}
            />
        );
    }

    // ===============================
    // PARTNER SCREEN
    // ===============================
    if (stage === 'partner') {
        if (!cardsData[1]) return null;
        return (
            <CardReadingDisplay
                cardData={cardsData[1]}
                isFlipped={partnerFlipped}
                onFlip={() => setPartnerFlipped(true)}
                onNext={() => setStage('pouto')}
                nextButtonText="Další karta"
                onClose={onClose}
            />
        );
    }

    // ===============================
    // POUTO SCREEN
    // ===============================
    if (stage === 'pouto') {
        if (!cardsData[2]) return null;
        return (
            <CardReadingDisplay
                cardData={cardsData[2]}
                isFlipped={poutoFlipped}
                onFlip={() => setPoutoFlipped(true)}
                onNext={() => setStage('timeline')}
                nextButtonText="Zobrazit celý výklad"
                onClose={onClose}
            />
        );
    }

    // ===============================
    // TIMELINE VIEW
    // ===============================
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
                                        width={168}
                                        height={252}
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

                        {/* Done button */}
                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={onClose}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.doneButtonText}>Zavřít výklad</Text>
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


// ===============================
// CARD SCREEN COMPONENT
// ===============================
interface CardReadingDisplayProps {
    cardData: CardData;
    isFlipped: boolean;
    onFlip: () => void;
    onNext: () => void;
    nextButtonText: string;
    onClose?: () => void;
}

const CardReadingDisplay = ({
    cardData,
    isFlipped,
    onFlip,
    onNext,
    nextButtonText,
    onClose
}: CardReadingDisplayProps) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const flipAnim = useRef(new Animated.Value(0)).current;
    const meaningFadeAnim = useRef(new Animated.Value(0)).current;

    // Pulse animation when not flipped
    useEffect(() => {
        if (!isFlipped) {
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
    }, [isFlipped]);

    const handleFlip = () => {
        if (isFlipped) return;

        // Haptic feedback
        if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Flip animation
        Animated.timing(flipAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Fade in meaning after flip
        Animated.timing(meaningFadeAnim, {
            toValue: 1,
            duration: 800,
            delay: 400,
            useNativeDriver: true,
        }).start();

        onFlip();
    };

    const cardRotation = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <ImmersiveScreen screenName="LoveReading">
            <SafeAreaView style={styles.container}>
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Position label */}
                    <View style={styles.positionLabelContainer}>
                        <Text style={styles.positionLabel}>{cardData.position}</Text>
                    </View>

                    {/* Card */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleFlip}
                        disabled={isFlipped}
                    >
                        <Animated.View
                            style={[
                                styles.cardWrapper,
                                {
                                    transform: [
                                        { scale: isFlipped ? 1 : pulseAnim },
                                        { rotateY: cardRotation },
                                    ],
                                },
                            ]}
                        >
                            {/* Show face-down card or actual card */}
                            {!isFlipped ? (
                                <View style={styles.faceDownCardBig}>
                                    <Ionicons name="albums-outline" size={120} color={colors.lavender} />
                                    <Text style={styles.tapToRevealText}>Ťukni pro odhalení</Text>
                                </View>
                            ) : (
                                <CardImage
                                    imageName={cardData.card.imageName}
                                    width={280}
                                    height={420}
                                    resizeMode="cover"
                                />
                            )}
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Card name (appears after flip) */}
                    {isFlipped && (
                        <Animated.View style={{ opacity: meaningFadeAnim }}>
                            <Text style={styles.cardName}>
                                {cardData.card.nameCzech || cardData.card.name}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Meaning (appears after flip) */}
                    {isFlipped && (
                        <Animated.View
                            style={[styles.meaningContainer, { opacity: meaningFadeAnim }]}
                        >
                            <Text style={styles.meaningText}>
                                {parseMeaningText(cardData.meaning)}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Next button (appears after flip) */}
                    {isFlipped && (
                        <Animated.View style={{ opacity: meaningFadeAnim }}>
                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={onNext}
                            >
                                <Text style={styles.nextButtonText}>{nextButtonText}</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>
        </ImmersiveScreen>
    );
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        padding: spacing.xl,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    ritualTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    ritualDescription: {
        fontSize: 22,
        fontWeight: '600',
        color: '#FFE4E1', // Misty Rose for better contrast
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    ritualInstruction: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    faceDownCard: {
        marginBottom: spacing.xl,
        opacity: 0.6,
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
        minWidth: 150,
        alignItems: 'center',
    },
    beginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== CARD SCREENS =====
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 100,
        alignItems: 'center',
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
        marginBottom: spacing.lg,
    },
    faceDownCardBig: {
        width: 280,
        height: 420,
        backgroundColor: 'rgba(186, 148, 240, 0.1)',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.lavender,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tapToRevealText: {
        marginTop: spacing.md,
        fontSize: 14,
        fontWeight: '600',
        color: colors.lavender,
    },
    cardName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    meaningContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        width: '100%',
        marginBottom: spacing.xl,
    },
    meaningText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#fff',
        textAlign: 'left',
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

    // ===== TIMELINE VIEW =====
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
    doneButton: {
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
    doneButtonText: {
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
