import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
} from 'react-native';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { useOnboardingStore } from '../../store/onboardingStore';
import { spacing } from '../../theme/colors';

interface FirstCardScreenProps {
    onDrawCard: () => void;
}

export function FirstCardScreen({ onDrawCard }: FirstCardScreenProps) {
    const displayName = useOnboardingStore((state) => state.data.displayName);
    const [isShuffling, setIsShuffling] = useState(false);
    
    // Animations
    const firstLineAnim = useRef(new Animated.Value(0)).current;
    const secondLineAnim = useRef(new Animated.Value(0)).current;
    const deckAnim = useRef(new Animated.Value(0)).current;
    const hintAnim = useRef(new Animated.Value(0)).current;
    const shuffleRotation = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(firstLineAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.timing(secondLineAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.delay(200),
            Animated.timing(deckAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(200),
            Animated.timing(hintAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // Start looping glow pulse after deck is visible
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowPulse, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowPulse, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }, 1800); // Start after all initial animations
    }, []);

    const handleDeckPress = () => {
        setIsShuffling(true);
        
        // Shuffle animation: rotate 360° twice
        Animated.sequence([
            Animated.timing(shuffleRotation, {
                toValue: 720,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsShuffling(false);
            onDrawCard();
        });
    };

    const rotationInterpolate = shuffleRotation.interpolate({
        inputRange: [0, 720],
        outputRange: ['0deg', '720deg'],
    });

    return (
        <ImmersiveScreen screenName="onboarding">
            <View style={styles.container}>
                {/* First Line */}
                <Animated.Text style={[styles.firstLine, { opacity: firstLineAnim }]}>
                    Tak jo, {displayName}.
                </Animated.Text>

                {/* Second Line */}
                <Animated.Text style={[styles.secondLine, { opacity: secondLineAnim }]}>
                    Tvoje denní karta čeká.
                </Animated.Text>

                {/* Tappable Deck */}
                <Animated.View
                    style={[
                        styles.deckWrapper,
                        { 
                            opacity: deckAnim,
                            transform: [{ rotate: rotationInterpolate }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.deckButton}
                        onPress={handleDeckPress}
                        disabled={isShuffling}
                        activeOpacity={0.7}
                    >
                        {/* Glow Background */}
                        <Animated.View
                            style={[
                                styles.glowBackground,
                                {
                                    opacity: glowPulse.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.3, 0.7],
                                    }),
                                },
                            ]}
                        />
                        
                        {/* Card */}
                        <View style={styles.deckCard}>
                            <Text style={styles.deckText}>🔮</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* Hint text */}
                <Animated.Text style={[styles.hint, { opacity: hintAnim }]}>
                    Klepni na karty
                </Animated.Text>
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
        gap: 32,
    },
    firstLine: {
        fontSize: 28,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    secondLine: {
        fontSize: 24,
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginTop: -16,
    },
    deckWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    deckButton: {
        width: 200,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowBackground: {
        position: 'absolute',
        width: 230,
        height: 310,
        borderRadius: 28,
        backgroundColor: 'rgba(201, 184, 212, 0.3)',
    },
    deckCard: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(255, 255, 255, 0.3)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 12,
    },
    deckText: {
        fontSize: 100,
    },
    hint: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.4)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
