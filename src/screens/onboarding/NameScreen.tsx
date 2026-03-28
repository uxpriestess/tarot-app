import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { useOnboardingStore } from '../../store/onboardingStore';
import { spacing } from '../../theme/colors';

interface NameScreenProps {
    onContinue: () => void;
}

export function NameScreen({ onContinue }: NameScreenProps) {
    const [name, setName] = useState('');
    const setDisplayName = useOnboardingStore((state) => state.setDisplayName);

    // Animations
    const questionAnim = useRef(new Animated.Value(0)).current;
    const inputAnim = useRef(new Animated.Value(0)).current;
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            // Question fades in first
            Animated.timing(questionAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(300),
            // Then input appears
            Animated.timing(inputAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.delay(200),
            // Then button
            Animated.timing(buttonAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleContinue = () => {
        const trimmed = name.trim();
        if (!trimmed) return; // Don't allow empty name
        setDisplayName(trimmed);
        onContinue();
    };

    const isReady = name.trim().length > 0;

    return (
        <ImmersiveScreen screenName="onboarding">
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.container}>

                    {/* Question */}
                    <Animated.Text style={[styles.question, { opacity: questionAnim }]}>
                        Jak ti mám říkat?
                    </Animated.Text>

                    {/* Subtext */}
                    <Animated.Text style={[styles.subtext, { opacity: questionAnim }]}>
                        Nebo jak ti mají říkat karty.
                    </Animated.Text>

                    {/* Input */}
                    <Animated.View style={[styles.inputWrapper, { opacity: inputAnim }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Tvoje jméno… nebo přezdívka"
                            placeholderTextColor="rgba(255, 255, 255, 0.35)"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleContinue}
                            selectionColor="rgba(201, 184, 212, 0.8)"
                        />
                    </Animated.View>

                    {/* Button — only fully visible when name is entered */}
                    <Animated.View style={{ opacity: buttonAnim }}>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                !isReady && styles.buttonDisabled
                            ]}
                            onPress={handleContinue}
                            activeOpacity={0.8}
                            disabled={!isReady}
                        >
                            <Text style={[
                                styles.buttonText,
                                !isReady && styles.buttonTextDisabled
                            ]}>
                                Jdeme dál
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                </View>
            </KeyboardAvoidingView>
        </ImmersiveScreen>
    );
}

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
    },
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
    },
    subtext: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginTop: -8,
    },
    inputWrapper: {
        width: '100%',
        marginTop: 8,
    },
    input: {
        width: '100%',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 8,
    },
    buttonDisabled: {
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    buttonText: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    buttonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.3)',
    },
});