import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Animated,
    Dimensions,
    PanResponder,
    Platform,
} from 'react-native';
import { useRef } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ActionBottomSheetProps {
    isVisible: boolean;
    onClose: () => void;
    onSubmit: (question: string) => void;
    title: string;
    subtitle: string;
}

export function ActionBottomSheet({
    isVisible,
    onClose,
    onSubmit,
    title,
    subtitle,
}: ActionBottomSheetProps) {
    const [question, setQuestion] = useState('');
    const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    // Manual ref for animated value because we are using useRef
    // Wait, I should use useRef for Animated.Value in components

    const resetPositionAnim = Animated.timing(panY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
    });

    const closeAnim = Animated.timing(panY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
    });

    useEffect(() => {
        if (isVisible) {
            resetPositionAnim.start();
        } else {
            closeAnim.start();
        }
    }, [isVisible]);

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                panY.setValue(gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                onClose();
            } else {
                resetPositionAnim.start();
            }
        },
    })).current;

    const handleQuickQuestion = (q: string) => {
        setQuestion(q);
    };

    const handleDraw = () => {
        if (question.length >= 3) {
            onSubmit(question);
            setQuestion('');
        }
    };

    return (
        <Modal
            visible={isVisible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.sheet,
                        { transform: [{ translateY: panY }] }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View style={styles.handle} />

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Co vás trápí? Co vás zajímá?"
                            placeholderTextColor="rgba(201, 184, 212, 0.5)"
                            multiline
                            maxLength={200}
                            value={question}
                            onChangeText={setQuestion}
                        />
                        <Text style={styles.charCount}>{question.length}/200</Text>
                    </View>

                    <View style={styles.quickQuestions}>
                        <Text style={styles.label}>Nebo si vyberte rychlou otázku:</Text>
                        <View style={styles.chips}>
                            {['Co mě dnes čeká?', 'Jak mám postupovat?', 'Na co se zaměřit?'].map((q) => (
                                <TouchableOpacity
                                    key={q}
                                    style={styles.chip}
                                    onPress={() => handleQuickQuestion(q)}
                                >
                                    <Text style={styles.chipText}>{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Zrušit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, question.length < 3 && styles.submitBtnDisabled]}
                            onPress={handleDraw}
                            disabled={question.length < 3}
                        >
                            <Text style={styles.submitText}>✨ Vyložit kartu</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: '#1a1228',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        minHeight: 500,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 122, 0.2)',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 25,
    },
    title: {
        fontSize: 26,
        color: '#d4af7a',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#c9b8d4',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 28,
    },
    inputWrapper: {
        position: 'relative',
        marginBottom: 25,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1.5,
        borderColor: 'rgba(212, 175, 122, 0.3)',
        borderRadius: 16,
        padding: 18,
        color: '#f5f0f6',
        fontSize: 16,
        minHeight: 130,
        textAlignVertical: 'top',
    },
    charCount: {
        position: 'absolute',
        bottom: -20,
        right: 5,
        fontSize: 12,
        color: '#c9b8d4',
    },
    quickQuestions: {
        marginBottom: 30,
    },
    label: {
        fontSize: 13,
        color: '#c9b8d4',
        marginBottom: 12,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(212, 175, 122, 0.12)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 122, 0.3)',
    },
    chipText: {
        color: '#f5f0f6',
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    cancelText: {
        color: '#f5f0f6',
        fontSize: 17,
    },
    submitBtn: {
        flex: 2,
        padding: 16,
        borderRadius: 25,
        backgroundColor: 'rgba(212, 175, 122, 0.3)',
        borderWidth: 1,
        borderColor: '#d4af7a',
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.4,
    },
    submitText: {
        color: '#f5f0f6',
        fontSize: 17,
        fontWeight: '500',
    },
});
