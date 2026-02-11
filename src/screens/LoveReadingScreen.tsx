/**
 * LoveReadingScreen.tsx - BEAUTIFUL VERSION
 * 
 * 3-CARD LOVE READING - ONE CARD PER SCREEN
 * ✨ Glass-morphism design
 * ✨ Position subheadlines  
 * ✨ Pink romantic theme
 * ✨ Watercolor background
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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { CardImage } from '../components/CardImage';
import { performReading } from '../services/universe';
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
    subheadline: string;
    meaning: string;
}

interface LoveReadingScreenProps {
    onClose?: () => void;
}

// Position data with subheadlines
const POSITIONS = [
    {
        label: 'TY',
        subheadline: 'Tvá očekávání a emoce',
        apiLabel: 'TY'
    },
    {
        label: 'PARTNER',
        subheadline: 'Druhá strana mince',
        apiLabel: 'PARTNER'
    },
    {
        label: 'VAŠE POUTO',
        subheadline: 'Jak vám to funguje',
        apiLabel: 'VAŠE POUTO'
    }
];

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
    console.log('🎯 BEAUTIFUL LOVE READING SCREEN LOADED 🎯');

    const [stage, setStage] = useState<Stage>('ritual');
    const [cardsData, setCardsData] = useState<CardData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Individual flip states for each card
    const [tyFlipped, setTyFlipped] = useState(false);
    const [partnerFlipped, setPartnerFlipped] = useState(false);
    const [poutoFlipped, setPoutoFlipped] = useState(false);

    const glowAnim = useRef(new Animated.Value(0)).current;

    // Glow animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    // Draw cards and fetch meanings
    const handleStartReading = async () => {
        console.log('=== DRAWING LOVE READING CARDS ===');
        setIsLoading(true);

        // Draw 3 cards
        const draw1 = drawCard();
        const draw2 = drawCard([draw1.card.name]);
        const draw3 = drawCard([draw1.card.name, draw2.card.name]);

        const cards = [draw1.card, draw2.card, draw3.card];

        console.log('Cards drawn:', cards.map(c => c.name));

        // Clear previous errors and Fetch AI meanings (simple HEAD-style logic: expect 3 sections)
        try {
            setApiError(null);
            const reading = await performReading({
                spreadName: 'Láska a vztahy',
                cards: cards.map((card, idx) => ({
                    name: card.name,
                    nameCzech: card.nameCzech,
                    position: 'upright',
                    label: POSITIONS[idx].apiLabel
                })),
                question: 'Co je mezi námi?',
                mode: 'love_3_card'
            });

            console.log('API response:', reading);

            // Expect ideally 3 sections (TY, PARTNER, VAŠE POUTO).
            // Minimal fallback: use whatever text is available and fill missing slots with a placeholder.
            const sections = reading?.sections || [];
            if (sections.length >= 3) {
                const meanings = sections.map((s: any) => s.text);
                const cardsWithMeanings: CardData[] = cards.map((card, idx) => ({
                    card,
                    position: POSITIONS[idx].label,
                    subheadline: POSITIONS[idx].subheadline,
                    meaning: meanings[idx]
                }));
                setCardsData(cardsWithMeanings);
                setStage('ty');
            } else if (sections.length > 0) {
                // Try to salvage: collect all available text and attempt a simple split into up to 3 parts.
                const allText = sections.map((s: any) => s.text).join('\n\n');
                // Split by double newlines as a lightweight delimiter
                const parts = allText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
                const meanings: string[] = [];
                for (let i = 0; i < 3; i++) {
                    meanings[i] = parts[i] || sections[i]?.text || 'Význam nedostupný';
                }
                const cardsWithMeanings: CardData[] = cards.map((card, idx) => ({
                    card,
                    position: POSITIONS[idx].label,
                    subheadline: POSITIONS[idx].subheadline,
                    meaning: meanings[idx]
                }));
                setCardsData(cardsWithMeanings);
                setStage('ty');
            } else {
                console.error('Unexpected API response structure, no sections returned', reading);
                setApiError('Nepodařilo se získat plný výklad. Zkusit znovu?');
            }
        } catch (error) {
            console.error('Error fetching meanings:', error);
            setApiError('Chyba při komunikaci se serverem. Zkusit znovu?');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        setApiError(null);
        handleStartReading();
    };

    const glowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(236, 72, 153, 0.3)', 'rgba(236, 72, 153, 0.6)'],
    });

    // ===============================
    // RITUAL SCREEN
    // ===============================
    if (stage === 'ritual') {
        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    {/* Darkening overlay */}
                    <View style={styles.darkOverlay} />

                    <View style={styles.ritualContainer}>
                        {/* Title */}
                        <Text style={styles.mainTitle}>Lásky, vztahy,{'\n'}spojení</Text>

                        {/* Glass-morphic card */}
                        <Animated.View style={[styles.glassCard, { shadowColor: glowColor }]}>
                            <BlurView intensity={20} tint="light" style={styles.blurContainer}>
                                {/* Heart icon */}
                                <View style={styles.heartIconContainer}>
                                    <Ionicons name="heart" size={48} color="#ec4899" />
                                </View>

                                {/* Subtitle */}
                                <Text style={styles.glassCardSubtitle}>
                                    Ty · Partner · Vaše pouto
                                </Text>

                                {/* Button */}
                                <TouchableOpacity
                                    style={styles.revealButton}
                                    onPress={handleStartReading}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={['#ec4899', '#db2777']}
                                        style={styles.gradientButton}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.revealButtonText}>Odhal karty</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </BlurView>
                        </Animated.View>

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
                apiError={apiError}
                onRetry={handleRetry}
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
                apiError={apiError}
                onRetry={handleRetry}
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
                apiError={apiError}
                onRetry={handleRetry}
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
                    {/* Light overlay for summary */}
                    <View style={styles.summaryOverlay} />

                    <ScrollView
                        style={styles.timelineScrollContainer}
                        contentContainerStyle={styles.timelineScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.timelineTitle}>Váš milostný výklad</Text>
                        <Text style={styles.timelineSubtitle}>Cesta vaší lásky</Text>

                        {/* All cards in timeline */}
                        {cardsData.map((cardData, idx) => (
                            <View key={idx}>
                                <BlurView intensity={30} tint="light" style={styles.timelineCard}>
                                    <View style={styles.timelineCardHeader}>
                                        <CardImage
                                            imageName={cardData.card.imageName}
                                            width={70}
                                            height={105}
                                        />
                                        <View style={styles.timelineCardTitles}>
                                            <Text style={styles.timelinePosition}>
                                                {cardData.position}
                                            </Text>
                                            <Text style={styles.timelineSubheadline}>
                                                {cardData.subheadline}
                                            </Text>
                                            <Text style={styles.timelineCardName}>
                                                {cardData.card.nameCzech || cardData.card.name}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.timelineMeaning}>
                                        {parseMeaningText(cardData.meaning)}
                                    </Text>
                                </BlurView>
                                {idx < cardsData.length - 1 && (
                                    <View style={styles.connectionLine} />
                                )}
                            </View>
                        ))}

                        <TouchableOpacity
                            style={styles.doneButtonLarge}
                            onPress={onClose}
                        >
                            <LinearGradient
                                colors={['#ec4899', '#db2777']}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.doneButtonText}>Zavřít</Text>
                            </LinearGradient>
                        </TouchableOpacity>
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
    apiError?: string | null;
    onRetry?: () => void;
}

const CardReadingDisplay = ({
    cardData,
    isFlipped,
    onFlip,
    onNext,
    nextButtonText,
    onClose
    , apiError, onRetry
}: CardReadingDisplayProps) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const meaningFadeAnim = useRef(new Animated.Value(0)).current;

    // Pulse animation when not flipped
    useEffect(() => {
        if (!isFlipped) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            // Fade in meaning after flip
            Animated.timing(meaningFadeAnim, {
                toValue: 1,
                duration: 800,
                delay: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isFlipped]);

    const handleFlip = () => {
        if (isFlipped) return;

        // Haptic feedback
        if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        onFlip();
    };

    return (
        <ImmersiveScreen screenName="LoveReading">
            <SafeAreaView style={styles.container}>
                {/* Darker overlay for card stages */}
                <View style={styles.storyOverlay} />

                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Position label and subheadline */}
                    <View style={styles.labelContainer}>
                        <Text style={styles.positionLabel}>{cardData.position}</Text>
                        <Text style={styles.subheadline}>{cardData.subheadline}</Text>
                    </View>

                    {/* Card */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleFlip}
                        disabled={isFlipped}
                        style={styles.cardTouchable}
                    >
                        {!isFlipped ? (
                            // Face-down card with pulse
                            <Animated.View style={[styles.cardBack, { transform: [{ scale: pulseAnim }] }]}>
                                <LinearGradient
                                    colors={['rgba(236, 72, 153, 0.3)', 'rgba(219, 39, 119, 0.3)']}
                                    style={styles.cardBackGradient}
                                >
                                    <Text style={styles.cardBackEmoji}>💕</Text>
                                    <View style={styles.cardBackPattern}>
                                        {[...Array(5)].map((_, i) => (
                                            <Text key={i} style={styles.cardBackStar}>✨</Text>
                                        ))}
                                    </View>
                                </LinearGradient>
                            </Animated.View>
                        ) : (
                            // Revealed card
                            <View style={styles.cardFront}>
                                <CardImage
                                    imageName={cardData.card.imageName}
                                    width={280}
                                    height={420}
                                    resizeMode="cover"
                                />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Card name and meaning (appears after flip) */}
                    {isFlipped && (
                        <Animated.View style={{ opacity: meaningFadeAnim }}>
                            <Text style={styles.cardName}>
                                {cardData.card.nameCzech || cardData.card.name}
                            </Text>
                            <View style={styles.divider} />
                            <View style={styles.meaningContainer}>
                                <Text style={styles.meaningText}>
                                    {parseMeaningText(cardData.meaning)}
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Next button (appears after flip) */}
                    {isFlipped && (
                        <Animated.View style={{ opacity: meaningFadeAnim }}>
                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={onNext}
                            >
                                <LinearGradient
                                    colors={['#ec4899', '#db2777']}
                                    style={styles.gradientButton}
                                >
                                    <Text style={styles.nextButtonText}>{nextButtonText}</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </ScrollView>

                {apiError && (
                    <View style={styles.errorOverlay} pointerEvents="box-none">
                        <BlurView intensity={60} tint="light" style={styles.errorCard}>
                            <Text style={styles.errorTitle}>Chyba</Text>
                            <Text style={styles.errorText}>{apiError}</Text>
                            <View style={styles.errorButtons}>
                                <TouchableOpacity style={styles.errorButton} onPress={onRetry}>
                                    <Text style={styles.errorButtonText}>Zkusit znovu</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.errorButton, styles.errorCloseButton]} onPress={onClose}>
                                    <Text style={styles.errorButtonText}>Zavřít</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </View>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>
        </ImmersiveScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 0,
    },
    storyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 0,
    },
    summaryOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: 0,
    },

    // ===== RITUAL STAGE =====
    ritualContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        zIndex: 1,
    },
    mainTitle: {
        fontSize: 42,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: spacing.xxl,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
        letterSpacing: -0.5,
    },
    glassCard: {
        width: '90%',
        maxWidth: 380,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 10,
    },
    blurContainer: {
        padding: spacing.xxl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 24,
    },
    heartIconContainer: {
        marginBottom: spacing.lg,
    },
    glassCardSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(0, 0, 0, 0.8)',
        marginBottom: spacing.md,
        letterSpacing: 1,
    },
    glassCardDescription: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.7)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    revealButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    gradientButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    revealButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== CARD DISPLAY STAGE =====
    scrollContainer: {
        flex: 1,
        zIndex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingTop: 100,
        alignItems: 'center',
    },
    labelContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    positionLabel: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 3,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: spacing.xs,
    },
    subheadline: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        fontStyle: 'italic',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    cardTouchable: {
        marginBottom: spacing.lg,
    },
    cardBack: {
        width: 280,
        height: 420,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 10,
    },
    cardBackGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    cardBackEmoji: {
        fontSize: 64,
        marginBottom: 20,
    },
    tapToRevealText: {
        fontSize: 16,
        color: '#ec4899',
        fontWeight: '600',
    },
    cardBackPattern: {
        position: 'absolute',
        bottom: 30,
        flexDirection: 'row',
        gap: 15,
    },
    cardBackStar: {
        fontSize: 20,
        opacity: 0.4,
    },
    cardFront: {
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 10,
        borderRadius: 20,
    },
    cardName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: '#ec4899',
        alignSelf: 'center',
        marginVertical: spacing.md,
        opacity: 0.8,
    },
    meaningContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.3)',
    },
    meaningText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
        textAlign: 'center',
    },
    nextButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: spacing.xl,
    },
    nextButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== TIMELINE STAGE =====
    timelineScrollContainer: {
        flex: 1,
        zIndex: 1,
    },
    timelineScrollContent: {
        padding: spacing.lg,
        paddingTop: 100,
        paddingBottom: 40,
    },
    timelineTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    timelineSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    timelineCard: {
        borderRadius: 20,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
    },
    timelineCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    timelineCardTitles: {
        flex: 1,
    },
    timelinePosition: {
        fontSize: 12,
        color: '#ec4899',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    timelineSubheadline: {
        fontSize: 11,
        color: '#6b7280',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    timelineCardName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    timelineMeaning: {
        fontSize: 14,
        lineHeight: 21,
        color: '#374151',
    },
    connectionLine: {
        width: 2,
        height: 30,
        backgroundColor: 'rgba(236, 72, 153, 0.3)',
        alignSelf: 'center',
        marginVertical: spacing.xs,
    },
    doneButtonLarge: {
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    doneButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== SHARED =====
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        paddingHorizontal: spacing.lg,
    },
    errorCard: {
        width: '100%',
        maxWidth: 360,
        padding: spacing.lg,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: spacing.sm,
        color: '#1f2937',
    },
    errorText: {
        fontSize: 14,
        color: '#374151',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    errorButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    errorButton: {
        backgroundColor: '#ec4899',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 10,
    },
    errorCloseButton: {
        backgroundColor: 'rgba(0,0,0,0.12)'
    },
    errorButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
