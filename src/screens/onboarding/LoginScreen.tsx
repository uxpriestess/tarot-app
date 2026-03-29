import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { spacing } from '../../theme/colors';

interface LoginScreenProps {
    onLogin: (email: string, password: string) => void;
    onBackToSignUp: () => void;
    onSkip: () => void;
}

export function LoginScreen({ onLogin, onBackToSignUp, onSkip }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const questionAnim = useRef(new Animated.Value(0)).current;
    const formAnim = useRef(new Animated.Value(0)).current;
    const skipAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(questionAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(400),
            Animated.timing(formAnim, {
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

    const handleLogin = async () => {
        // Validation
        if (!email.trim()) {
            Alert.alert('Chyba', 'Zadej svůj e-mail.');
            return;
        }
        
        if (!password.trim()) {
            Alert.alert('Chyba', 'Zadej heslo.');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Chyba', 'Zadej platný e-mail.');
            return;
        }

        setIsLoading(true);
        try {
            await onLogin(email, password);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ImmersiveScreen screenName="onboarding">
            <View style={styles.container}>
                {/* Question */}
                <Animated.Text style={[styles.question, { opacity: questionAnim }]}>
                    Vítej zpátky!
                </Animated.Text>

                <Animated.Text style={[styles.questionContinuation, { opacity: questionAnim }]}>
                    Přihlásíš se?
                </Animated.Text>

                {/* Email & Password Form */}
                <Animated.View style={[{ opacity: formAnim, width: '100%' }, styles.formContainer]}>
                    {/* Email Input */}
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail" size={18} color="rgba(255, 255, 255, 0.6)" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="tvůj@email.com"
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            value={email}
                            onChangeText={setEmail}
                            editable={!isLoading}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed" size={18} color="rgba(255, 255, 255, 0.6)" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Heslo"
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            value={password}
                            onChangeText={setPassword}
                            editable={!isLoading}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                            style={styles.eyeIcon}
                        >
                            <Ionicons
                                name={showPassword ? "eye" : "eye-off"}
                                size={18}
                                color="rgba(255, 255, 255, 0.6)"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Log In Button */}
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        activeOpacity={0.8}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.95)" />
                        ) : (
                            <>
                                <Ionicons name="log-in" size={20} color="rgba(255, 255, 255, 0.95)" />
                                <Text style={styles.buttonText}>Přihlásit se</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Back to Sign Up & Skip Options */}
                <Animated.View style={[{ opacity: skipAnim }, styles.linkContainer]}>
                    <TouchableOpacity
                        onPress={onBackToSignUp}
                        activeOpacity={0.7}
                        disabled={isLoading}
                    >
                        <Text style={[styles.skipText, isLoading && { opacity: 0.5 }]}>Chci se zaregistrovat</Text>
                    </TouchableOpacity>
                    <Text style={styles.divider}>·</Text>
                    <TouchableOpacity
                        onPress={onSkip}
                        activeOpacity={0.7}
                        disabled={isLoading}
                    >
                        <Text style={[styles.skipText, isLoading && { opacity: 0.5 }]}>Později</Text>
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
    formContainer: {
        gap: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        gap: 12,
    },
    inputIcon: {
        marginRight: 4,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    eyeIcon: {
        padding: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        gap: 12,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
    },
    linkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'center',
    },
    skipText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        textDecorationLine: 'underline',
    },
    divider: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.4)',
    },
});
