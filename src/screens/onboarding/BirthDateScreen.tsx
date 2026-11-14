import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    ScrollView,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from 'react-native';
import { ImmersiveScreen } from '../../components/ImmersiveScreen';
import { useOnboardingStore } from '../../store/onboardingStore';
import { getZodiacSign } from '../../utils/zodiac';
import { spacing } from '../../theme/colors';

interface BirthDateScreenProps {
    onContinue: () => void;
}

export function BirthDateScreen({ onContinue }: BirthDateScreenProps) {
    const [selectedMonth, setSelectedMonth] = useState(0);
    const [selectedDay, setSelectedDay] = useState(0);
    const [selectedYear, setSelectedYear] = useState(0);
    
    const setBirthDate = useOnboardingStore((state) => state.setBirthDate);
    const setZodiacSign = useOnboardingStore((state) => state.setZodiacSign);

    const monthScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
    const dayScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
    const yearScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

    // Animations
    const questionAnim = useRef(new Animated.Value(0)).current;
    const subtextAnim = useRef(new Animated.Value(0)).current;
    const dateSelectionAnim = useRef(new Animated.Value(0)).current;
    const submitButtonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(questionAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.timing(subtextAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.delay(200),
            Animated.timing(dateSelectionAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.delay(200),
            Animated.timing(submitButtonAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const months = [
        'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
        'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
    
    const daysInMonth = new Date(years[selectedYear], selectedMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const validDayIndex = Math.min(selectedDay, daysInMonth - 1);

    const ITEM_HEIGHT = 50;
    const PICKER_HEIGHT = ITEM_HEIGHT * 5; // Show 5 items at once

    useEffect(() => {
        if (selectedDay <= daysInMonth - 1) return;

        // Keep the selected day and visible picker aligned when the month gets shorter.
        setSelectedDay(daysInMonth - 1);
        dayScrollRef.current?.scrollTo({
            y: (daysInMonth - 1) * ITEM_HEIGHT,
            animated: false,
        });
    }, [daysInMonth, selectedDay]);

    const handleMonthScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        const index = Math.round(y / ITEM_HEIGHT);
        setSelectedMonth(Math.max(0, Math.min(index, months.length - 1)));
    };

    const handleDayScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        const index = Math.round(y / ITEM_HEIGHT);
        setSelectedDay(Math.max(0, Math.min(index, days.length - 1)));
    };

    const handleYearScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        const index = Math.round(y / ITEM_HEIGHT);
        setSelectedYear(Math.max(0, Math.min(index, years.length - 1)));
    };

    const handleContinue = () => {
        const month = selectedMonth + 1;
        const day = validDayIndex + 1;
        const year = years[selectedYear];

        const date = new Date(year, month - 1, day);
        // A birthday is a calendar date, so do not shift it through UTC.
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        setBirthDate(dateString);
        const zodiac = getZodiacSign(date);
        setZodiacSign(zodiac.name);
        onContinue();
    };

    return (
        <ImmersiveScreen screenName="onboarding">
            <View style={styles.container}>
                {/* Question */}
                <Animated.Text style={[styles.question, { opacity: questionAnim }]}>
                    A co datum narození?
                </Animated.Text>

                {/* Subtext */}
                <Animated.Text style={[styles.subtext, { opacity: subtextAnim }]}>
                    Pomůže mi to lépe číst karty.
                </Animated.Text>

                {/* Rolling Date Picker */}
                <Animated.View style={[styles.datePickerWrapper, { opacity: dateSelectionAnim }]}>
                    {/* Month */}
                    <View style={styles.pickerColumn}>
                        <ScrollView
                            ref={monthScrollRef}
                            style={{height: PICKER_HEIGHT}}
                            scrollEventThrottle={16}
                            onScroll={handleMonthScroll}
                            snapToInterval={ITEM_HEIGHT}
                            decelerationRate="fast"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={{ height: ITEM_HEIGHT * 2 }} />
                            {months.map((month, idx) => (
                                <View key={idx} style={{height: ITEM_HEIGHT, justifyContent: 'center'}}>
                                    <Text style={[
                                        styles.pickerItem,
                                        selectedMonth === idx && styles.pickerItemSelected
                                    ]}>
                                        {month}
                                    </Text>
                                </View>
                            ))}
                            <View style={{ height: ITEM_HEIGHT * 2 }} />
                        </ScrollView>
                    </View>

                    {/* Day */}
                    <View style={styles.pickerColumn}>
                        <ScrollView
                            ref={dayScrollRef}
                            style={{height: PICKER_HEIGHT}}
                            scrollEventThrottle={16}
                            onScroll={handleDayScroll}
                            snapToInterval={ITEM_HEIGHT}
                            decelerationRate="fast"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={{ height: ITEM_HEIGHT * 2 }} />
                            {days.map((day) => (
                                <View key={day} style={{height: ITEM_HEIGHT, justifyContent: 'center'}}>
                                    <Text style={[
                                        styles.pickerItem,
                                        validDayIndex === day - 1 && styles.pickerItemSelected
                                    ]}>
                                        {String(day).padStart(2, '0')}
                                    </Text>
                                </View>
                            ))}
                            <View style={{ height: ITEM_HEIGHT * 2 }} />
                        </ScrollView>
                    </View>

                    {/* Year */}
                    <View style={styles.pickerColumn}>
                        <ScrollView
                            ref={yearScrollRef}
                            style={{height: PICKER_HEIGHT}}
                            scrollEventThrottle={16}
                            onScroll={handleYearScroll}
                            snapToInterval={ITEM_HEIGHT}
                            decelerationRate="fast"
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={{ height: ITEM_HEIGHT * 2 }} />
                            {years.map((year) => (
                                <View key={year} style={{height: ITEM_HEIGHT, justifyContent: 'center'}}>
                                    <Text style={[
                                        styles.pickerItem,
                                        selectedYear === years.indexOf(year) && styles.pickerItemSelected
                                    ]}>
                                        {year}
                                    </Text>
                                </View>
                            ))}
                            <View style={{ height: ITEM_HEIGHT * 2 }} />
                        </ScrollView>
                    </View>
                </Animated.View>

                {/* Continue Button */}
                <Animated.View style={{ opacity: submitButtonAnim }}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleContinue}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Podíváme se dál</Text>
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
    },
    subtext: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginTop: -8,
    },
    datePickerWrapper: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
    },
    pickerColumn: {
        flex: 1,
        height: 250,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
    },
    pickerItem: {
        fontSize: 20,
        color: 'rgba(255, 255, 255, 0.4)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    pickerItemSelected: {
        fontSize: 24,
        color: 'rgba(255, 255, 255, 0.95)',
        fontWeight: '600',
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 12,
    },
    buttonText: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.95)',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
});
