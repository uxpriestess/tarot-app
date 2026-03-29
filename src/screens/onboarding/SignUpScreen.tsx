import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { spacing } from '../../theme/colors';

interface SignUpScreenProps {
    onSignUpGoogle: () => void;
    onSignUpApple: () => void;
    onSkip: () => void;
}

export function SignUpScreen({ onSignUpGoogle, onSignUpApple, onSkip }: SignUpScreenProps) {
    const questionAnim = useRef(new Animated.Value(0)).current;
    const googleButtonAnim = useRef(new Animated.Value(0)).current;
    const appleButtonAnim = useRef(new Animated.Value(0)).current;
    const skipAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(questionAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(400),
            Animated.timing(googleButtonAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.delay(200),
            Animated.timing(appleButtonAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.timing(skipAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <ImmersiveScreen screenName="onboarding">
            <View style={styles.container}>
                {/* Question */}
                <Animated.Text style={[styles.question, { opacity: questionAnim }]}>
                    Zítra tu bude nová karta.
                </Animated.Text>

                <Animated.Text style={[styles.questionContinuation, { opacity: questionAnim }]}>
                    Mám si tě pamatovat?
                </Animated.Text>

                {/* Google Button */}
                <Animated.View style={{ opacity: googleButtonAnim, width: '100%' }}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={onSignUpGoogle}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={20} color="rgba(255, 255, 255, 0.95)" />
                        <Text style={styles.buttonText}>Pokračovat s Google</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Apple Button */}
                <Animated.View style={{ opacity: appleButtonAnim, width: '100%' }}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={onSignUpApple}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-apple" size={20} color="rgba(255, 255, 255, 0.95)" />
                        <Text style={styles.buttonText}>Pokračovat s Apple</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Skip Option */}
                <Animated.View style={{ opacity: skipAnim }}>
                    <TouchableOpacity
                        onPress={onSkip}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.skipText}>Nebo později</Text>
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
        gap: 24,
    },
    question: {
        fontSize: 28,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        marginBottom: -8,
    },
    questionContinuation: {
        fontSize: 28,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        gap: 12,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    skipText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginTop: 20,
    },
});
