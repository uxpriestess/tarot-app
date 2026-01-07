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
    { id: 'love', name: 'Láska a vztahy', iconImage: require('../../assets/icons/spreads/heart.png'), cards: 3, labels: ['Ty', 'Partner', 'Vztah'] },
    { id: 'finance', name: 'Finance', iconImage: require('../../assets/icons/spreads/money.png'), cards: 3, labels: ['Dnes', 'Výzva', 'Výsledek'] },
    { id: 'body', name: 'Tělo a mysl', iconImage: require('../../assets/icons/spreads/meditation.png'), cards: 3, labels: ['Tělo', 'Mysl', 'Duch'] },
    { id: 'moon', name: 'Měsíční fáze', iconImage: require('../../assets/icons/spreads/moon.png'), cards: 5, labels: ['Nov', 'Dorůstání', 'Úplněk', 'Ubývání', 'Poučení'] },
    { id: 'decision', name: 'Rozhodnutí', iconImage: require('../../assets/icons/spreads/lightbulb.png'), cards: 3, labels: ['Cesta A', 'Cesta B', 'Rada'] },
    { id: 'week', name: '7 dní', iconImage: require('../../assets/icons/spreads/hourglass.png'), cards: 7, labels: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] },
];

// Simplified placeholder positions for now - we can refine per spread later
const CARD_POSITIONS: Record<SpreadId, { x: number; y: number }[]> = {
    love: [{ x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 }],
    finance: [{ x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 }],
    body: [{ x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 }],
    moon: [
        { x: 50, y: 20 },
        { x: 20, y: 50 }, { x: 80, y: 50 },
        { x: 35, y: 80 }, { x: 65, y: 80 }
    ],
    decision: [{ x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 }],
    week: [
        { x: 15, y: 30 }, { x: 15, y: 50 }, { x: 15, y: 70 },
        { x: 50, y: 50 },
        { x: 85, y: 30 }, { x: 85, y: 50 }, { x: 85, y: 70 }
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
    const [isReadingAI, setIsReadingAI] = useState(false);
    const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);

    // Animation Refs
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance Fade
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const flipCard = (idx: number) => {
        if (!flippedCards.includes(idx)) {
            const newFlipped = [...flippedCards, idx];
            setFlippedCards(newFlipped);

            // Trigger AI reading when all cards are flipped
            if (selectedSpread && newFlipped.length === selectedSpread.cards) {
                generateAIReading();
            }
        }
    };

    const generateAIReading = async () => {
        if (!selectedSpread || drawnCards.length === 0) return;

        setIsReadingAI(true);
        setAiInterpretation(null);

        try {
            const reading = await performReading({
                spreadName: selectedSpread.name,
                cards: drawnCards.map((dc, idx) => ({
                    name: dc.card.name,
                    nameCzech: dc.card.nameCzech,
                    position: dc.position,
                    label: selectedSpread.labels ? selectedSpread.labels[idx] : undefined
                })),
                question: 'Celkový výhled' // Optional: could add input later
            });
            setAiInterpretation(reading);
        } catch (error) {
            console.error(error);
        } finally {
            setIsReadingAI(false);
        }
    };

    const startReading = (spread: Spread) => {
        // Draw real cards based on spread
        const cards = [];
        for (let i = 0; i < spread.cards; i++) {
            const drawn = drawCard(); // Import drawCard
            cards.push(drawn);
        }
        setDrawnCards(cards);
        setSelectedSpread(spread);
        setFlippedCards([]);
        setAiInterpretation(null);
        setStage('reading');
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
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

        return (
            <Animated.View style={[styles.readingContainer, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={resetReading} style={styles.readingBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerContainer}>
                    <Text style={styles.heading}>{selectedSpread.name}</Text>
                    <Text style={styles.instructionText}>Ponoř se do své otázky...</Text>
                    <Text style={styles.subtitle}>Dotkni se karet pro odhalení</Text>
                </View>

                <View style={styles.boardContainer}>
                    {CARD_POSITIONS[selectedSpread.id].map((pos, idx) => (
                        <CardComponent
                            key={idx}
                            index={idx}
                            position={pos}
                            cardData={drawnCards[idx]}
                            isFlipped={flippedCards.includes(idx)}
                            onFlip={() => flipCard(idx)}
                            label={selectedSpread.labels ? selectedSpread.labels[idx] : undefined} // Pass label
                        />
                    ))}
                </View>

                {/* AI Result Section */}
                <ScrollView style={styles.resultScrollView} contentContainerStyle={styles.resultContent}>
                    {isReadingAI && (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Vesmír skládá tvůj příběh...</Text>
                        </View>
                    )}
                    {aiInterpretation && (
                        <Animated.View style={styles.interpretationContainer}>
                            <Text style={styles.interpretationTitle}>Výklad osudu</Text>
                            <Text style={styles.interpretationText}>{aiInterpretation}</Text>
                        </Animated.View>
                    )}
                </ScrollView>

                <TouchableOpacity onPress={resetReading} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Nový výklad</Text>
                </TouchableOpacity>
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
const CardComponent = ({ index, position, isFlipped, onFlip, cardData, label }: any) => {
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

    const cardWidth = width * 0.28;
    const cardHeight = cardWidth * 1.5;

    return (
        <View
            style={[
                styles.cardWrapper,
                {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    width: cardWidth,
                    height: cardHeight + 30, // Extra space for label
                    marginLeft: -cardWidth / 2,
                    marginTop: -(cardHeight + 30) / 2,
                    zIndex: isFlipped ? 100 + index : index,
                }
            ]}
        >
            {label && (
                <Text style={styles.positionLabel}>{label}</Text>
            )}
            <TouchableOpacity
                activeOpacity={1}
                onPress={onFlip}
                style={{ width: cardWidth, height: cardHeight }}
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
        paddingTop: 60,
        paddingBottom: 100, // Added more bottom padding for TabBar clearance
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    heading: {
        fontSize: 28,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    instructionText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: 8,
    },
    boardContainer: {
        minHeight: 300,
        width: '100%',
        position: 'relative',
    },
    cardWrapper: {
        position: 'absolute',
        alignItems: 'center',
    },
    positionLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textTransform: 'uppercase',
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        padding: 4,
    },
    cardBackInner: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: borderRadius.sm - 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardFront: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        transform: [{ rotateY: '180deg' }],
        overflow: 'hidden',
    },
    cardLabel: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    resultScrollView: {
        flex: 1,
        width: '100%',
        marginTop: 20,
    },
    resultContent: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.7)',
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    interpretationContainer: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        width: '90%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    interpretationTitle: {
        color: colors.textCream,
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: 15,
        textAlign: 'center',
    },
    interpretationText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        lineHeight: 26,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
    },
    backButton: {
        marginBottom: 20, // Reduced as container now has bottom padding
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
});
