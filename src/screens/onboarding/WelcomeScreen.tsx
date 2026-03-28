import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
} from 'react-native';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { spacing } from '../../theme/colors';

interface WelcomeScreenProps {
    onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
    // Three separate anims so each line fades in one after another
    const line1Anim = useRef(new Animated.Value(0)).current;
    const line2Anim = useRef(new Animated.Value(0)).current;
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            // Line 1 — "Vítej."
            Animated.timing(line1Anim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(400),
            // Line 2 — "Něco tě sem přivedlo."
            Animated.timing(line2Anim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(600),
            // Button — "Pojď zjistit, co"
            Animated.timing(buttonAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <ImmersiveScreen screenName="onboarding">
            <View style={styles.container}>
                {/* Copy */}
                <View style={styles.copyContainer}>
                    <Animated.Text style={[styles.line, { opacity: line1Anim }]}>
                        Vítej.
                    </Animated.Text>
                    <Animated.Text style={[styles.line, { opacity: line2Anim }]}>
                        Něco tě sem přivedlo.
                    </Animated.Text>
                </View>

                {/* CTA */}
                <Animated.View style={{ opacity: buttonAnim }}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={onContinue}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Pojď zjistit, co</Text>
                    </TouchableOpacity>
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
        gap: 60,
    },
    copyContainer: {
        alignItems: 'center',
        gap: 16,
    },
    line: {
        fontSize: 32,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 1,
        lineHeight: 44,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    buttonText: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
});