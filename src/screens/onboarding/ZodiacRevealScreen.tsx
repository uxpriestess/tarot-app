import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Platform,
} from 'react-native';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { useOnboardingStore } from '../../store/onboardingStore';
import { spacing } from '../../theme/colors';

interface ZodiacRevealScreenProps {
    onContinue: () => void;
}

export function ZodiacRevealScreen({ onContinue }: ZodiacRevealScreenProps) {
    const zodiacSign = useOnboardingStore((state) => state.data.zodiacSign);
    const signNameAnim = useRef(new Animated.Value(0)).current;
    const revelationAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(signNameAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.timing(revelationAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(2000), // Hold for 2 seconds
        ]).start(() => {
            onContinue();
        });
    }, []);

    return (
        <ImmersiveScreen screenName="onboarding">
            <View style={styles.container}>
                <Animated.Text style={[styles.signName, { opacity: signNameAnim }]}>
                    {zodiacSign}.
                </Animated.Text>
                
                <Animated.Text style={[styles.revelation, { opacity: revelationAnim }]}>
                    {getRevelationLine(zodiacSign)}
                </Animated.Text>
            </View>
        </ImmersiveScreen>
    );
}

function getRevelationLine(zodiacSign: string): string {
    const revelations: { [key: string]: string } = {
        'Beran': 'Jdeš rovnou k věci — to se nám bude hodit.',
        'Býk': 'Víš, co chceš. Teď zjistíme, co ti stojí v cestě.',
        'Blíženci': 'Máš víc vrstev, než ukazuješ.',
        'Rak': 'Cítíš věci dřív, než je dokážeš pojmenovat.',
        'Lev': 'Přítomnost, kterou nejde přehlédnout.',
        'Panna': 'Všímáš si detailů, které ostatní přehlédnou.',
        'Váhy': 'Hledáš rovnováhu — i když to někdy bolí.',
        'Štír': 'Tohle půjde víc do hloubky.',
        'Střelec': 'Pravda nade vše — i když není pohodlná.',
        'Kozoroh': 'Stavíš pomalu, ale pevně.',
        'Vodnář': 'Vidíš věci jinak. Karty to ocení.',
        'Ryby': 'Intuice je tvůj první jazyk — tady ji použijeme.',
    };
    return revelations[zodiacSign] || '';
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        gap: 20,
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
});
