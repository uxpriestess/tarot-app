// ✅ RECOMMENDED: Use JSON pre-fetch (faster, better coherence)
// This version:
// 1. Pre-fetches JSON on mount (faster than 3 separate calls)
// 2. Shows meanings progressively as cards flip
// 3. Fixes layout/positioning issues
// 4. Labels ABOVE cards
// 5. Only 2 header lines
//
// 🌙 MOON SPREAD: Refactored to single-scroll layout (like CardRevealScreen)
//    - One ScrollView with flexGrow: 1 — no competing scroll areas
//    - Card flows in document (centered block, not absolute positioned)
//    - Keywords as pills below card (identical to daily card keywords)
//    - Meaning card appears below after flip, fully scrollable
//    - All other spreads completely unchanged

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
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import { drawCard } from '../data';
import { CardImage } from '../components/CardImage';
import { performReading, ReadingSection } from '../services/universe';
import { getMoonPhase } from '../utils/moonPhase';

const { width } = Dimensions.get('window');

// Card dimensions for moon spread — same proportions as daily card (0.75 width)
const MOON_CARD_WIDTH = Math.round(width * 0.75);
const MOON_CARD_HEIGHT = Math.round(MOON_CARD_WIDTH * 1.5);

// 🌙 Enhanced Moon Phase Data with Keywords
interface MoonPhaseEnhanced {
    icon: string;
    name: string;
    theme: string;
    description: string;
    energy: string;
    keywords: string[];
}

const MOON_PHASES_ENHANCED: MoonPhaseEnhanced[] = [
    {
        icon: '🌑',
        name: 'Novoluní',
        theme: 'začátky, záměr, tichá touha',
        description: 'Energie je nízká, ale plodná. Pocity jsou jemné, plány se formují pod povrchem.',
        energy: 'Dobrý čas se ptát: Co chci pěstovat, i když ještě nejsem připravený jednat?',
        keywords: ['začátky', 'záměr', 'ticho', 'introspekce', 'zasazení semínka', 'nový cyklus']
    },
    {
        icon: '🌒',
        name: 'Dorůstající srpek',
        theme: 'růst, akce, odvaha',
        description: 'První kroky do světa, odvaha jednat. Energie roste, plány se začínají projevovat.',
        energy: 'Dobrý čas se ptát: Jaký první krok můžu udělat?',
        keywords: ['růst', 'akce', 'odvaha', 'první kroky', 'momentum', 'rozhodnost']
    },
    {
        icon: '🌓',
        name: 'První čtvrt',
        theme: 'výzva, rozhodnutí, překážky',
        description: 'Střet se skutečností, překážky na cestě. Síla je na vrcholu, je čas se rozhodnout.',
        energy: 'Dobrý čas se ptát: Co je moje pravda a jak za ní stojím?',
        keywords: ['výzva', 'rozhodnutí', 'překážky', 'síla', 'akce', 'přizpůsobení']
    },
    {
        icon: '🌔',
        name: 'Dorůstající měsíc',
        theme: 'rozvoj, vyladění, trpělivost',
        description: 'Jemné doladění, trpělivé budování. Energie je stabilní, pozornost je klíčová.',
        energy: 'Dobrý čas se ptát: Co potřebuju vyladit?',
        keywords: ['rozvoj', 'vyladění', 'trpělivost', 'úprava', 'zdokonalení', 'pozornost']
    },
    {
        icon: '🌕',
        name: 'Úplněk',
        theme: 'naplnění, vyvrcholení, oslava',
        description: 'Vyvrcholení, plnost, síla. Světlo osvětluje vše, co bylo skryté.',
        energy: 'Dobrý čas se ptát: Co teď mohu oslavit?',
        keywords: ['naplnění', 'vyvrcholení', 'oslava', 'světlo', 'síla', 'zjevení']
    },
    {
        icon: '🌖',
        name: 'Couvající měsíc',
        theme: 'vděčnost, sdílení, předávání',
        description: 'Sdílení plodů, vděčnost za cestu. Energie pomalu klesá, čas dát dál.',
        energy: 'Dobrý čas se ptát: Co mohu předat dál?',
        keywords: ['vděčnost', 'sdílení', 'předávání', 'ohled', 'přehodnocení', 'pomoc']
    },
    {
        icon: '🌗',
        name: 'Poslední čtvrt',
        theme: 'odpuštění, uvolnění, přehodnocení',
        description: 'Uvolňování toho, co už neslouží. Odpuštění sobě i druhým.',
        energy: 'Dobrý čas se ptát: Co mohu pustit?',
        keywords: ['odpuštění', 'uvolnění', 'přehodnocení', 'odpoutání', 'lehkost', 'klid']
    },
    {
        icon: '🌘',
        name: 'Couvající srpek',
        theme: 'odpočinek, reflexe, moudrost',
        description: 'Ticho před bouří, reflexe nad cestou. Moudrost přichází v klidu.',
        energy: 'Dobrý čas se ptát: Co jsem se naučil?',
        keywords: ['odpočinek', 'reflexe', 'moudrost', 'uzavření', 'příprava', 'tichost']
    }
];

// Helper to get enhanced moon phase with keywords
const getMoonPhaseEnhanced = (date: Date): MoonPhaseEnhanced => {
    const basicPhase = getMoonPhase(date);
    const enhanced = MOON_PHASES_ENHANCED.find(p => p.name === basicPhase.name);
    return enhanced || {
        ...basicPhase,
        keywords: ['tajemství', 'intuice', 'cesta']
    };
};

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

// UPDATED POSITIONS (used by multi-card spreads only — moon uses flow layout)
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
    onOpenLoveReading?: () => void;
}

export const TarotReadingScreen = ({ onClose, onOpenLoveReading }: Props) => {
    const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
    const [drawnCards, setDrawnCards] = useState<any[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [revealedCount, setRevealedCount] = useState(0);
    const [cardMeanings, setCardMeanings] = useState<ReadingSection[]>([]);
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

    // Helper to parse **bold** text
    const parseBoldText = (text: string) => {
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
    };

    // Helper to strip markdown headers (## text)
    const stripMarkdownHeader = (text: string): string => {
        return text.replace(/^##\s*.+?\n/gm, '').trim();
    };

    const flipCard = (idx: number) => {
        console.log(`=== FLIP CARD ${idx} ===`);
        console.log(`revealedCount: ${revealedCount}, already flipped: ${flippedCards.includes(idx)}`);

        // Enforce sequential reveal
        if (idx !== revealedCount || flippedCards.includes(idx)) {
            console.log('❌ Flip blocked');
            return;
        }

        setFlippedCards(prev => [...prev, idx]);
        setRevealedCount(prev => prev + 1);

        console.log(`✅ Card ${idx} flipped. Section:`, cardMeanings[idx]?.text?.substring(0, 50));
    };

    // ✅ Pre-fetch for Moon spread with moon phase context
    const preFetchMoonMeaning = async (cards: any[], spread: Spread) => {
        console.log('=== PRE-FETCHING MOON MEANING ===');
        setIsLoadingMeanings(true);

        try {
            const currentDate = new Date();
            const moonPhase = getMoonPhaseEnhanced(currentDate);

            const moonContext = `Aktuální fáze měsíce: ${moonPhase.icon} ${moonPhase.name}
Téma: ${moonPhase.theme}
${moonPhase.description}
${moonPhase.energy}`;

            console.log('🌙 Moon context:', moonContext);

            const reading = await performReading({
                spreadName: spread.name,
                cards: cards.map((dc, idx) => ({
                    name: dc.card.name,
                    nameCzech: dc.card.nameCzech,
                    position: dc.position,
                    label: spread.labels![idx]
                })),
                question: 'Co mi tato karta říká v kontextu současné fáze měsíce?',
                mode: 'moon_phase',
                moonPhase: moonContext
            });

            console.log('✅ Moon reading received:', reading.sections.length, 'sections');
            setCardMeanings(reading.sections);

        } catch (err) {
            console.error('❌ Moon reading failed:', err);
            setCardMeanings([{ key: 'error', label: null, text: 'Spojení se ztratilo v měsíčním světle. Zkus to znovu.' }]);
        } finally {
            setIsLoadingMeanings(false);
        }
    };

    // ✅ Pre-fetch for Love spread
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

            console.log('✅ Love reading received:', reading.sections.length, 'sections');
            reading.sections.forEach((s, i) => {
                console.log(`  Section ${i}: ${s.key} - ${s.text.substring(0, 40)}...`);
            });

            setCardMeanings(reading.sections);

        } catch (error) {
            console.error('❌ API error:', error);
            setCardMeanings([{ key: 'error', label: null, text: 'Něco se pokazilo. Zkus to znovu.' }]);
        } finally {
            setIsLoadingMeanings(false);
        }
    };

    const startReading = (spread: Spread) => {
        console.log("=== START READING CALLED ===");
        console.log("Spread ID:", spread.id);
        console.log("Spread name:", spread.name);

        // CRITICAL: Intercept love spread immediately
        if (spread.id === 'love') {
            console.log('🔴 LOVE SPREAD DETECTED!');
            console.log(' onOpenLoveReading callback:', onOpenLoveReading);
            console.log(' Type:', typeof onOpenLoveReading);
            console.log(' Truthy?:', !!onOpenLoveReading);

            if (onOpenLoveReading) {
                console.log('✅ CALLING onOpenLoveReading() NOW');
                try {
                    onOpenLoveReading();
                    console.log('✅ onOpenLoveReading() CALLED SUCCESSFULLY');
                } catch (error) {
                    console.error('❌ ERROR calling onOpenLoveReading:', error);
                }
                console.log('✅ RETURNING EARLY - should NOT see any more logs from this function');
                return;
            } else {
                console.error('❌ CRITICAL: onOpenLoveReading is NOT defined!');
                console.error('This means App.tsx is not passing the callback correctly!');
                Alert.alert(
                    'Configuration Error',
                    'onOpenLoveReading callback is missing. Please check App.tsx configuration.'
                );
                return;
            }
        }

        console.log('📝 Continuing with traditional spread render for:', spread.id);

        // Draw cards (for non-love spreads only)
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

        // ✅ Pre-fetch for Moon spread
        if (spread.id === 'moon') {
            console.log('🌙 Triggering pre-fetch for Moon spread');
            preFetchMoonMeaning(cards, spread);
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

    // ─────────────────────────────────────────────────────────────────────────
    // 🌙 MOON READING — single-scroll layout, same pattern as CardRevealScreen
    // ─────────────────────────────────────────────────────────────────────────
    const renderMoonReading = () => {
        const currentMoon = getMoonPhaseEnhanced(new Date());
        const isFlipped = flippedCards.length > 0;
        const section = isFlipped ? cardMeanings[0] : null;
        const cardData = drawnCards[0];

        return (
            <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
                {/* Back button — floats above scroll */}
                <TouchableOpacity onPress={resetReading} style={styles.readingBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <ScrollView
                    contentContainerStyle={styles.moonScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Moon phase badge ── */}
                    <View style={styles.moonBadge}>
                        <Text style={styles.moonBadgeIcon}>{currentMoon.icon}</Text>
                        <View>
                            <Text style={styles.moonBadgeName}>{currentMoon.name}</Text>
                            <Text style={styles.moonBadgeTheme}>{currentMoon.theme}</Text>
                        </View>
                    </View>

                    {/* ── Card — same large size as daily, flows in document ── */}
                    {cardData && (
                        <MoonCardFlow
                            isFlipped={isFlipped}
                            onFlip={() => flipCard(0)}
                            cardData={cardData}
                            pulseEnabled={!isFlipped}
                            glowEnabled={!isFlipped}
                        />
                    )}

                    {/* ── Keywords — shown before flip, pill style identical to daily ── */}
                    {!isFlipped && (
                        <View style={styles.moonKeywordRow}>
                            {currentMoon.keywords.map((kw, i) => (
                                <View key={i} style={styles.keywordPill}>
                                    <Text style={styles.keywordPillText}>{kw}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* ── Loading spinner (while backend fetches) ── */}
                    {isLoadingMeanings && (
                        <View style={styles.loadingContainer}>
                            <Animated.View style={{
                                transform: [{
                                    rotate: rotateAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '360deg']
                                    })
                                }]
                            }}>
                                <Ionicons name="sparkles" size={32} color={colors.lavender} />
                            </Animated.View>
                            <Text style={styles.loadingText}>Připravuji výklad...</Text>
                        </View>
                    )}

                    {/* ── Meaning card — appears after flip, fully scrollable ── */}
                    {section && (() => {
                        const cleanedText = stripMarkdownHeader(section.text);
                        const paragraphs = cleanedText
                            .split('\n')
                            .filter((p: string) => p.trim().length > 0);
                        const cardName =
                            cardData?.card.nameCzech || cardData?.card.name;

                        return (
                            <View style={styles.moonMeaningCard}>
                                <Text style={styles.moonCardName}>
                                    {currentMoon.icon} {cardName}
                                </Text>
                                <View style={styles.moonDivider} />
                                {paragraphs.map((para: string, pIdx: number) => (
                                    <Text
                                        key={pIdx}
                                        style={[
                                            styles.moonMeaningText,
                                            pIdx > 0 && styles.moonMeaningTextSpacing
                                        ]}
                                    >
                                        {parseBoldText(para)}
                                    </Text>
                                ))}
                            </View>
                        );
                    })()}

                    {/* ── Done button ── */}
                    {isFlipped && cardMeanings.length > 0 && !isLoadingMeanings && (
                        <TouchableOpacity style={styles.doneButton} onPress={resetReading}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={colors.lavender} />
                            <Text style={styles.doneButtonText}>Zavřítvýklad</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </Animated.View>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // All other spreads — completely unchanged
    // ─────────────────────────────────────────────────────────────────────────
    const renderReading = () => {
        if (!selectedSpread) return null;

        // 🌙 Moon spread gets its own clean layout
        if (selectedSpread.id === 'moon') {
            return renderMoonReading();
        }

        const subtitle =
            selectedSpread.id === 'love' ? 'Co je mezi vámi?' :
                'Ponořte se do své otázky...';

        return (
            <Animated.View style={[styles.readingContainer, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={resetReading} style={styles.readingBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Header */}
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
                            isMoonSpread={false}
                        />
                    ))}
                </View>

                {/* Meanings Area */}
                <ScrollView
                    style={styles.meaningsScroll}
                    contentContainerStyle={styles.meaningsContent}
                >
                    {isLoadingMeanings && cardMeanings.length === 0 && (
                        <View style={styles.loadingContainer}>
                            <Animated.View style={{
                                transform: [{
                                    rotate: rotateAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '360deg']
                                    })
                                }]
                            }}>
                                <Ionicons name="sparkles" size={32} color={colors.lavender} />
                            </Animated.View>
                            <Text style={styles.loadingText}>Připravuji výklad...</Text>
                        </View>
                    )}

                    {/* Show meanings progressively as cards flip */}
                    {flippedCards.map((flippedIdx) => {
                        const section = cardMeanings[flippedIdx];
                        if (!section) return null;

                        const cleanedText = stripMarkdownHeader(section.text);
                        const paragraphs = cleanedText
                            .split('\n')
                            .filter((p: string) => p.trim().length > 0);

                        return (
                            <View key={flippedIdx} style={styles.meaningCard}>
                                {section.label && (
                                    <Text style={styles.meaningLabel}>{section.label}</Text>
                                )}
                                {paragraphs.map((para: string, pIdx: number) => (
                                    <Text
                                        key={pIdx}
                                        style={[
                                            styles.meaningText,
                                            pIdx > 0 && styles.meaningTextSpacing
                                        ]}
                                    >
                                        {parseBoldText(para)}
                                    </Text>
                                ))}
                            </View>
                        );
                    })}

                    {/* Done button */}
                    {selectedSpread.id === 'love' &&
                        flippedCards.length === selectedSpread.cards &&
                        cardMeanings.length === 3 && (
                            <>
                                <TouchableOpacity style={styles.doneButton} onPress={resetReading}>
                                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.lavender} />
                                    <Text style={styles.doneButtonText}>Děkuji za výklad</Text>
                                </TouchableOpacity>
                                <View style={styles.softEnding} />
                            </>
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

// ─────────────────────────────────────────────────────────────────────────────
// 🌙 MoonCardFlow — card that sits in document flow (not absolute positioned)
//    Used only by renderMoonReading. Has the same flip + pulse + glow animations
//    as the old CardComponent moon mode, but fills its parent View naturally.
// ─────────────────────────────────────────────────────────────────────────────
const MoonCardFlow = ({
    isFlipped,
    onFlip,
    cardData,
    pulseEnabled,
    glowEnabled,
}: {
    isFlipped: boolean;
    onFlip: () => void;
    cardData: any;
    pulseEnabled: boolean;
    glowEnabled: boolean;
}) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: isFlipped ? 180 : 0,
            duration: 700,
            useNativeDriver: true,
        }).start();
    }, [isFlipped]);

    useEffect(() => {
        if (pulseEnabled) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.02,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [pulseEnabled]);

    useEffect(() => {
        if (glowEnabled) {
            const glow = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.7,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            glow.start();
            return () => glow.stop();
        }
    }, [glowEnabled]);

    const frontInterpolate = rotateAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg'],
    });
    const backInterpolate = rotateAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ['180deg', '360deg'],
    });

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onFlip}
            style={styles.moonCardFlowTouchable}
        >
            {/* Back face */}
            <Animated.View style={[
                styles.moonCardFlowFace,
                styles.cardBack,
                {
                    transform: [
                        { rotateY: frontInterpolate },
                        { scale: pulseEnabled ? pulseAnim : 1 },
                    ]
                }
            ]}>
                <LinearGradient
                    colors={['rgba(30, 20, 50, 0.9)', 'rgba(50, 40, 70, 0.9)']}
                    style={styles.moonCardBackGradient}
                >
                    <Animated.View style={{ opacity: glowAnim }}>
                        <Ionicons name="moon-outline" size={80} color="rgba(255, 255, 255, 0.9)" />
                    </Animated.View>
                    <Text style={styles.moonCardPrompt}>Odhal kartu</Text>
                </LinearGradient>
            </Animated.View>

            {/* Front face */}
            <Animated.View style={[
                styles.moonCardFlowFace,
                styles.cardFront,
                { transform: [{ rotateY: backInterpolate }] }
            ]}>
                {cardData && isFlipped && (
                    <CardImage
                        imageName={cardData.card.imageName}
                        width={MOON_CARD_WIDTH - 4}
                        height={MOON_CARD_HEIGHT - 4}
                    />
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// CardComponent — used by all non-moon spreads (absolute positioned, unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const CardComponent = ({ index, position, isFlipped, onFlip, cardData, label, isLocked, isMoonSpread }: any) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
        Animated.timing(rotateAnim, { toValue: isFlipped ? 180 : 0, duration: 700, useNativeDriver: true }).start();
    }, [isFlipped]);

    useEffect(() => {
        if (isMoonSpread && !isFlipped) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.02,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [isMoonSpread, isFlipped]);

    useEffect(() => {
        if (isMoonSpread && !isFlipped) {
            const glow = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.7,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            glow.start();
            return () => glow.stop();
        }
    }, [isMoonSpread, isFlipped]);

    const frontInterpolate = rotateAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const backInterpolate = rotateAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

    const cardWidth = isMoonSpread ? width * 0.5 : width * 0.3;
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
            {label && <Text style={styles.labelAbove}>{label}</Text>}

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onFlip}
                disabled={isLocked}
                style={{ width: cardWidth, height: cardHeight, opacity: isLocked ? 0.5 : 1, marginTop: 30 }}
            >
                <Animated.View style={[
                    styles.cardFace,
                    styles.cardBack,
                    { transform: [{ rotateY: frontInterpolate }, { scale: isMoonSpread ? pulseAnim : 1 }] }
                ]}>
                    {isMoonSpread ? (
                        <LinearGradient
                            colors={['rgba(30, 20, 50, 0.9)', 'rgba(50, 40, 70, 0.9)']}
                            style={styles.moonCardBackGradient}
                        >
                            <Animated.View style={{ opacity: glowAnim }}>
                                <Ionicons name="moon-outline" size={80} color="rgba(255, 255, 255, 0.9)" />
                            </Animated.View>
                            <Text style={styles.moonCardPrompt}>Odhal kartu</Text>
                        </LinearGradient>
                    ) : (
                        <View style={styles.cardBackInner}>
                            <Ionicons name="sparkles" size={28} color="rgba(255,255,255,0.3)" />
                        </View>
                    )}
                </Animated.View>

                <Animated.View style={[styles.cardFace, styles.cardFront, { transform: [{ rotateY: backInterpolate }] }]}>
                    {cardData && isFlipped && (
                        <CardImage imageName={cardData.card.imageName} width={cardWidth - 4} height={cardHeight - 4} />
                    )}
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

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

    // ── Multi-card spread layout (unchanged) ──────────────────────────────────
    readingContainer: { flex: 1, width: '100%' },
    readingBackButton: { position: 'absolute', top: 10, left: 20, zIndex: 50, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
    readingHeader: { alignItems: 'center', marginTop: 70, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
    readingTitle: { fontSize: 28, color: 'rgba(255, 255, 255, 0.85)', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', fontWeight: '600', marginBottom: 6, textAlign: 'center', letterSpacing: 2 },
    readingSubtitle: { fontSize: 15, color: 'rgba(255, 255, 255, 0.5)', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', textAlign: 'center' },
    spreadArea: { height: 360, width: '100%', position: 'relative', marginBottom: spacing.md },
    cardWrapper: { position: 'absolute', alignItems: 'center' },
    labelAbove: { position: 'absolute', top: 0, color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    meaningsScroll: { flex: 1, paddingHorizontal: spacing.md },
    meaningsContent: { flexGrow: 1, paddingBottom: 200 },

    // ── 🌙 Moon reading — single-scroll layout ────────────────────────────────
    moonScrollContent: {
        flexGrow: 1,
        paddingTop: 70,
        paddingBottom: 40,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
    },
    // Phase badge — same pill style as daily card position label
    moonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        marginBottom: spacing.xl,
    },
    moonBadgeIcon: { fontSize: 24 },
    moonBadgeName: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '600',
        letterSpacing: 1,
    },
    moonBadgeTheme: {
        fontSize: 11,
        color: 'rgba(201, 184, 212, 0.75)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontStyle: 'italic',
        marginTop: 2,
    },
    // Card in flow — fills fixed-size touchable, no absolute positioning
    moonCardFlowTouchable: {
        width: MOON_CARD_WIDTH,
        height: MOON_CARD_HEIGHT,
        marginBottom: spacing.xl,
    },
    moonCardFlowFace: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.sm,
        backfaceVisibility: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    // Keywords — pill style identical to CardRevealScreen keywords
    moonKeywordRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.sm,
    },
    keywordPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 4,
    },
    keywordPillText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },

    // ── Shared card faces ─────────────────────────────────────────────────────
    cardFace: { position: 'absolute', width: '100%', height: '100%', borderRadius: borderRadius.sm, backfaceVisibility: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    cardBack: { backgroundColor: '#1a1420', borderColor: '#8B7BA8', borderWidth: 2, padding: 8 },
    cardBackInner: { flex: 1, width: '100%', height: '100%', borderWidth: 1, borderColor: 'rgba(139, 123, 168, 0.4)', borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
    cardFront: { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.2)', transform: [{ rotateY: '180deg' }], overflow: 'hidden' },
    moonCardBackGradient: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    moonCardPrompt: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontStyle: 'italic',
        letterSpacing: 0.5,
    },

    // ── Meaning cards ─────────────────────────────────────────────────────────
    moonMeaningCard: {
        width: '100%',
        backgroundColor: 'rgba(20, 15, 25, 0.7)',
        marginBottom: spacing.md,
        borderRadius: 20,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(150, 130, 200, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    moonCardName: {
        fontSize: 20,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.sm,
        letterSpacing: 1,
    },
    moonDivider: {
        width: 60,
        height: 2,
        backgroundColor: 'rgba(150, 130, 200, 0.4)',
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    moonMeaningText: {
        fontSize: 16,
        lineHeight: 25,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        textAlign: 'left',
        fontWeight: '400',
    },
    moonMeaningTextSpacing: {
        marginTop: 16,
    },
    meaningCard: {
        backgroundColor: 'rgba(20, 15, 25, 0.85)',
        padding: spacing.xl,
        borderRadius: 20,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(139, 123, 168, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    meaningLabel: {
        fontSize: 11,
        color: 'rgba(201, 184, 212, 0.7)',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: spacing.sm,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    meaningText: {
        fontSize: 16,
        lineHeight: 25,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        textAlign: 'left',
        fontWeight: '400',
    },
    meaningTextSpacing: {
        marginTop: 16,
    },

    // ── Shared UI ─────────────────────────────────────────────────────────────
    closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    loadingContainer: { padding: 20, alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12, fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif' },
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        backgroundColor: 'rgba(139, 123, 168, 0.25)',
        borderRadius: 24,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(201, 184, 212, 0.4)',
    },
    doneButtonText: {
        color: 'rgba(255, 255, 255, 0.9)',
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
    },
    softEnding: {
        height: 40,
        opacity: 0,
    },
});
