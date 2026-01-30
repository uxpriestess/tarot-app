/**
 * LoveReadingScreen.tsx
 * 
 * SAFE VERSION - Production Ready
 * 
 * Features:
 * - Ritual opening screen
 * - Sequential locked progression (YOU → PARTNER → RELATIONSHIP)
 * - Title-first reveal (300ms delay before text)
 * - Escalating haptics (Light → Medium → Heavy)
 * - Breathing animation on ready card
 * - Subtle background glow escalation
 * - Micro-guidance text
 * 
 * Philosophy: "Magic comes from restraint"
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { CardImage } from '../components/CardImage';
import { performReading, ReadingSection } from '../services/universe';
import { colors, spacing, borderRadius } from '../theme/colors';
import { drawCard } from '../data';

// Optional: Import haptics if available
let Haptics: any = null;
try {
    Haptics = require('expo-haptics');
} catch (e) {
    console.log('Haptics not available');
}

const { width, height } = Dimensions.get('window');

type Stage = 'ritual' | 'reading' | 'complete';

interface LoveReadingScreenProps {
    onClose?: () => void;
}

export const LoveReadingScreen = ({ onClose }: LoveReadingScreenProps) => {
    // Core state
    const [stage, setStage] = useState<Stage>('ritual');
    const [drawnCards, setDrawnCards] = useState<any[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [canTapNext, setCanTapNext] = useState([false, false, false]);
    const [cardMeanings, setCardMeanings] = useState<ReadingSection[]>([]);
    const [isLoadingMeanings, setIsLoadingMeanings] = useState(false);
    
    // Title-first reveal tracking
    const [titlesVisible, setTitlesVisible] = useState<number[]>([]);
    
    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    // Fade in on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    // Background glow escalates with each card (SAFE+: very subtle)
    useEffect(() => {
        const targetGlow = Math.min(flippedCards.length / 3, 1); // 0 → 0.33 → 0.66 → 1
        Animated.timing(glowAnim, {
            toValue: targetGlow,
            duration: 600,
            useNativeDriver: false // backgroundColor interpolation
        }).start();
    }, [flippedCards.length]);

    // Interpolate background glow (very gentle)
    const backgroundGlowStyle = {
        backgroundColor: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(26, 18, 40, 0.2)', 'rgba(50, 35, 70, 0.4)']
        })
    };

    // Draw cards and fetch meanings
    const drawCardsAndFetchMeanings = async () => {
        console.log('=== DRAWING LOVE READING CARDS ===');
        
        // Draw 3 cards
        const cards = [
            drawCard(), // YOU
            drawCard(), // PARTNER
            drawCard()  // RELATIONSHIP
        ];
        
        setDrawnCards(cards);
        setCanTapNext([true, false, false]); // Only first card ready
        setStage('reading');
        
        // Pre-fetch all meanings
        setIsLoadingMeanings(true);
        try {
            const reading = await performReading({
                spreadName: 'Láska a vztahy',
                cards: cards.map((c, idx) => ({
                    name: c.card.name,
                    nameCzech: c.card.nameCzech,
                    position: c.position,
                    label: ['Ty', 'Partner', 'Tvůj vztah'][idx]
                })),
                question: 'Co je mezi námi?',
                mode: 'love'
            });
            
            console.log('✅ Love reading fetched:', reading.sections.length, 'sections');
            setCardMeanings(reading.sections);
        } catch (err) {
            console.error('❌ Failed to fetch meanings:', err);
        } finally {
            setIsLoadingMeanings(false);
        }
    };

    // Flip card with locked progression
    const flipCard = (idx: number) => {
        console.log(`=== FLIP CARD ${idx} ===`);
        
        // Guard: Can't tap if locked or already flipped
        if (!canTapNext[idx] || flippedCards.includes(idx)) {
            console.log('❌ Card locked or already flipped');
            return;
        }

        // Escalating haptics (iOS only)
        if (Platform.OS === 'ios' && Haptics) {
            const intensity = 
                idx === 2 ? Haptics.ImpactFeedbackStyle.Heavy :
                idx === 1 ? Haptics.ImpactFeedbackStyle.Medium :
                Haptics.ImpactFeedbackStyle.Light;
            
            Haptics.impactAsync(intensity);
        }

        // Flip card
        setFlippedCards(prev => [...prev, idx]);

        // Title-first reveal: Show title immediately
        setTitlesVisible(prev => [...prev, idx]);
        
        // Text appears after 300ms delay
        setTimeout(() => {
            // Text will auto-appear because titlesVisible includes idx
        }, 300);

        // Unlock next card after 2 seconds (locked progression)
        if (idx < 2) {
            setTimeout(() => {
                setCanTapNext(prev => {
                    const next = [...prev];
                    next[idx + 1] = true;
                    return next;
                });
            }, 2000);
        }

        // Mark as complete when third card flips
        if (idx === 2) {
            setTimeout(() => {
                setStage('complete');
            }, 1000);
        }

        console.log(`✅ Card ${idx} flipped`);
    };

    // Micro-guidance text helper
    const getGuidanceText = () => {
        if (flippedCards.length === 0) return 'Klepni na první kartu';
        if (flippedCards.length === 1) return 'Pokračuj druhou kartou';
        if (flippedCards.length === 2) return 'Odhal poslední pravdu';
        return 'Výklad je kompletní';
    };

    // ============================================================
    // RITUAL OPENING SCREEN
    // ============================================================
    if (stage === 'ritual') {
        return (
            <ImmersiveScreen screenName="reading" debugMode={false}>
                <SafeAreaView style={styles.safeArea}>
                    <Animated.View style={[styles.ritualContainer, { opacity: fadeAnim }]}>
                        {/* Heart icon */}
                        <Ionicons 
                            name="heart-outline" 
                            size={72} 
                            color="rgba(255, 255, 255, 0.85)" 
                        />
                        
                        {/* Title */}
                        <Text style={styles.ritualTitle}>Láska a vztahy</Text>
                        
                        {/* Subtitle */}
                        <Text style={styles.ritualSubtitle}>Co je mezi vámi?</Text>
                        
                        {/* Divider */}
                        <View style={styles.ritualDivider} />
                        
                        {/* Instructions */}
                        <Text style={styles.ritualInstruction}>
                            Soustřeď se na svůj vztah.{'\n'}
                            Klepni na kartu pro odhalení.
                        </Text>
                        
                        {/* Begin button */}
                        <TouchableOpacity 
                            style={styles.beginButton}
                            onPress={drawCardsAndFetchMeanings}
                        >
                            <Text style={styles.beginButtonText}>✨ Začít výklad</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Close button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    // ============================================================
    // READING SCREEN
    // ============================================================
    return (
        <ImmersiveScreen screenName="reading" debugMode={false}>
            <SafeAreaView style={styles.safeArea}>
                {/* Subtle background glow (SAFE+) */}
                <Animated.View 
                    style={[
                        StyleSheet.absoluteFill,
                        backgroundGlowStyle
                    ]}
                    pointerEvents="none"
                />

                <ScrollView 
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header with micro-guidance */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Láska a vztahy</Text>
                        <Text style={styles.guidanceText}>{getGuidanceText()}</Text>
                    </View>

                    {/* Card Spread Area */}
                    <View style={styles.spreadArea}>
                        {[0, 1, 2].map((idx) => (
                            <CardSpot
                                key={idx}
                                idx={idx}
                                position={CARD_POSITIONS[idx]}
                                label={CARD_LABELS[idx]}
                                card={drawnCards[idx]}
                                isFlipped={flippedCards.includes(idx)}
                                canTap={canTapNext[idx]}
                                onTap={() => flipCard(idx)}
                            />
                        ))}
                    </View>

                    {/* Meanings Section */}
                    {!isLoadingMeanings && (
                        <View style={styles.meaningsContainer}>
                            {flippedCards.map((flippedIdx) => (
                                <MeaningCard
                                    key={flippedIdx}
                                    label={CARD_LABELS[flippedIdx]}
                                    meaning={cardMeanings[flippedIdx]}
                                    showTitle={titlesVisible.includes(flippedIdx)}
                                />
                            ))}
                        </View>
                    )}

                    {/* Loading state */}
                    {isLoadingMeanings && (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Načítám výklad...</Text>
                        </View>
                    )}

                    {/* Done button (appears when complete) */}
                    {stage === 'complete' && (
                        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.doneButtonText}>Zavřít výklad</Text>
                        </TouchableOpacity>
                    )}

                    {/* Spacing at bottom */}
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Close button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>
        </ImmersiveScreen>
    );
};

// ============================================================
// CARD POSITIONS (Fixed Layout)
// ============================================================
const CARD_POSITIONS = [
    { x: width * 0.27, y: 140 },  // YOU (left)
    { x: width * 0.73, y: 140 },  // PARTNER (right)
    { x: width * 0.5, y: 320 }    // RELATIONSHIP (center bottom)
];

const CARD_LABELS = ['TY', 'PARTNER', 'VÁŠ VZTAH'];

// ============================================================
// CARD SPOT COMPONENT
// ============================================================
interface CardSpotProps {
    idx: number;
    position: { x: number; y: number };
    label: string;
    card: any;
    isFlipped: boolean;
    canTap: boolean;
    onTap: () => void;
}

const CardSpot = ({ idx, position, label, card, isFlipped, canTap, onTap }: CardSpotProps) => {
    const flipAnim = useRef(new Animated.Value(0)).current;
    const breatheAnim = useRef(new Animated.Value(0)).current;

    const cardWidth = 100;
    const cardHeight = 150;

    // Flip animation
    useEffect(() => {
        if (isFlipped) {
            Animated.spring(flipAnim, {
                toValue: 180,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }).start();
        }
    }, [isFlipped]);

    // Breathing animation (SAFE+: only on ready card)
    useEffect(() => {
        if (!isFlipped && canTap) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(breatheAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true
                    }),
                    Animated.timing(breatheAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            breatheAnim.setValue(0);
        }
    }, [isFlipped, canTap]);

    // Interpolations
    const frontRotate = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg']
    });

    const backRotate = flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['180deg', '360deg']
    });

    const breatheScale = breatheAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.04]
    });

    return (
        <View 
            style={[
                styles.cardWrapper,
                {
                    left: position.x - cardWidth / 2,
                    top: position.y - cardHeight / 2,
                    width: cardWidth,
                    height: cardHeight
                }
            ]}
        >
            {/* Label above card */}
            <Text style={styles.labelAbove}>{label}</Text>

            {/* Touchable area */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={canTap && !isFlipped ? onTap : undefined}
                disabled={!canTap || isFlipped}
            >
                <Animated.View
                    style={{
                        width: cardWidth,
                        height: cardHeight,
                        transform: [{ scale: breatheScale }]
                    }}
                >
                    {/* Back face */}
                    <Animated.View
                        style={[
                            styles.cardFace,
                            styles.cardBack,
                            { transform: [{ rotateY: backRotate }] }
                        ]}
                    >
                        <View style={styles.cardBackInner}>
                            <Ionicons name="sparkles" size={28} color="rgba(255,255,255,0.3)" />
                        </View>
                    </Animated.View>

                    {/* Front face */}
                    <Animated.View
                        style={[
                            styles.cardFace,
                            styles.cardFront,
                            { transform: [{ rotateY: frontRotate }] }
                        ]}
                    >
                        {card && isFlipped && (
                            <CardImage
                                imageName={card.card.imageName}
                                width={cardWidth - 4}
                                height={cardHeight - 4}
                            />
                        )}
                    </Animated.View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

// ============================================================
// MEANING CARD COMPONENT (Title-First Reveal)
// ============================================================
interface MeaningCardProps {
    label: string;
    meaning: ReadingSection;
    showTitle: boolean;
}

const MeaningCard = ({ label, meaning, showTitle }: MeaningCardProps) => {
    const titleAnim = useRef(new Animated.Value(0)).current;
    const textAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showTitle) {
            // Title appears first
            Animated.timing(titleAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                // Text appears 300ms later
                Animated.timing(textAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true
                }).start();
            });
        }
    }, [showTitle]);

    return (
        <View style={styles.meaningCard}>
            {/* Title (appears first) */}
            <Animated.Text 
                style={[
                    styles.meaningLabel,
                    {
                        opacity: titleAnim,
                        transform: [{
                            translateY: titleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0]
                            })
                        }]
                    }
                ]}
            >
                {label}
            </Animated.Text>

            {/* Text (appears second, with delay) */}
            <Animated.Text
                style={[
                    styles.meaningText,
                    {
                        opacity: textAnim,
                        transform: [{
                            translateY: textAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0]
                            })
                        }]
                    }
                ]}
            >
                {meaning?.text || ''}
            </Animated.Text>
        </View>
    );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    
    // ========== RITUAL SCREEN ==========
    ritualContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    ritualTitle: {
        fontSize: 34,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '700',
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
        textAlign: 'center',
        letterSpacing: 1,
    },
    ritualSubtitle: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    ritualDivider: {
        width: 60,
        height: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: spacing.xl,
    },
    ritualInstruction: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: spacing.xxl * 1.5,
    },
    beginButton: {
        paddingVertical: 16,
        paddingHorizontal: 36,
        backgroundColor: 'rgba(212, 175, 122, 0.3)',
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: 'rgba(212, 175, 122, 0.5)',
    },
    beginButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
    },

    // ========== READING SCREEN ==========
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 80,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    title: {
        fontSize: 28,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 1.5,
    },
    guidanceText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontStyle: 'italic',
    },

    // ========== CARD SPREAD ==========
    spreadArea: {
        height: 450,
        width: '100%',
        position: 'relative',
        marginBottom: spacing.xl,
    },
    cardWrapper: {
        position: 'absolute',
        alignItems: 'center',
    },
    labelAbove: {
        position: 'absolute',
        top: -28,
        left: 0,
        right: 0,
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    cardFace: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.sm,
        backfaceVisibility: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBack: {
        backgroundColor: '#1a1420',
        borderWidth: 2,
        borderColor: '#8B7BA8',
        padding: 8,
    },
    cardBackInner: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderColor: 'rgba(139, 123, 168, 0.4)',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F0F0F',
    },
    cardFront: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        transform: [{ rotateY: '180deg' }],
        overflow: 'hidden',
    },

    // ========== MEANINGS ==========
    meaningsContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    meaningCard: {
        backgroundColor: 'rgba(20, 15, 25, 0.88)',
        padding: spacing.xl,
        borderRadius: 20,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(139, 123, 168, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    meaningLabel: {
        fontSize: 11,
        color: 'rgba(201, 184, 212, 0.8)',
        textTransform: 'uppercase',
        letterSpacing: 2.5,
        marginBottom: spacing.sm,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '600',
    },
    meaningText: {
        fontSize: 16,
        lineHeight: 26,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },

    // ========== LOADING ==========
    loadingContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontStyle: 'italic',
    },

    // ========== DONE BUTTON ==========
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        paddingVertical: 14,
        paddingHorizontal: 28,
        backgroundColor: 'rgba(139, 123, 168, 0.3)',
        borderRadius: 24,
        marginTop: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(201, 184, 212, 0.4)',
    },
    doneButtonText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 15,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
    },

    // ========== CLOSE BUTTON ==========
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 100,
    },
});
