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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { ImmersiveScreen } from '../components/ImmersiveScreen';

const { width } = Dimensions.get('window');

// Types
type SpreadId = 'love' | 'finance' | 'body' | 'moon' | 'decision' | 'week';
type Stage = 'welcome' | 'spread-select' | 'reading';

interface Spread {
    id: SpreadId;
    name: string;
    description?: string;
    iconImage: any; // require() path for custom watercolor icons
    cards: number;
}

const SPREADS: Spread[] = [
    { id: 'love', name: 'Láska a vztahy', iconImage: require('../../assets/icons/spreads/heart.png'), cards: 3 },
    { id: 'finance', name: 'Finance', iconImage: require('../../assets/icons/spreads/money.png'), cards: 3 },
    { id: 'body', name: 'Tělo a mysl', iconImage: require('../../assets/icons/spreads/meditation.png'), cards: 3 },
    { id: 'moon', name: 'Měsíční fáze', iconImage: require('../../assets/icons/spreads/moon.png'), cards: 5 },
    { id: 'decision', name: 'Rozhodnutí', iconImage: require('../../assets/icons/spreads/lightbulb.png'), cards: 3 },
    { id: 'week', name: '7 dní', iconImage: require('../../assets/icons/spreads/hourglass.png'), cards: 7 },
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
    const [stage, setStage] = useState<Stage>('welcome');

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
            setFlippedCards([...flippedCards, idx]);
        }
    };

    const startReading = (spread: Spread) => {
        // No disabled spreads for now
        // if (spread.id === 'celtic') return; 

        setSelectedSpread(spread);
        setFlippedCards([]);
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
                        activeOpacity={0.7}
                    >
                        <Image
                            source={spread.iconImage}
                            style={styles.watercolorIcon}
                            resizeMode="contain"
                        />

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
                    <Text style={styles.subtitle}>Dotkni se karet pro odhalení</Text>
                </View>

                <View style={styles.boardContainer}>
                    {CARD_POSITIONS[selectedSpread.id].map((pos, idx) => (
                        <CardComponent
                            key={idx}
                            index={idx}
                            position={pos}
                            isFlipped={flippedCards.includes(idx)}
                            onFlip={() => flipCard(idx)}
                            totalCards={selectedSpread.cards}
                        />
                    ))}
                </View>

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
const CardComponent = ({ index, position, isFlipped, onFlip, totalCards }: any) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: isFlipped ? 180 : 0,
            duration: 600,
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

    const cardWidth = width * 0.22;
    const cardHeight = cardWidth * 1.5;

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={onFlip}
            style={[
                styles.cardWrapper,
                {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    width: cardWidth,
                    height: cardHeight,
                    marginLeft: -cardWidth / 2,
                    marginTop: -cardHeight / 2,
                    zIndex: isFlipped ? 100 + index : index,
                }
            ]}
        >
            {/* Back of Card (Face Down) */}
            <Animated.View
                style={[
                    styles.cardFace,
                    styles.cardBack,
                    { transform: [{ rotateY: frontInterpolate }] }
                ]}
            >
                <Ionicons name="sparkles" size={16} color="rgba(255, 215, 0, 0.4)" />
            </Animated.View>

            {/* Front of Card (Face Up) - Placeholder for now, simplified */}
            <Animated.View
                style={[
                    styles.cardFace,
                    styles.cardFront,
                    { transform: [{ rotateY: backInterpolate }] }
                ]}
            >
                {/* Real card image logic would go here, skipping for simple reading view or needs integrating */}
                <Text style={styles.cardLabel}>{index + 1}</Text>
            </Animated.View>
        </TouchableOpacity>
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
        backgroundColor: 'rgba(255, 255, 255, 0.25)', // Increased opacity for contrast (was 0.15)
        borderRadius: 24,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)', // Stronger border
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3, // Visible shadow
        shadowRadius: 4.65,
        elevation: 8,
    },
    watercolorIcon: {
        width: 110,
        height: 110,
        marginBottom: spacing.xs,
    },
    cardContent: {
        alignItems: 'center',
    },
    spreadName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        marginBottom: 2,
        textShadowColor: 'rgba(0,0,0,0.9)', // Strong shadow for text
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    // Reading
    readingContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingTop: 60,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    heading: {
        fontSize: 28,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: spacing.xs,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    boardContainer: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    cardWrapper: {
        position: 'absolute',
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
        backgroundColor: '#1a1a1a', // Dark back
        borderColor: 'rgba(255, 215, 0, 0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    cardFront: {
        backgroundColor: '#fff',
        borderColor: '#ddd',
        transform: [{ rotateY: '180deg' }],
    },
    cardLabel: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    backButton: {
        marginBottom: 40,
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
