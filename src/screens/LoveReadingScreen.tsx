/**
 * LoveReadingScreen_REFACTORED.tsx
 * 
 * REFACTORED VERSION - Uses RevealableCard Component
 * 
 * Key Changes:
 * - Card and meaning are now unified in RevealableCard
 * - Cards stack vertically instead of fixed positions
 * - Sequential reveal is handled by disabled prop
 * - Smooth expansion animations built-in
 * - Meanings appear INSIDE the cards, not in separate section
 * 
 * Philosophy: "The card IS the meaning"
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { RevealableCard } from '../components/RevealableCard';
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

type Stage = 'ritual' | 'reading' | 'complete';

interface LoveReadingScreenProps {
    onClose?: () => void;
}

export const LoveReadingScreen = ({ onClose }: LoveReadingScreenProps) => {
    // Core state
    const [stage, setStage] = useState<Stage>('ritual');
    const [drawnCards, setDrawnCards] = useState<any[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [cardMeanings, setCardMeanings] = useState<string[]>(['', '', '']);
    const [isLoadingMeanings, setIsLoadingMeanings] = useState(false);
    
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

    // Background glow escalates with each card
    useEffect(() => {
        const targetGlow = Math.min(flippedCards.length / 3, 1);
        Animated.timing(glowAnim, {
            toValue: targetGlow,
            duration: 600,
            useNativeDriver: false
        }).start();
    }, [flippedCards.length]);

    // Check if all cards are revealed
    useEffect(() => {
        if (flippedCards.length === 3 && stage !== 'complete') {
            setStage('complete');
        }
    }, [flippedCards]);

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
        // Your drawCard returns { card: TarotCard, position: 'upright' | 'reversed' }
        const draw1 = drawCard();
        const draw2 = drawCard([draw1.card.name]);
        const draw3 = drawCard([draw1.card.name, draw2.card.name]);
        
        // Extract just the cards for our state
        const cards = [draw1.card, draw2.card, draw3.card];
        
        console.log('Cards drawn:', cards.map(c => c.name));
        setDrawnCards(cards);
        
        // Fetch AI meanings
        setIsLoadingMeanings(true);
        try {
            const reading = await performReading({
                spreadName: 'Láska a vztahy',
                cards: cards.map((card, idx) => ({
                    name: card.name,
                    nameCzech: card.nameCzech,
                    position: 'upright', // Love reading doesn't use reversed cards
                    label: ['Ty', 'Partner', 'Tvůj vztah'][idx]
                })),
                question: 'Co je mezi námi?',
                mode: 'love'
            });
            
            console.log('API response:', reading);
            
            if (reading?.sections?.length === 3) {
                // Extract just the text from each section
                const meanings = reading.sections.map((s: ReadingSection) => s.text);
                setCardMeanings(meanings);
                console.log('Meanings loaded successfully');
            } else {
                console.error('Invalid API response structure');
            }
        } catch (error) {
            console.error('Error fetching meanings:', error);
        } finally {
            setIsLoadingMeanings(false);
        }
        
        // Move to reading stage
        setStage('reading');
    };

    // Handle card flip
    const flipCard = (index: number) => {
        // Sequential lock: can't flip card 2 until card 1 is flipped
        if (index > 0 && !flippedCards.includes(index - 1)) {
            return; // RevealableCard handles the shake animation
        }

        // Haptic feedback
        if (Haptics) {
            const hapticStrength = ['light', 'medium', 'heavy'][index];
            if (hapticStrength === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            else if (hapticStrength === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        // Toggle flip state
        if (flippedCards.includes(index)) {
            setFlippedCards(flippedCards.filter(i => i !== index));
        } else {
            setFlippedCards([...flippedCards, index]);
        }
    };

    // Guidance text based on progress
    const getGuidanceText = () => {
        if (flippedCards.length === 0) return 'Začni klepnutím na první kartu';
        if (flippedCards.length === 1) return 'Nyní odhal kartu svého partnera';
        if (flippedCards.length === 2) return 'A nakonec váš společný vztah';
        return 'Výklad je kompletní ✨';
    };

    // Ritual opening screen
    if (stage === 'ritual') {
        return (
            <ImmersiveScreen screenName="LoveReading">
                <SafeAreaView style={styles.container}>
                    <Animated.View style={[styles.ritualContainer, { opacity: fadeAnim }]}>
                        <View style={styles.ritualContent}>
                            <Ionicons name="heart" size={60} color={colors.lavender} />
                            <Text style={styles.ritualTitle}>Výklad lásky a vztahů</Text>
                            <Text style={styles.ritualDescription}>
                                Tři karty odhalí tvůj vnitřní svět, svět tvého partnera 
                                a energii vašeho vztahu.
                            </Text>
                            <Text style={styles.ritualInstruction}>
                                Soustřeď se na svou otázku a když budeš připraven/á, 
                                vytáhni karty.
                            </Text>
                            
                            <TouchableOpacity 
                                style={styles.beginButton}
                                onPress={drawCardsAndFetchMeanings}
                            >
                                <Text style={styles.beginButtonText}>Začít výklad</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </ImmersiveScreen>
        );
    }

    // Main reading screen
    return (
        <ImmersiveScreen screenName="LoveReading">
            <SafeAreaView style={styles.container}>
                {/* Animated background glow */}
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
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header with guidance */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Láska a vztahy</Text>
                        <Text style={styles.guidanceText}>{getGuidanceText()}</Text>
                    </View>

                    {/* Cards - Now stacked vertically with RevealableCard */}
                    <View style={styles.cardsContainer}>
                        {drawnCards.map((card, idx) => (
                            <RevealableCard
                                key={idx}
                                card={card}
                                position={['TY', 'PARTNER', 'VÁŠ VZTAH'][idx]}
                                isRevealed={flippedCards.includes(idx)}
                                onToggleReveal={() => flipCard(idx)}
                                aiMeaning={cardMeanings[idx]}
                                disabled={idx > 0 && !flippedCards.includes(idx - 1)}
                                showPosition={true}
                                cardWidth={280}
                                cardHeight={420}
                            />
                        ))}
                    </View>

                    {/* Done button (appears when complete) */}
                    {stage === 'complete' && (
                        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.doneButtonText}>Zavřít výklad</Text>
                        </TouchableOpacity>
                    )}

                    {/* Bottom spacing */}
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
// STYLES
// ============================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Ritual screen
    ritualContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    ritualContent: {
        alignItems: 'center',
        maxWidth: 400,
    },
    ritualTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    ritualDescription: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.lg,
    },
    ritualInstruction: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: spacing.xl,
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
    },
    beginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Reading screen
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: spacing.sm,
    },
    guidanceText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    cardsContainer: {
        alignItems: 'center',
        gap: spacing.lg, // Space between cards
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
        alignSelf: 'center',
        shadowColor: colors.lavender,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginLeft: spacing.sm,
    },
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
