import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Platform,
    Pressable,
    BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAppStore } from '../../store/appStore';
import { spacing } from '../../theme/colors';
import { GenderPreference } from '../../types/user';

interface ZodiacRevealScreenProps {
    onContinue: () => void;
}

// Tarot court cards as gender selectors — honest, elegant, no explanation needed.
const GENDER_OPTIONS: { value: GenderPreference; label: string }[] = [
    { value: 'masculine', label: 'Král' },
    { value: 'feminine',  label: 'Královna' },
    { value: 'neutral',   label: 'Páže' },
];

const ZODIAC_MESSAGES: Record<string, string[]> = {
    'Beran':    ['Jdeš rovnou k věci — to se nám bude hodit.', 'Nejdřív akce, pak přemýšlení. Karty to ocení.', 'Energii máš. Teď ji nasměrujeme.'],
    'Býk':      ['Víš, co chceš. Teď zjistíme, co ti stojí v cestě.', 'Trpělivost je tvůj nástroj. I tady.', 'Pevná půda pod nohama — dobrý základ.'],
    'Blíženci': ['Máš víc vrstev, než ukazuješ.', 'Dva hlasy v hlavě? Karty promluví k oběma.', 'Rychlá mysl, hluboké otázky.'],
    'Rak':      ['Cítíš věci dřív, než je dokážeš pojmenovat.', 'Intuice mluví — tady ji konečně uslyšíš.', 'Hloubka, kterou ne každý vidí.'],
    'Lev':      ['Přítomnost, kterou nejde přehlédnout.', 'Světlo přitahuješ přirozeně.', 'Sebevědomí a srdce — silná kombinace.'],
    'Panna':    ['Všímáš si detailů, které ostatní přehlédnou.', 'Analytická mysl s citem pro nuance.', 'Preciznost je tvůj dar — karty to vědí.'],
    'Váhy':     ['Hledáš rovnováhu — i když to někdy bolí.', 'Harmonie není kompromis. Karty ti to připomenou.', 'Cit pro spravedlnost, i vůči sobě.'],
    'Štír':     ['Tohle půjde víc do hloubky.', 'Transformace tě nebojí. Dobrá zpráva.', 'Pravda, i ta nepohodlná — to je tvůj terén.'],
    'Střelec':  ['Pravda nade vše — i když není pohodlná.', 'Svoboda jako hodnota, ne únik.', 'Šíp vždy letí dál, než čekáš.'],
    'Kozoroh':  ['Stavíš pomalu, ale pevně.', 'Disciplína, která ví proč.', 'Výsledky přicházejí — karty ukáží cestu.'],
    'Vodnář':   ['Vidíš věci jinak. Karty to ocení.', 'Originalita není náhoda — je to tvůj způsob myšlení.', 'Budoucnost tě zajímá víc než minulost.'],
    'Ryby':     ['Intuice je tvůj první jazyk — tady ji použijeme.', 'Sny mají smysl. Pojďme je přečíst.', 'Empatie jako superschopnost.'],
};

function pickMessage(zodiacSign: string): string {
    const options = ZODIAC_MESSAGES[zodiacSign];
    if (!options?.length) return '';
    return options[Math.floor(Math.random() * options.length)];
}

export function ZodiacRevealScreen({ onContinue }: ZodiacRevealScreenProps) {
    const zodiacSign  = useOnboardingStore((s) => s.data.zodiacSign);
    const displayName = useOnboardingStore((s) => s.data.displayName);
    const { setUserProfile, setUserGender } = useAppStore();

    const [revelationLine] = useState(() => pickMessage(zodiacSign));
    const [selectedGender, setSelectedGender] = useState<GenderPreference | null>(null);
    const [showGenderUI, setShowGenderUI]     = useState(false);

    const signNameAnim  = useRef(new Animated.Value(0)).current;
    const revelationAnim = useRef(new Animated.Value(0)).current;
    const genderAnim    = useRef(new Animated.Value(0)).current;

    // Disable back navigation — once the zodiac is revealed, going back breaks the narrative.
    useFocusEffect(
        React.useCallback(() => {
            const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
            return () => sub.remove();
        }, [])
    );

    useEffect(() => {
        Animated.sequence([
            Animated.timing(signNameAnim,   { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.delay(300),
            Animated.timing(revelationAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.delay(800),
        ]).start(() => {
            setShowGenderUI(true);
            Animated.timing(genderAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        });
    }, []);

    const handleSelect = (value: GenderPreference) => {
        // Selection is final — no deselect. User must pick one to continue.
        setSelectedGender(value);
    };

    const handleContinue = () => {
        if (!selectedGender) return; // button is visually disabled anyway
        setUserProfile(displayName, zodiacSign);
        setUserGender(selectedGender);
        onContinue();
    };

    return (
        <ImmersiveScreen screenName="onboarding">
            <View style={styles.container}>

                <Animated.Text style={[styles.signName, { opacity: signNameAnim }]}>
                    {zodiacSign}.
                </Animated.Text>

                <Animated.Text style={[styles.revelation, { opacity: revelationAnim }]}>
                    {revelationLine}
                </Animated.Text>

                <Animated.View style={[styles.genderBlock, { opacity: genderAnim }]}>
                    {showGenderUI && (
                        <>
                            <Text style={styles.question}>Tvé pohlaví?</Text>

                            <View style={styles.cardsRow}>
                                {GENDER_OPTIONS.map(({ value, label }) => {
                                    const active = selectedGender === value;
                                    return (
                                        <Pressable
                                            key={value}
                                            onPress={() => handleSelect(value)}
                                            style={({ pressed }) => [
                                                styles.card,
                                                active   && styles.cardActive,
                                                pressed  && styles.cardPressed,
                                            ]}
                                        >
                                            <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>
                                                {label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Continue fades in only after a selection is made —
                                the button appearing IS the confirmation feedback. */}
                            <Animated.View style={{ opacity: selectedGender ? 1 : 0 }}>
                                <Pressable
                                    onPress={handleContinue}
                                    disabled={!selectedGender}
                                    style={styles.continueBtn}
                                >
                                    <Text style={styles.continueBtnText}>Pokračovat</Text>
                                </Pressable>
                            </Animated.View>
                        </>
                    )}
                </Animated.View>

            </View>
        </ImmersiveScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        gap: 24,
    },
    signName: {
        fontSize: 48,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    revelation: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
        lineHeight: 28,
        maxWidth: '85%',
    },
    genderBlock: {
        alignItems: 'center',
        gap: 20,
        marginTop: 8,
    },
    question: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 1,
    },
    cardsRow: {
        flexDirection: 'row',
        gap: 12,
    },

    // Tall narrow card — echoes actual tarot card proportions without being literal.
    card: {
        width: 80,
        height: 112,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 14,
    },
    cardActive: {
        borderColor: 'rgba(255, 255, 255, 0.85)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.45)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
    },
    cardLabelActive: {
        color: 'rgba(255, 255, 255, 0.95)',
    },

    continueBtn: {
        paddingHorizontal: 36,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    continueBtnText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.85)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 1,
    },
});
