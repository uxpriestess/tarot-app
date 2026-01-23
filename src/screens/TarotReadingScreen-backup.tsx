// ✅ RECOMMENDED: Use JSON pre-fetch (faster, better coherence)
// This version:
// 1. Pre-fetches JSON on mount (faster than 3 separate calls)
// 2. Shows meanings progressively as cards flip
// 3. Fixes layout/positioning issues
// 4. Labels ABOVE cards
// 5. Only 2 header lines

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

// Glimmer component (unchanged)
const Glimmer = () => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.delay(8000),
            ])
        ).start();
    }, []);

    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.8, width * 0.8] });
    const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.3, 0.3, 0] });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { skewX: '-30deg' }], width: '40%', opacity }]}>
                <LinearGradient colors={['transparent', 'rgba(255, 255, 255, 0.15)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            </Animated.View>
        </View>
    );
};

// Types
type SpreadId = 'love' | 'finance' | 'body' | 'moon' | 'decision' | 'week';
type Stage = 'welcome' | 'reading';

interface Spread {
    id: SpreadId;
    name: string;
    iconImage: any;
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

// UPDATED POSITIONS
const CARD_POSITIONS: Record<SpreadId, { x: number; y: number }[]> = {
    love: [
        { x: 25, y: 40 },
        { x: 75, y: 40 },
        { x: 50, y: 75 }
    ],
    finance: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 70 }],
    body: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 70 }],
    moon: [{ x: 50, y: 50 }],
    decision: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 70 }],
    week: [
        { x: 20, y: 15 }, { x: 50, y: 15 }, { x: 80, y: 15 },
        { x: 50, y: 45 },
        { x: 20, y: 75 }, { x: 50, y: 75 }, { x: 80, y: 75 }
    ]
};

interface Props {
    onClose?: () => void;
}

export const TarotReadingScreen = ({ onClose }: Props) => {
    const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
    const [drawnCards, setDrawnCards] = useState<any[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [revealedCount, setRevealedCount] = useState(0);
    const [cardMeanings, setCardMeanings] = useState<string[]>([]); // Pre-fetched meanings
    const [isLoadingMeanings, setIsLoadingMeanings] = useState(false);
    const [stage, setStage] = useState<Stage>('welcome');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (isLoadingMeanings) {
            Animated.loop(
                Animated.timing(rotateAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
            ).start();
        } else {
            rotateAnim.stopAnimation();
            rotateAnim.setValue(0);
        }
    }, [isLoadingMeanings]);

    const flipCard = (idx: number) => {
        console.log(`=== FLIP CARD ${idx} ===`);
        console.log(`revealedCount: ${revealedCount}, already flipped: ${flippedCards.includes(idx)}`);

        // Enforce sequential reveal
        if (idx !== revealedCount || flippedCards.includes(idx)) {
            console.log('❌ Flip blocked');
            return;
        }

        // Flip the card
        setFlippedCards(prev => [...prev, idx]);
        setRevealedCount(prev => prev + 1);

        console.log(`✅ Card ${idx} flipped. Meaning:`, cardMeanings[idx]?.substring(0, 50));
    };

    // ✅ Pre-fetch JSON for Love spread
    const preFetchLoveMeanings = async (cards: any[], spread: Spread) => {
        console.log('=== PRE-FETCHING LOVE MEANINGS ===');
        setIsLoadingMeanings(true);

        try {
            const reading = await performReading({
                spreadName: spread.name,
                cards: cards.map((dc, idx) => ({
                    name: dc.card.name,
                    nameCzech: dc.card.nameCzech,
                    position: dc.position,
                    label: spread.labels![idx]
                })),
                question: 'Celkový výhled vztahu',
                mode: 'love_3_card'
            });

            console.log('Raw AI response:', reading.substring(0, 100));

            // Parse JSON response
            try {
                // Strip markdown code blocks if present
                let cleanResponse = reading.replace(/```json\s?|```/g, '').trim();

                // Find JSON object
                const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleanResponse = jsonMatch[0];
                }

                const parsed = JSON.parse(cleanResponse);
                console.log('Parsed JSON:', Object.keys(parsed));

                // Convert to array format
                const meanings = [
                    parsed.ty || '',
                    parsed.partner || '',
                    parsed.vztah || ''
                ].filter(m => m.length > 0);

                console.log(`✅ Extracted ${meanings.length} meanings`);
                console.log('Meaning 1 (Ty):', meanings[0]?.substring(0, 50));
                console.log('Meaning 2 (Partner):', meanings[1]?.substring(0, 50));
                console.log('Meaning 3 (Vztah):', meanings[2]?.substring(0, 50));

                setCardMeanings(meanings);

            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                console.error('Attempted to parse:', reading);
                // Fallback: show raw response
                setCardMeanings([reading, '', '']);
            }

        } catch (error) {
            console.error('❌ API error:', error);
        } finally {
            setIsLoadingMeanings(false);
        }
    };

    const startReading = (spread: Spread) => {
        console.log("=== STARTING READING ===");
        console.log("Spread:", spread.id);

        // Draw cards
        const cards = [];
        for (let i = 0; i < spread.cards; i++) {
            const drawn = drawCard();
            console.log(`Card ${i}:`, drawn.card.nameCzech, drawn.position);
            cards.push(drawn);
        }

        setDrawnCards(cards);
        setSelectedSpread(spread);
        setFlippedCards([]);
        setRevealedCount(0);
        setCardMeanings([]);
        setStage('reading');

        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

        // ✅ Pre-fetch for Love spread
        if (spread.id === 'love') {
            console.log('🔮 Triggering pre-fetch for Love spread');
            preFetchLoveMeanings(cards, spread);
        }
    };

    const resetReading = () => {
        setStage('welcome');
        setSelectedSpread(null);
        setFlippedCards([]);
        setCardMeanings([]);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    };

    const renderWelcome = () => (
        <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Čtení</Text>
                <Text style={styles.subtitle}>Vyber si styl výkladu</Text>
            </View>

            <ScrollView contentContainerStyle={styles.spreadList} showsVerticalScrollIndicator={false}>
                {SPREADS.map((spread) => (
                    <TouchableOpacity key={spread.id} style={styles.spreadCard} onPress={() => startReading(spread)}>
                        <Glimmer />
                        <View style={styles.iconWrapper}>
                            <Image source={spread.iconImage} style={styles.watercolorIcon} resizeMode="contain" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.spreadName}>{spread.name}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );

    const renderReading = () => {
        if (!selectedSpread) return null;

        const subtitle = selectedSpread.id === 'love' ? 'Co je mezi vámi?' : 'Ponořte se do své otázky...';

        return (
            <Animated.View style={[styles.readingContainer, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={resetReading} style={styles.readingBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                {/* ✅ Only 2 header lines */}
                <View style={styles.readingHeader}>
                    <Text style={styles.readingTitle}>{selectedSpread.name}</Text>
                    <Text style={styles.readingSubtitle}>{subtitle}</Text>
                </View>

                <View style={styles.spreadArea}>
                    {drawnCards.map((dc, idx) => (
                        <CardComponent
                            key={idx}
                            index={idx}
                            position={CARD_POSITIONS[selectedSpread.id][idx]}
                            isFlipped={flippedCards.includes(idx)}
                            onFlip={() => flipCard(idx)}
                            cardData={dc}
                            label={selectedSpread.labels?.[idx]}
                            isLocked={idx !== revealedCount}
                        />
                    ))}
                </View>

                {/* Meanings Area */}
                <ScrollView style={styles.meaningsScroll} contentContainerStyle={styles.meaningsContent}>
                    {isLoadingMeanings && cardMeanings.length === 0 && (
                        <View style={styles.loadingContainer}>
                            <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                                <Ionicons name="sparkles" size={32} color={colors.lavender} />
                            </Animated.View>
                            <Text style={styles.loadingText}>Připravuji výklad...</Text>
                        </View>
                    )}

                    {/* Show meanings progressively as cards flip */}
                    {flippedCards.map((flippedIdx) => cardMeanings[flippedIdx] && (
                        <View key={flippedIdx} style={styles.meaningCard}>
                            <Text style={styles.meaningLabel}>{selectedSpread.labels?.[flippedIdx]}</Text>
                            <Text style={styles.meaningText}>{cardMeanings[flippedIdx]}</Text>
                        </View>
                    ))}

                    {/* Done button */}
                    {selectedSpread.id === 'love' && flippedCards.length === selectedSpread.cards && cardMeanings.length === 3 && (
                        <TouchableOpacity style={styles.doneButton} onPress={resetReading}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.lavender} />
                            <Text style={styles.doneButtonText}>Děkuji za výklad</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </Animated.View>
        );
    };

    return (
        <ImmersiveScreen screenName="reading">
            <View style={styles.safeArea}>
                {stage === 'welcome' && renderWelcome()}
                {stage === 'reading' && renderReading()}
            </View>
        </ImmersiveScreen>
    );
};

// Card Component with label ABOVE
const CardComponent = ({ index, position, isFlipped, onFlip, cardData, label, isLocked }: any) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(rotateAnim, { toValue: isFlipped ? 180 : 0, duration: 700, useNativeDriver: true }).start();
    }, [isFlipped]);

    const frontInterpolate = rotateAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const backInterpolate = rotateAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

    const cardWidth = width * 0.3;
    const cardHeight = cardWidth * 1.5;

    return (
        <View style={[styles.cardWrapper, {
            left: `${position.x}%`,
            top: `${position.y}%`,
            width: cardWidth,
            height: cardHeight + 50,
            marginLeft: -cardWidth / 2,
            marginTop: -(cardHeight + 50) / 2,
        }]}>
            {/* Label ABOVE */}
            {label && <Text style={styles.labelAbove}>{label}</Text>}

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onFlip}
                disabled={isLocked}
                style={{ width: cardWidth, height: cardHeight, opacity: isLocked ? 0.5 : 1, marginTop: 30 }}
            >
                {/* Back */}
                <Animated.View style={[styles.cardFace, styles.cardBack, { transform: [{ rotateY: frontInterpolate }] }]}>
                    <View style={styles.cardBackInner}>
                        <Ionicons name="sparkles" size={28} color="rgba(255,255,255,0.3)" />
                    </View>
                </Animated.View>

                {/* Front - only load when flipped */}
                <Animated.View style={[styles.cardFace, styles.cardFront, { transform: [{ rotateY: backInterpolate }] }]}>
                    {cardData && isFlipped && (
                        <CardImage imageName={cardData.card.imageName} width={cardWidth - 4} height={cardHeight - 4} />
                    )}
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

// Styles (same as before but with labelAbove)
const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    centerContent: { flex: 1, padding: spacing.md, paddingTop: 60 },
    titleContainer: { marginBottom: spacing.xl, paddingHorizontal: spacing.md },
    title: { fontSize: 32, color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', fontWeight: '700', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', fontWeight: '400', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    spreadList: { paddingBottom: 40, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
    spreadCard: { width: '48%', aspectRatio: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 24, padding: spacing.md, marginBottom: spacing.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)', overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
    iconWrapper: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: -10 },
    watercolorIcon: { width: 140, height: 140 },
    cardContent: { alignItems: 'center', marginTop: 0 },
    spreadName: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', textAlign: 'center', paddingHorizontal: 4, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    readingContainer: { flex: 1, width: '100%' },
    readingBackButton: { position: 'absolute', top: 10, left: 20, zIndex: 50, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
    readingHeader: { alignItems: 'center', marginTop: 60, marginBottom: spacing.lg, paddingHorizontal: spacing.md },
    readingTitle: { fontSize: 28, color: colors.textCream, fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', fontWeight: '600', marginBottom: 6, textAlign: 'center' },
    readingSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.6)', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', textAlign: 'center' },
    spreadArea: { height: 360, width: '100%', position: 'relative', marginBottom: spacing.md },
    cardWrapper: { position: 'absolute', alignItems: 'center' },
    labelAbove: { position: 'absolute', top: 0, color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    cardFace: { position: 'absolute', width: '100%', height: '100%', borderRadius: borderRadius.sm, backfaceVisibility: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    cardBack: { backgroundColor: '#1a1420', borderColor: '#8B7BA8', borderWidth: 2, padding: 8 },
    cardBackInner: { flex: 1, width: '100%', height: '100%', borderWidth: 1, borderColor: 'rgba(139, 123, 168, 0.4)', borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
    cardFront: { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.2)', transform: [{ rotateY: '180deg' }], overflow: 'hidden' },
    closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    meaningsScroll: { flex: 1, paddingHorizontal: spacing.md },
    meaningsContent: { paddingBottom: 100 },
    loadingContainer: { padding: 20, alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12, fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif' },
    meaningCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    meaningLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: spacing.xs },
    meaningText: { fontSize: 16, lineHeight: 24, color: 'rgba(255, 255, 255, 0.95)', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif' },
    doneButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 30, backgroundColor: 'rgba(100, 80, 120, 0.3)', borderRadius: 30, marginTop: 20, borderWidth: 1, borderColor: colors.lavender + '50' },
    doneButtonText: { color: colors.textCream, marginLeft: 8, fontSize: 16, fontWeight: '600' },
});