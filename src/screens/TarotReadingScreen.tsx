import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    SafeAreaView,
    Platform,
    ScrollView,
    Image,
    Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { drawCard } from '../data';
import { CardImage } from '../components/CardImage';
import { performReading } from '../services/universe';
import { getMoonPhase } from '../utils/moonPhase';

const { width } = Dimensions.get('window');

// Simple shimmer component for the shiny glimmer effect
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

// Types
type SpreadId = 'love' | 'finance' | 'body' | 'moon' | 'decision' | 'week';
type Stage = 'welcome' | 'spread-select' | 'reading';

interface Spread {
    id: SpreadId;
    name: string;
    description?: string;
    iconImage: any; // require() path for custom watercolor icons
    cards: number;
    labels?: string[];
}

const SPREADS: Spread[] = [
    { id: 'love', name: 'Láska a vztahy', iconImage: require('../../assets/icons/spreads/heart.png'), cards: 3, labels: ['Ty', 'Partner', 'Tvůj vztah'] },
    { id: 'finance', name: 'Finance', iconImage: require('../../assets/icons/spreads/money.png'), cards: 3, labels: ['Dnes', 'Výzva', 'Výsledek'] },
    { id: 'body', name: 'Tělo a mysl', iconImage: require('../../assets/icons/spreads/meditation.png'), cards: 3, labels: ['Tělo', 'Mysl', 'Duch'] },
    { id: 'moon', name: 'Měsíční fáze', iconImage: require('../../assets/icons/spreads/moon.png'), cards: 1, labels: ['Vzkaz luny'] },
    { id: 'decision', name: 'Rozhodnutí', iconImage: require('../../assets/icons/spreads/lightbulb.png'), cards: 3, labels: ['Cesta A', 'Cesta B', 'Rada'] },
    { id: 'week', name: '7 dní', iconImage: require('../../assets/icons/spreads/hourglass.png'), cards: 7, labels: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] },
];

// Simplified placeholder positions for now - we can refine per spread later
const CARD_POSITIONS: Record<SpreadId, { x: number; y: number }[]> = {
    love: [
        { x: 30, y: 35 }, // Ty (top-left)
        { x: 70, y: 35 }, // Partner (top-right)
        { x: 50, y: 72 }  // Tvůj vztah (bottom-center)
    ],
    finance: [
        { x: 25, y: 25 }, // Dnes
        { x: 75, y: 25 }, // Výzva
        { x: 50, y: 70 }  // Výsledek
    ],
    body: [
        { x: 25, y: 25 }, // Tělo
        { x: 75, y: 25 }, // Mysl
        { x: 50, y: 70 }  // Duch
    ],
    moon: [
        { x: 50, y: 50 }
    ],
    decision: [
        { x: 25, y: 25 }, // Cesta A
        { x: 75, y: 25 }, // Cesta B
        { x: 50, y: 70 }  // Rada
    ],
    week: [
        { x: 20, y: 15 }, { x: 50, y: 15 }, { x: 80, y: 15 },
        { x: 50, y: 45 },
        { x: 20, y: 75 }, { x: 50, y: 75 }, { x: 80, y: 75 }
    ]
};

interface TarotReadingScreenProps {
    onClose?: () => void;
}

export const TarotReadingScreen = ({ onClose }: TarotReadingScreenProps) => {
    const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [drawnCards, setDrawnCards] = useState<any[]>([]); // New state for real cards
    const [stage, setStage] = useState<Stage>('welcome');
    const [revealedCount, setRevealedCount] = useState(0);
    const [aiInterpretation, setAiInterpretation] = useState<any>(null);
    const [individualMeaning, setIndividualMeaning] = useState<{ title: string; text: string } | null>(null);
    const [isReadingAI, setIsReadingAI] = useState(false);
    const [cardMeanings, setCardMeanings] = useState<string[]>([]); // Stores 3 paragraphs from split

    // Animation Refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const minimizeAnim = useRef(new Animated.Value(0)).current; // New animation for results
    const rotateAnim = useRef(new Animated.Value(0)).current; // For loading spinner

    useEffect(() => {
        // Entrance Fade
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        if (isReadingAI) {
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            rotateAnim.stopAnimation();
            rotateAnim.setValue(0);
        }
    }, [isReadingAI]);

    const flipCard = (idx: number) => {
        // Enforce sequential reveal
        if (idx !== revealedCount) return;

        if (!flippedCards.includes(idx)) {
            const newFlipped = [...flippedCards, idx];
            setFlippedCards(newFlipped);
            setRevealedCount(idx + 1);

            const label = selectedSpread?.labels ? selectedSpread.labels[idx] : 'Karta';
            const cardObj = drawnCards[idx];

            // Content logic: Show cardMeanings paragraph if available, otherwise keywords
            if (cardMeanings[idx]) {
                setIndividualMeaning({ title: label, text: cardMeanings[idx] });
            } else {
                // Fallback to keywords while loading
                const keywords = cardObj.card.keywords.map((k: string) => k.toUpperCase()).join('  •  ');
                setIndividualMeaning({ title: label, text: keywords });
            }

            // If it was the last card and not a love spread, trigger AI interpretation
            if (selectedSpread && newFlipped.length === selectedSpread.cards && selectedSpread.id !== 'love') {
                generateAIReading();
            }
        }
    };

    const generateAIReading = async (isPreFetch = false, cardsToUse?: any[], spreadToUse?: Spread) => {
        const cards = cardsToUse || drawnCards;
        const spread = spreadToUse || selectedSpread;

        if (!spread || cards.length === 0) {
            console.log("Reading blocked: No spread or empty cards", { hasSpread: !!spread, cardsLen: cards.length });
            return;
        }

        console.log(`Starting ${isPreFetch ? 'pre-fetch' : 'final'} AI reading for mode: ${spread.id}`);

        if (!isPreFetch) {
            setIsReadingAI(true);
            setAiInterpretation(null);
            setIndividualMeaning(null);
        }

        // Only minimize if it's the final reading trigger
        if (!isPreFetch) {
            Animated.spring(minimizeAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 20,
                friction: 7,
            }).start();
        }

        try {
            const moonInfo = getMoonPhase(new Date());
            const contextQuestion = spread.id === 'moon'
                ? `Měsíční fáze: ${moonInfo.name} ${moonInfo.icon}`
                : 'Celkový výhled';

            const mode = spread.id === 'love' ? 'love_3_card' :
                spread.id === 'moon' ? 'moon_phase' : 'reading-screen';

            const reading = await performReading({
                spreadName: spread.name,
                cards: cards.map((dc, idx) => ({
                    name: dc.card.name,
                    nameCzech: dc.card.nameCzech,
                    position: dc.position,
                    label: spread.labels ? spread.labels[idx] : undefined
                })),
                question: contextQuestion,
                mode: mode
            });

            console.log("AI Response received, length:", reading ? reading.length : 0);

            if (mode === 'love_3_card') {
                // Split by delimiter and store paragraphs
                const paragraphs = reading.split('---').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                console.log("Split into paragraphs:", paragraphs.length);
                setCardMeanings(paragraphs);

                // If a card is already flipped, update its meaning immediately
                if (revealedCount > 0) {
                    const lastIdx = revealedCount - 1;
                    const label = selectedSpread?.labels ? selectedSpread.labels[lastIdx] : 'Karta';
                    if (paragraphs[lastIdx]) {
                        setIndividualMeaning({ title: label, text: paragraphs[lastIdx] });
                    }
                }
            } else {
                setAiInterpretation(reading);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (!isPreFetch) setIsReadingAI(false);
        }
    };

    const startReading = (spread: Spread) => {
        console.log("Starting reading for spread:", spread.id);
        // Draw real cards based on spread
        const cards = [];
        for (let i = 0; i < spread.cards; i++) {
            const drawn = drawCard(); // Import drawCard
            cards.push(drawn);
        }
        setDrawnCards(cards);
        setSelectedSpread(spread);
        setFlippedCards([]);
        setRevealedCount(0);
        setAiInterpretation(null);
        setIndividualMeaning(null);
        setCardMeanings([]);
        minimizeAnim.setValue(0);
        setStage('reading');
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Pre-fetch AI reading for Love spread to get card meanings early
        if (spread.id === 'love') {
            console.log("Triggering pre-fetch for Love spread immediately with drawn cards.");
            generateAIReading(true, cards, spread);
        }
    };

    const resetReading = () => {
        setStage('welcome');
        setSelectedSpread(null);
        setFlippedCards([]);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    };

    // --- RENDER HELPERS ---

    const renderWelcome = () => (
        <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Čtení</Text>
                <Text style={styles.subtitle}>Vyber si styl výkladu</Text>
            </View>

            <ScrollView contentContainerStyle={styles.spreadList} showsVerticalScrollIndicator={false}>
                {SPREADS.map((spread) => (
                    <TouchableOpacity
                        key={spread.id}
                        style={styles.spreadCard}
                        onPress={() => startReading(spread)}
                    >
                        <Glimmer />
                        <View style={styles.iconWrapper}>
                            <Image
                                source={spread.iconImage}
                                style={styles.watercolorIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.spreadName}>{spread.name}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Close Button only if onClose is provided */}
            {onClose && (
                <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                >
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );

    const renderReading = () => {
        if (!selectedSpread) return null;

        const introText = selectedSpread.id === 'love' ? 'Co teď ve vztazích řešíš?' : 'Ponoř se do své otázky...';

        return (
            <Animated.View style={[styles.readingContainer, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={resetReading} style={styles.readingBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.readingHeader,
                        {
                            transform: [
                                { translateY: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) },
                                { scale: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) }
                            ]
                        }
                    ]}
                >
                    <Text style={styles.readingTitle}>{selectedSpread.name}</Text>
                    <Text style={styles.readingSubtitle}>{introText}</Text>
                    {flippedCards.length < (selectedSpread?.cards || 0) && (
                        <Text style={styles.instructionLine}>Dotkni se karet a uvidíš</Text>
                    )}
                </Animated.View>

                <Animated.View
                    style={[
                        styles.spreadArea,
                        {
                            transform: [
                                { translateY: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
                                { scale: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) }
                            ]
                        }
                    ]}
                >
                    {drawnCards.map((dc, idx) => (
                        <CardComponent
                            key={idx}
                            index={idx}
                            position={CARD_POSITIONS[selectedSpread.id][idx]}
                            isFlipped={flippedCards.includes(idx)}
                            onFlip={() => flipCard(idx)}
                            cardData={dc}
                            label={selectedSpread.labels ? selectedSpread.labels[idx] : undefined}
                            isLocked={idx !== revealedCount}
                        />
                    ))}
                </Animated.View>

                {/* Individual Whisper or AI loading */}
                <View style={styles.interpretationArea}>
                    {isReadingAI && !aiInterpretation && (
                        <View style={styles.loadingContainer}>
                            <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                                <Ionicons name="sparkles" size={32} color={colors.lavender} />
                            </Animated.View>
                            <Text style={styles.loadingText}>Vnímám energii karet...</Text>
                        </View>
                    )}

                    {individualMeaning && (
                        <Animated.View style={styles.whisperContainer}>
                            <Text style={styles.whisperTitle}>{individualMeaning.title}</Text>
                            <Text style={styles.whisperText}>„{individualMeaning.text}"</Text>
                        </Animated.View>
                    )}

                    {/* For Love spread: Show "Do deníčku" button after all cards flipped */}
                    {selectedSpread?.id === 'love' && flippedCards.length === selectedSpread.cards && cardMeanings.length === 3 && (
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.saveToJournalButton}
                                onPress={() => {
                                    // TODO: Implement save to journal functionality
                                    console.log("Save to journal:", cardMeanings);
                                    resetReading();
                                }}
                            >
                                <Ionicons name="book-outline" size={20} color={colors.lavender} />
                                <Text style={styles.saveToJournalButtonText}>Do deníčku</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* For other spreads: Show full interpretation button */}
                    {selectedSpread?.id !== 'love' && aiInterpretation && flippedCards.length === selectedSpread.cards && (
                        <View style={styles.buttonContainer}>
                            <ScrollView style={styles.interpretationScroll}>
                                <Text style={styles.interpretationText}>{aiInterpretation}</Text>
                            </ScrollView>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    return (
        <ImmersiveScreen screenName="reading">
            <View style={styles.safeArea}>
                {stage === 'welcome' && renderWelcome()}
                {stage === 'spread-select' && renderWelcome()}
                {stage === 'reading' && renderReading()}
            </View>
        </ImmersiveScreen>
    );
};

// Sub-component for individual card animation
const CardComponent = ({ index, position, isFlipped, onFlip, cardData, label, isLocked }: any) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: isFlipped ? 180 : 0,
            duration: 700,
            useNativeDriver: true,
        }).start();
    }, [isFlipped]);

    const frontInterpolate = rotateAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg'],
    });

    const backInterpolate = rotateAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['180deg', '360deg'],
    });

    const cardWidth = width * 0.4; // Big, high-impact cards
    const cardHeight = cardWidth * 1.5;

    return (
        <View
            style={[
                styles.cardWrapper,
                {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    width: cardWidth,
                    height: cardHeight + 40,
                    marginLeft: -cardWidth / 2,
                    marginTop: -(cardHeight + 40) / 2,
                    zIndex: isFlipped ? 100 + index : index,
                }
            ]}
        >
            <TouchableOpacity
                activeOpacity={isLocked ? 1 : 0.8}
                onPress={onFlip}
                style={{ width: cardWidth, height: cardHeight, opacity: isLocked ? 0.4 : 1 }}
            >
                {/* Back of Card */}
                <Animated.View
                    style={[
                        styles.cardFace,
                        styles.cardBack,
                        { transform: [{ rotateY: frontInterpolate }] }
                    ]}
                >
                    <View style={styles.cardBackInner}>
                        <Ionicons name="sunny-outline" size={24} color="rgba(255,255,255,0.4)" />
                    </View>
                </Animated.View>

                {/* Front of Card */}
                <Animated.View
                    style={[
                        styles.cardFace,
                        styles.cardFront,
                        { transform: [{ rotateY: backInterpolate }] }
                    ]}
                >
                    {cardData && (
                        <CardImage
                            imageName={cardData.card.imageName}
                            width={cardWidth - 4}
                            height={cardHeight - 4}
                        />
                    )}
                </Animated.View>
            </TouchableOpacity>

            {/* Label ONLY after flip, and placed below */}
            {isFlipped && label && (
                <View style={styles.bottomLabelContainer}>
                    <Text style={styles.positionLabelBelow}>{label}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        padding: spacing.md,
        paddingTop: 60,
    },
    titleContainer: {
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    title: {
        fontSize: 32,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '700',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.8)', // Stronger shadow
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '400',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        textAlign: 'left', // Left-align as per mockup
    },
    spreadList: {
        paddingBottom: 40,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xs, // Slight adjustment for spacing
    },
    spreadCard: {
        width: '48%',
        aspectRatio: 1, // Make it square
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassy
        borderRadius: 24,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        overflow: 'hidden', // Required for glimmer
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3, // Visible shadow
        shadowRadius: 4.65,
        elevation: 8,
    },
    iconWrapper: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: -10,
    },
    watercolorIcon: {
        width: 140,
        height: 140,
    },
    cardContent: {
        alignItems: 'center',
        marginTop: 0,
    },
    spreadName: {
        fontSize: 14, // Slightly smaller to accommodate larger icon
        fontWeight: '600',
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        paddingHorizontal: 4,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    // Reading
    readingContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    readingHeader: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: spacing.xl,
        zIndex: 10,
    },
    readingTitle: {
        fontSize: 32,
        color: colors.textCream,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '600',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
    },
    readingSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        marginBottom: 12,
    },
    instructionLine: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    spreadArea: {
        minHeight: 460, // Reduced to prevent pushing content off-screen on mobile
        width: '100%',
        position: 'relative',
    },
    cardWrapper: {
        position: 'absolute',
        alignItems: 'center',
    },
    cardFace: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.sm,
        backfaceVisibility: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    cardBack: {
        backgroundColor: '#0F0F0F',
        borderColor: '#C0A080',
        borderWidth: 1,
        padding: 6,
    },
    cardBackInner: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderColor: 'rgba(192, 160, 128, 0.3)',
        borderRadius: borderRadius.sm - 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#161616',
    },
    cardFront: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        transform: [{ rotateY: '180deg' }],
        overflow: 'hidden',
    },
    bottomLabelContainer: {
        marginTop: 6,
        alignItems: 'center',
    },
    positionLabelBelow: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1.5,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    interpretationArea: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingTop: 20,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        marginTop: 12,
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    whisperContainer: {
        width: '85%',
        padding: 24,
        backgroundColor: 'rgba(30,30,30,0.4)',
        borderRadius: 20,
        alignItems: 'center',
    },
    whisperTitle: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 12,
    },
    whisperText: {
        color: colors.textCream,
        fontSize: 18,
        lineHeight: 26,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontStyle: 'italic',
    },
    fullInterpretationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 30,
        backgroundColor: 'rgba(100, 80, 120, 0.3)', // Slightly more visible lavender tint
        borderRadius: 30,
        marginTop: 20,
        borderWidth: 1,
        borderColor: colors.lavender + '50',
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
    },
    fullInterpretationButtonText: {
        color: colors.textCream,
        marginRight: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    saveToJournalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 30,
        backgroundColor: 'rgba(100, 80, 120, 0.4)',
        borderRadius: 30,
        marginTop: 20,
        borderWidth: 1,
        borderColor: colors.lavender + '60',
    },
    saveToJournalButtonText: {
        color: colors.textCream,
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    interpretationScroll: {
        marginTop: 20,
        maxHeight: 200,
        width: '90%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 15,
        padding: 15,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0a0a0a',
        zIndex: 1000,
    },
    overlayHeader: {
        paddingTop: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
    },
    closeOverlayButton: {
        position: 'absolute',
        left: 20,
        top: 30,
    },
    overlayTitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    overlayContent: {
        padding: 30,
        paddingTop: 10,
        paddingBottom: 100,
    },
    interpretationText: {
        color: colors.textCream,
        fontSize: 18,
        lineHeight: 30,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'left',
    },
    closeFullButton: {
        marginTop: 60,
        alignSelf: 'center',
        paddingVertical: 18,
        paddingHorizontal: 40,
        backgroundColor: colors.lavender + '20',
        borderRadius: 35,
        borderWidth: 1,
        borderColor: colors.lavender + '40',
    },
    closeFullButtonText: {
        color: colors.lavender,
        fontSize: 16,
        fontWeight: '600',
    },
    readingBackButton: {
        position: 'absolute',
        top: 10,
        left: 20,
        zIndex: 50,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
    },
});
