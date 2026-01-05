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
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { ImmersiveScreen } from '../components/ImmersiveScreen';

const { width } = Dimensions.get('window');

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
    { id: 'single', name: 'Jednoduchý výklad', cards: 1, desc: 'Rychlá odpověď na tvou otázku' },
    { id: 'three', name: 'Tři karty', cards: 3, desc: 'Minulost • Současnost • Budoucnost; Hlubší pohled na situaci' },
    { id: 'celtic', name: 'Keltský kříž', cards: 10, desc: 'Kompletní analýza života' },
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
        if (spread.id === 'celtic') return; // Temporarily disable/mark as 'soon' if logic isn't ready, or allow it. Logic exists so we allow it.

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
                <Text style={styles.subtitle}>Vyber typ výkladu</Text>
            </View>

            <ScrollView contentContainerStyle={styles.spreadList} showsVerticalScrollIndicator={false}>
                {SPREADS.map((spread) => (
                    <TouchableOpacity
                        key={spread.id}
                        style={[styles.spreadCard, spread.id === 'celtic' && { opacity: 0.8 }]}
                        onPress={() => startReading(spread)}
                        activeOpacity={0.7}
                        disabled={spread.id === 'celtic' && false} // Keep enabled or disable if needed
                    >
                        <View style={[
                            styles.spreadIcon,
                            { backgroundColor: spread.id === 'single' ? 'rgba(235, 230, 220, 0.2)' : spread.id === 'three' ? 'rgba(200, 190, 230, 0.2)' : 'rgba(180, 210, 200, 0.2)' }
                        ]}>
                            <Ionicons
                                name={spread.id === 'single' ? 'flash' : spread.id === 'three' ? 'triangle' : 'grid'}
                                size={24}
                                color={spread.id === 'single' ? '#D4AF37' : spread.id === 'three' ? '#A890D3' : '#88B0A0'}
                            />
                        </View>
                        <View style={styles.spreadInfo}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.spreadName}>{spread.name}</Text>
                                {spread.id === 'celtic' && (
                                    <View style={styles.soonBadge}>
                                        <Text style={styles.soonText}>Brzy</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.spreadCardCount}>{spread.cards} {spread.cards === 1 ? 'karta' : spread.cards < 5 ? 'karty' : 'karet'}</Text>
                            <Text style={styles.spreadDesc}>{spread.desc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
            >
                <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderReading = () => {
        if (!selectedSpread) return null;

        return (
            <Animated.View style={[styles.readingContainer, { opacity: fadeAnim }]}>
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
        <ImmersiveScreen screenName="reading" variant="default">
            <SafeAreaView style={styles.safeArea}>
                {stage === 'welcome' && renderWelcome()}
                {stage === 'spread-select' && renderWelcome()}
                {stage === 'reading' && renderReading()}
            </SafeAreaView>
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
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '400',
    },
    spreadList: {
        paddingBottom: 40,
    },
    spreadCard: {
        flexDirection: 'row',
        backgroundColor: '#fff', // Solid white as requested by user ("I think it deserves a beautiful makeover just like homescreen"), wait, user images show Solid White cards on a background? 
        // User images show: White cards with round corners, very clean.
        // Let's stick to the user's inspiration: Solid White Cards with high readability.
        borderRadius: 24,
        padding: spacing.lg,
        marginBottom: spacing.md,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    spreadIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    spreadInfo: {
        flex: 1,
    },
    spreadName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a', // Dark text as per image
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', // Keep serif for elegance
        marginBottom: 2,
    },
    spreadCardCount: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    spreadDesc: {
        fontSize: 14,
        color: '#888',
        lineHeight: 20,
    },
    soonBadge: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    soonText: {
        fontSize: 10,
        color: '#999',
        fontWeight: '600',
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
});
