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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Types
type SpreadId = 'single' | 'three' | 'celtic';
type Stage = 'welcome' | 'spread-select' | 'reading';

interface Spread {
    id: SpreadId;
    name: string;
    cards: number;
    desc: string;
}

const SPREADS: Spread[] = [
    { id: 'single', name: 'Single Card', cards: 1, desc: 'Quick daily guidance' },
    { id: 'three', name: 'Past Present Future', cards: 3, desc: 'Timeline reading' },
    { id: 'celtic', name: 'Celtic Cross', cards: 10, desc: 'Deep dive' },
];

const CARD_POSITIONS: Record<SpreadId, { x: number; y: number }[]> = {
    single: [{ x: 50, y: 50 }],
    three: [{ x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 }], // Adjusted for mobile width
    celtic: [
        { x: 50, y: 50 }, { x: 50, y: 50 },
        { x: 50, y: 20 }, { x: 50, y: 80 },
        { x: 20, y: 50 }, { x: 80, y: 50 },
        { x: 85, y: 80 }, { x: 85, y: 65 },
        { x: 85, y: 50 }, { x: 85, y: 35 },
    ],
};

interface TarotReadingScreenProps {
    onClose?: () => void;
}

export const TarotReadingScreen = ({ onClose }: TarotReadingScreenProps) => {
    const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [stage, setStage] = useState<Stage>('welcome');

    // Animation Refs
    const floatAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Star animations (array of random values)
    const stars = useRef([...Array(15)].map(() => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        anim: new Animated.Value(0.2),
        duration: 3000 + Math.random() * 3000,
        delay: Math.random() * 5000,
    }))).current;

    useEffect(() => {
        // Entrance Fade
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // Float Animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -10,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Star Twinkle
        stars.forEach(star => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(star.anim, {
                        toValue: 1,
                        duration: star.duration / 2,
                        delay: star.delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(star.anim, {
                        toValue: 0.2,
                        duration: star.duration / 2,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        });
    }, []);

    const flipCard = (idx: number) => {
        if (!flippedCards.includes(idx)) {
            setFlippedCards([...flippedCards, idx]);
        }
    };

    const startReading = (spread: Spread) => {
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
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <Ionicons name="moon-outline" size={80} color={colors.primary} />
            </Animated.View>

            <View style={styles.titleContainer}>
                <Text style={styles.title}>Mystic Tarot</Text>
                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Ionicons name="sparkles" size={12} color={colors.secondary} />
                    <View style={styles.dividerLine} />
                </View>
                <Text style={styles.subtitle}>Unveil the mysteries that await</Text>
            </View>

            <TouchableOpacity
                style={styles.mainButton}
                onPress={() => setStage('spread-select')}
                activeOpacity={0.8}
            >
                <Text style={styles.mainButtonText}>Begin Your Journey</Text>
                <Ionicons name="sparkles-outline" size={20} color={colors.surface} style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
                onPress={onClose}
                style={{ position: 'absolute', top: 60, right: 20, zIndex: 100 }}
            >
                <Ionicons name="close" size={30} color={colors.textLight} />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderSpreadSelect = () => (
        <Animated.View style={[styles.centerContent, { opacity: fadeAnim, width: '100%' }]}>
            <View style={styles.headerContainer}>
                <Text style={styles.heading}>Choose Your Spread</Text>
                <Text style={styles.subtitle}>Each spread reveals different layers of truth</Text>
            </View>

            <ScrollView contentContainerStyle={styles.spreadList} showsVerticalScrollIndicator={false}>
                {SPREADS.map((spread, idx) => (
                    <TouchableOpacity
                        key={spread.id}
                        style={styles.spreadCard}
                        onPress={() => startReading(spread)}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.spreadIcon,
                            { backgroundColor: idx === 0 ? colors.lavender : idx === 1 ? colors.rose : colors.sage }
                        ]}>
                            <Text style={styles.spreadIconText}>{spread.cards}</Text>
                        </View>
                        <View style={styles.spreadInfo}>
                            <Text style={styles.spreadName}>{spread.name}</Text>
                            <Text style={styles.spreadDesc}>{spread.desc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity onPress={resetReading} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderReading = () => {
        if (!selectedSpread) return null;

        return (
            <Animated.View style={[styles.readingContainer, { opacity: fadeAnim }]}>
                <View style={styles.headerContainer}>
                    <Text style={styles.heading}>{selectedSpread.name}</Text>
                    <Text style={styles.subtitle}>Tap each card to reveal your reading</Text>
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

                <TouchableOpacity onPress={resetReading} style={styles.newReadingButton}>
                    <Text style={styles.mainButtonText}>New Reading</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background Ambience */}
            <View style={styles.backgroundLayer}>
                <View style={[styles.glowBlob, { top: -100, left: -100, backgroundColor: colors.lavender }]} />
                <View style={[styles.glowBlob, { bottom: -100, right: -100, backgroundColor: colors.tertiary }]} />
                <View style={[styles.glowBlob, { top: '40%', left: '30%', backgroundColor: colors.secondary }]} />
            </View>

            {/* Stars */}
            {stars.map((star, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.star,
                        {
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            opacity: star.anim,
                            transform: [{ scale: star.anim }],
                            backgroundColor: i % 2 === 0 ? colors.lavender : colors.secondary
                        }
                    ]}
                />
            ))}

            <SafeAreaView style={styles.safeArea}>
                {stage === 'welcome' && renderWelcome()}
                {stage === 'spread-select' && renderSpreadSelect()}
                {stage === 'reading' && renderReading()}
            </SafeAreaView>
        </View>
    );
};

// Sub-component for individual card animation
// Moved outside main component to avoid re-creation logic issues with hooks if possible, 
// using props instead.
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

    // Calculate position styles
    // Positions are in %, we map to width/height
    const cardWidth = width * 0.22; // Responsive card size
    const cardHeight = cardWidth * 1.5;

    // Center of board is roughly center of container. 
    // Let's assume board is full width and fixed height or flexible.
    // Using absolute positioning within the board container.

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
                    // Center the card on the point
                    marginLeft: -cardWidth / 2,
                    marginTop: -cardHeight / 2,
                    zIndex: isFlipped ? 100 : index, // Bring to front when flipped
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
                <Ionicons name="moon" size={24} color={colors.surface} style={{ opacity: 0.9 }} />
                <View style={styles.cardStars}>
                    <Ionicons name="star" size={8} color={colors.secondary} />
                    <Ionicons name="star" size={8} color={colors.secondary} />
                    <Ionicons name="star" size={8} color={colors.secondary} />
                </View>
            </Animated.View>

            {/* Front of Card (Face Up) */}
            <Animated.View
                style={[
                    styles.cardFace,
                    styles.cardFront,
                    { transform: [{ rotateY: backInterpolate }] }
                ]}
            >
                <Ionicons name="ellipse-outline" size={32} color={colors.secondary} />
                <Text style={styles.cardLabel}>Card {index + 1}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    glowBlob: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.2, // Simulate blur with low opacity
    },
    star: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    safeArea: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    titleContainer: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    title: {
        fontSize: 42,
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontWeight: '300',
        letterSpacing: 1,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
        gap: 8,
    },
    dividerLine: {
        height: 1,
        width: 60,
        backgroundColor: colors.secondary,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    mainButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        marginTop: spacing.lg,
    },
    mainButtonText: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: '500',
    },
    // Spread Select
    headerContainer: {
        marginBottom: spacing.xl,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    heading: {
        fontSize: 32,
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontWeight: '300',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    spreadList: {
        width: '100%',
        paddingHorizontal: spacing.md,
    },
    spreadCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    spreadIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    spreadIconText: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: '600',
    },
    spreadInfo: {
        flex: 1,
    },
    spreadName: {
        fontSize: 18,
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontWeight: '500',
    },
    spreadDesc: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    backButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
        marginTop: spacing.lg,
    },
    backButtonText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    // Reading
    readingContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    boardContainer: {
        flex: 1,
        width: '100%',
        position: 'relative',
        // Ensure we have some space
        minHeight: 400,
    },
    cardWrapper: {
        position: 'absolute',
    },
    cardFace: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.md,
        backfaceVisibility: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    cardBack: {
        backgroundColor: colors.primary,
        borderColor: colors.lavender,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    cardFront: {
        backgroundColor: colors.surface,
        borderColor: colors.secondary,
        transform: [{ rotateY: '180deg' }], // Initially flipped away
    },
    cardStars: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 8,
    },
    cardLabel: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginTop: 4,
    },
    newReadingButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.full,
        marginBottom: spacing.xl,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
});
