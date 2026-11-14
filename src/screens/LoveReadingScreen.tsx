/**
 * LoveReadingScreen.tsx - COMPLETE & FIXED
 * 
 * ✨ Beautiful flower background
 * ✨ Custom fonts (Caveat + Cormorant)
 * ✨ Validated interpretations mapped by stable section keys
 * ✨ Loading messages
 * ✨ Card names showing everywhere
 * ✨ Proper button sizes
 * ✨ Readable timeline
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
import { LinearGradient } from 'expo-linear-gradient';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { CardImage } from '../components/CardImage';
import { performReading, ReadingRequest } from '../services/universe';
import { getLoveSections, LoveReadingError, normalizeReadingSynthesis } from '../services/loveReading';
import { colors, spacing, borderRadius } from '../theme/colors';
import { allCards, drawCard } from '../data';
import { TarotCard } from '../types/tarot';
import { useFonts } from '../hooks/useFonts';

// Optional: Import haptics if available
let Haptics: any = null;
try {
    Haptics = require('expo-haptics');
} catch (e) {
}

type Stage = 'ritual' | 'error' | 'ty' | 'partner' | 'pouto' | 'timeline';

interface CardData {
    card: TarotCard;
    position: string;
    subheadline: string;
    meaning?: string;
}

interface LoveReadingScreenProps {
    onClose?: () => void;
}

// Position data
const POSITIONS = [
    { key: 'ty', label: 'TY', subheadline: 'Tvá očekávání a emoce', apiLabel: 'TY' },
    { key: 'partner', label: 'PARTNER', subheadline: 'Druhá strana mince', apiLabel: 'PARTNER' },
    { key: 'vztah', label: 'VAŠE POUTO', subheadline: 'Jak vám to funguje', apiLabel: 'VAŠE POUTO' }
] as const;

const LOADING_MESSAGES = [
    'Připravuju karty',
    'Tvůj výklad je na cestě',
    'Skládám tvůj příběh'
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
    
    const fontsLoaded = useFonts();
    const [stage, setStage] = useState<Stage>('ritual');
    const [cardsData, setCardsData] = useState<CardData[]>([]);
    const [synthesis, setSynthesis] = useState<string | undefined>();
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [readingError, setReadingError] = useState('');
    const [isReadingPending, setIsReadingPending] = useState(false);
    const retryAllowed = useRef(false);
    const pendingReading = useRef<{ cards: TarotCard[]; request: ReadingRequest } | null>(null);
    const requestId = useRef(0);
    const activeRequest = useRef<AbortController | null>(null);
    const mounted = useRef(true);

    const cancelReading = () => {
        requestId.current += 1;
        activeRequest.current?.abort();
        activeRequest.current = null;
    };
    const disposeReading = () => {
        mounted.current = false;
        cancelReading();
    };
    const handleCancelReading = () => {
        cancelReading();
        if (!mounted.current) return;
        retryAllowed.current = true;
        setIsReadingPending(false);
        setReadingError(new LoveReadingError('aborted').message);
        setStage('error');
        onClose?.();
    };
    useEffect(() => {
        mounted.current = true;
        return disposeReading;
    }, []);
    
    // Individual flip states
    const [tyFlipped, setTyFlipped] = useState(false);
    const [partnerFlipped, setPartnerFlipped] = useState(false);
    const [poutoFlipped, setPoutoFlipped] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Fonts fade-in
    useEffect(() => {
        if (fontsLoaded) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true
            }).start();
        }
    }, [fontsLoaded]);

    // Cycle loading messages
    useEffect(() => {
        if (isReadingPending) {
            const interval = setInterval(() => {
                setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isReadingPending]);

    const runStoredReading = async () => {
        if (!mounted.current || !pendingReading.current || activeRequest.current) return;
        retryAllowed.current = false;
        cancelReading();
        const id = requestId.current;
        const controller = new AbortController();
        activeRequest.current = controller;
        const { cards, request } = pendingReading.current;
        const isCurrent = () => mounted.current && requestId.current === id && !controller.signal.aborted;
        setReadingError('');
        setIsReadingPending(true);
        setStage('ty');
        try {
            const reading = await performReading(request, { signal: controller.signal });
            if (!isCurrent()) return;
            const meanings = getLoveSections(reading);
            const cardsWithMeanings: CardData[] = cards.map((card, idx) => ({
                card,
                position: POSITIONS[idx].label,
                subheadline: POSITIONS[idx].subheadline,
                meaning: meanings[POSITIONS[idx].key]
            }));
            setCardsData(cardsWithMeanings);
            setSynthesis(normalizeReadingSynthesis(reading.synthesis));
        } catch (error) {
            if (!isCurrent()) return;
            retryAllowed.current = true;
            setReadingError(error instanceof LoveReadingError ? error.message : 'Výklad se nepodařilo načíst. Zkus to prosím znovu.');
            setStage('error');
        } finally {
            if (requestId.current === id) {
                activeRequest.current = null;
                if (mounted.current) setIsReadingPending(false);
            }
        }
    };

    const handleRetryReading = () => {
        if (!retryAllowed.current) return;
        return runStoredReading();
    };

    // Only a new ritual draws cards; retries reuse this exact request snapshot.
    const handleStartReading = async () => {
        if (!mounted.current || pendingReading.current || activeRequest.current) return;

        const draws: ReturnType<typeof drawCard>[] = [];
        for (let i = 0; i < POSITIONS.length; i++) {
            const remainingIds = allCards
                .filter(card => !draws.some(draw => draw.card.id === card.id))
                .map(card => card.id);
            draws.push(drawCard(remainingIds));
        }
        const cards = draws.map(draw => Object.freeze({ ...draw.card }));

        pendingReading.current = {
            cards,
            request: {
                spreadName: 'Láska a vztahy',
                cards: cards.map((card, idx) => ({
                    name: card.name,
                    nameCzech: card.nameCzech,
                    position: draws[idx].position,
                    label: POSITIONS[idx].apiLabel
                })),
                question: 'Co je mezi námi?',
                mode: 'love_3_card'
            }
        };
        // Freeze the payload once. Retries reuse this exact snapshot.
        pendingReading.current.request.cards.forEach(Object.freeze);
        Object.freeze(pendingReading.current.request.cards);
        Object.freeze(pendingReading.current.request);
        Object.freeze(cards);
        Object.freeze(pendingReading.current);
        setCardsData(cards.map((card, idx) => ({
            card, position: POSITIONS[idx].label, subheadline: POSITIONS[idx].subheadline,
        })));
        setSynthesis(undefined);
        setTyFlipped(false);
        setPartnerFlipped(false);
        setPoutoFlipped(false);
        await runStoredReading();
    };

    // Wait for fonts
    if (!fontsLoaded) {
        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    // ===============================
    // RITUAL SCREEN
    // ===============================
    if (stage === 'ritual' || stage === 'error') {
        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    <Animated.View style={[styles.ritualContent, { opacity: fadeAnim }]}>
                        {/* Main Title */}
                        <Text style={styles.mainTitle}>lásky a vztahy</Text>

                        {/* Subtitle */}
                        <Text style={styles.subtitle}>ty · partner · vaše pouto</Text>
                        {stage === 'error' && (
                            <Text accessibilityRole="alert" style={styles.subtitle}>{readingError}</Text>
                        )}

                        {/* Button */}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={stage === 'error' ? handleRetryReading : handleStartReading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>{stage === 'error' ? 'Zkusit znovu se stejnými kartami' : 'Odhal karty'}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    // ===============================
    // CARD SCREENS (TY/PARTNER/POUTO)
    // ===============================
    if (stage === 'ty' || stage === 'partner' || stage === 'pouto') {
        const cardIndex = stage === 'ty' ? 0 : stage === 'partner' ? 1 : 2;
        const currentCard = cardsData[cardIndex];
        const isFlipped = stage === 'ty' ? tyFlipped : stage === 'partner' ? partnerFlipped : poutoFlipped;
        const setFlipped = stage === 'ty' ? setTyFlipped : stage === 'partner' ? setPartnerFlipped : setPoutoFlipped;
        const nextStage = stage === 'ty' ? 'partner' : stage === 'partner' ? 'pouto' : 'timeline';
        const nextButtonText = stage === 'pouto' ? 'Zobrazit celý výklad' : 'Další';

        if (!currentCard) return null;

        return (
            <CardReadingDisplay
                cardData={currentCard}
                isFlipped={isFlipped}
                onFlip={() => setFlipped(true)}
                onNext={() => { if (isFlipped && currentCard.meaning) setStage(nextStage as Stage); }}
                nextButtonText={nextButtonText}
                loadingMessage={LOADING_MESSAGES[loadingMessageIndex]}
                onClose={handleCancelReading}
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
                    {/* Pink overlay for readability */}
                    <View style={styles.timelineOverlay} />
                    
                    <ScrollView
                        style={styles.timelineScrollContainer}
                        contentContainerStyle={styles.timelineScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Title */}
                        <View style={styles.timelineTitleContainer}>
                            <Text style={styles.timelineTitle}>Váš milostný výklad</Text>
                            <Text style={styles.timelineSubtitle}>Cesta vaší lásky</Text>
                        </View>

                        {/* All cards in timeline */}
                        {cardsData.map((cardData, idx) => (
                            <View key={idx} style={styles.timelineCard}>
                                {/* Position + Subheadline */}
                                <View style={styles.timelineHeader}>
                                    <Text style={styles.timelinePosition}>{cardData.position}</Text>
                                    <Text style={styles.timelineSubheadline}>{cardData.subheadline}</Text>
                                </View>

                                {/* Card image */}
                                <View style={styles.timelineCardImageWrapper}>
                                    <CardImage
                                        imageName={cardData.card.imageName}
                                        width={120}
                                        height={180}
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
                                        {parseMeaningText(cardData.meaning || '')}
                                    </Text>
                                </View>

                                {/* Connection line */}
                                {idx < cardsData.length - 1 && (
                                    <View style={styles.connectionLine} />
                                )}
                            </View>
                        ))}

                        {synthesis && (
                            <View style={styles.timelineCard}>
                                <Text style={styles.timelinePosition}>Co ti karty říkají společně</Text>
                                <View style={styles.timelineMeaningContainer}>
                                    <Text style={styles.timelineMeaningText}>{parseMeaningText(synthesis)}</Text>
                                </View>
                            </View>
                        )}

                        {/* Done button */}
                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={onClose}
                        >
                            <LinearGradient
                                colors={['#c294d8', '#a67bb8']} // Soft plum gradient
                                style={styles.gradientButton}
                            >
                                <Text style={styles.doneButtonText}>Zavřít</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={{ height: 60 }} />
                    </ScrollView>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#2a1f3d" />
                    </TouchableOpacity>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    return null;
};

// ===============================
// CARD DISPLAY COMPONENT
// ===============================
interface CardReadingDisplayProps {
    cardData: CardData;
    isFlipped: boolean;
    onFlip: () => void;
    onNext: () => void;
    nextButtonText: string;
    loadingMessage: string;
    onClose?: () => void;
}

const CardReadingDisplay = ({
    cardData,
    isFlipped,
    onFlip,
    onNext,
    nextButtonText,
    loadingMessage,
    onClose
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
        if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onFlip();
    };

    return (
        <ImmersiveScreen screenName="LoveReading">
            <SafeAreaView style={styles.container}>
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
                                    {/* White heart outline */}
                                    <View style={styles.heartOutline}>
                                        <Ionicons name="heart-outline" size={80} color="#fff" />
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
                                {cardData.meaning ? (
                                    <Text style={styles.meaningText}>{parseMeaningText(cardData.meaning)}</Text>
                                ) : (
                                    <View accessibilityRole="progressbar" accessibilityLabel={loadingMessage}>
                                        <ActivityIndicator size="small" color="#BA94F0" />
                                        <Text style={styles.loadingMessage}>{loadingMessage}</Text>
                                    </View>
                                )}
                            </View>
                        </Animated.View>
                    )}

                    {/* Next button (appears after flip) */}
                    {isFlipped && !!cardData.meaning && (
                        <Animated.View style={{ opacity: meaningFadeAnim }}>
                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={onNext}
                            >
                                <LinearGradient
                                    colors={['#c294d8', '#a67bb8']} // Soft plum gradient
                                    style={styles.gradientButton}
                                >
                                    <Text style={styles.nextButtonText}>{nextButtonText}</Text>
                                    {nextButtonText === 'Další' && (
                                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    loadingMessage: {
        fontFamily: 'Cormorant-Italic',
        fontSize: 20,
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },

    // ===== RITUAL SCREEN =====
    ritualContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    mainTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 79.4,
        color: '#ffffff',
        textAlign: 'center',
        letterSpacing: -1,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: 16,
    },
    subtitle: {
        fontFamily: 'Cormorant-Italic',
        fontSize: 24,
        color: '#ffffff',
        textAlign: 'center',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: 200,
    },
    button: {
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        paddingHorizontal: 48,
        paddingVertical: 14,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        minWidth: 200,
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: 'Cormorant-Italic',
        fontSize: 30,
        color: '#ffffff',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },

    // ===== CARD SCREENS =====
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 100,
        alignItems: 'center',
        paddingBottom: 40,
    },
    labelContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    positionLabel: {
        fontSize: 28,
        fontWeight: '700',
        color: '#c294d8', // Soft plum instead of bright pink
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subheadline: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },
    cardTouchable: {
        marginBottom: spacing.xl,
    },
    cardBack: {
        width: 280,
        height: 420,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    cardBackGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    heartOutline: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardFront: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    cardName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: '#c294d8', // Soft plum
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    meaningContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        width: '100%',
        marginBottom: spacing.xl,
    },
    meaningText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#2a1f3d',
        textAlign: 'left',
    },
    nextButton: {
        borderRadius: borderRadius.full,
        overflow: 'hidden',
        shadowColor: '#c294d8', // Soft plum shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // ===== TIMELINE VIEW =====
    timelineOverlay: {
       ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(255, 192, 203, 0.92)', // Pink overlay for readability
        zIndex: 0,
    },
    timelineScrollContainer: {
        flex: 1,
        zIndex: 1,
    },
    timelineScrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 80,
        alignItems: 'center',
    },
    timelineTitleContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl * 2,
    },
    timelineTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2a1f3d',
        marginBottom: 4,
        textAlign: 'center',
    },
    timelineSubtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6b5b7a',
        textAlign: 'center',
    },
    timelineCard: {
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.xl * 1.5,
    },
    timelineHeader: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    timelinePosition: {
        fontSize: 14,
        fontWeight: '700',
        color: '#c294d8', // Soft plum
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    timelineSubheadline: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b5b7a',
        fontStyle: 'italic',
    },
    timelineCardImageWrapper: {
        marginBottom: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        borderRadius: 12,
        overflow: 'hidden',
    },
    timelineCardName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2a1f3d',
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    timelineMeaningContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        width: '100%',
        borderLeftWidth: 3,
        borderLeftColor: '#c294d8', // Soft plum
    },
    timelineMeaningText: {
        fontSize: 14,
        lineHeight: 21,
        color: '#2a1f3d',
        textAlign: 'left',
    },
    connectionLine: {
        width: 2,
        height: 30,
        backgroundColor: 'rgba(194, 148, 216, 0.4)', // Soft plum
        marginTop: spacing.lg,
    },
    doneButton: {
        borderRadius: borderRadius.full,
        overflow: 'hidden',
        marginTop: spacing.xl,
        shadowColor: '#c294d8', // Soft plum
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
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
