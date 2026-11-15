import React, { useContext, useEffect, useReducer, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { CardImage } from './CardImage';
import { useFinanceReading } from '../hooks/useFinanceReading';
import { canOpenFinanceCard, financeFocusReducer, initialFinanceFocus } from './financeFocusState';

type Props = { reading: ReturnType<typeof useFinanceReading>; onReset: () => void };
const labels = ['Dnes', 'Výzva', 'Výsledek'];
const descriptions = ['Aktuální situace', 'Co vyžaduje pozornost', 'Možný směr vývoje'];

export function FinanceSpread({ reading, onReset }: Props) {
    const [progress, dispatch] = useReducer(financeFocusReducer, undefined, initialFinanceFocus);
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    // This screen also opens outside the tabs, where no height context exists.
    const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
    const bottomClearance = Math.max(insets.bottom, tabBarHeight) + 16;
    const turn = useRef(new Animated.Value(0)).current;
    const turning = useRef(false);
    const animation = useRef<Animated.CompositeAnimation | null>(null);
    const cards = reading.snapshot?.cards ?? [];
    const focusedIndex = cards.findIndex(card => card.key === progress.focused);
    const focused = cards[focusedIndex];
    const face = focused ? progress.faces[focused.key] : 'back';
    const FocusBody = face === 'interpretation' ? View : ScrollView;
    const stopTurn = () => { animation.current?.stop(); animation.current = null; turning.current = false; turn.setValue(0); };
    useEffect(() => () => { animation.current?.stop(); }, []);
    const close = () => {
        stopTurn();
        dispatch({ type: 'close', ready: reading.status === 'ready' && !!(focused && reading.meanings?.[focused.key]) });
    };
    const flip = () => {
        if (!focused || turning.current || face === 'interpretation') return;
        turning.current = true;
        const key = focused.key;
        animation.current = Animated.timing(turn, { toValue: 90, duration: 250, useNativeDriver: true });
        animation.current.start(({ finished }) => {
            if (!finished) return;
            dispatch({ type: 'advance', key });
            turn.setValue(-90);
            animation.current = Animated.timing(turn, { toValue: 0, duration: 250, useNativeDriver: true });
            animation.current.start(() => { turning.current = false; });
        });
    };
    const smallWidth = Math.min(132, (width - 96) / 2);
    const focusWidth = Math.min(310, width - 48, Math.max(120, (height - insets.top - insets.bottom - 300) / 1.5));
    const cardArt = (index: number, cardWidth: number) => {
        const draw = cards[index];
        return <View style={{ transform: [{ rotate: draw.position === 'reversed' ? '180deg' : '0deg' }] }}>
            <CardImage imageName={draw.card.imageName} width={cardWidth} height={cardWidth * 1.5} />
        </View>;
    };
    const back = <View style={styles.back}><Ionicons name="sparkles" size={48} color="#c9b1e8" /></View>;
    return <View style={[styles.root, { paddingBottom: bottomClearance }]}>
        <ScrollView contentContainerStyle={styles.spreadContent} scrollIndicatorInsets={{ bottom: 16 }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ukončit výklad Zázemí" onPress={onReset} style={styles.exit}>
                <Ionicons name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Zázemí</Text>
            <Text style={styles.description}>O penězích, zdrojích, stabilitě a tom, na čem stavíš.</Text>
            <Text style={styles.hint}>{progress.completed.length === 3 ? 'Ke kartám se můžeš kdykoli vrátit.' : `Pokračuj kartou ${labels[progress.completed.length]}.`}</Text>
            <View style={styles.triangle}>
                {cards.map((draw, index) => {
                    const available = canOpenFinanceCard(progress, draw.key);
                    return <View key={draw.key} style={[styles.position, { width: index === 2 ? '100%' : '50%' }]}>
                        <Text style={styles.label}>{labels[index]}</Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${labels[index]}, ${descriptions[index]}${progress.completed.includes(draw.key) ? ', přečíst výklad znovu' : ', otevřít kartu'}`} accessibilityState={{ disabled: !available }} disabled={!available} onPress={() => dispatch({ type: 'open', key: draw.key })} style={[styles.card, { width: smallWidth, height: smallWidth * 1.5, opacity: available ? 1 : 0.5 }]}>
                            {progress.faces[draw.key] === 'back' ? back : cardArt(index, smallWidth)}
                        </TouchableOpacity>
                        <Text style={styles.caption}>{descriptions[index]}</Text>
                    </View>;
                })}
            </View>
        </ScrollView>
        <Modal visible={!!focused} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
            <View accessibilityViewIsModal style={[styles.dim, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
                <TouchableOpacity accessibilityRole="button" onPress={close} style={styles.returnButton}>
                    <Ionicons name="chevron-back" size={22} color="#fff" /><Text style={styles.buttonText}>Zpět ke kartám</Text>
                </TouchableOpacity>
                {focused && <FocusBody
                    style={styles.focusBody}
                    {...(face === 'interpretation' ? {} : { contentContainerStyle: styles.focusContent })}
                >
                    <Text accessibilityRole="header" style={styles.title}>{labels[focusedIndex]}</Text>
                    <Text style={styles.description}>{descriptions[focusedIndex]}</Text>
                    <Animated.View style={[styles.focusCard, { width: face === 'interpretation' ? Math.min(400, width - 32) : focusWidth, height: face === 'interpretation' ? undefined : focusWidth * 1.5, flex: face === 'interpretation' ? 1 : undefined, transform: [{ perspective: 1000 }, { rotateY: turn.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }] }]}>
                        {face === 'interpretation' ? <ScrollView contentContainerStyle={styles.interpretation}>
                            <Text style={styles.cardName}>{focused.card.nameCzech || focused.card.name}</Text>
                            <Text style={styles.caption}>{focused.position === 'reversed' ? 'Obrácená poloha' : 'Přímá poloha'}</Text>
                            {reading.status === 'ready' && reading.meanings ? <Text selectable style={styles.meaning}>{reading.meanings[focused.key]}</Text> : reading.status === 'error' ? <View accessibilityLiveRegion="polite">
                                <Text style={styles.meaning}>{reading.error?.code === 'timeout' ? 'Výklad trvá příliš dlouho.' : 'Výklad se nepodařilo načíst.'} Tvoje karty zůstávají stejné.</Text>
                                <TouchableOpacity accessibilityRole="button" onPress={() => { void reading.retry(); }} style={styles.action}><Text style={styles.buttonText}>Zkusit znovu</Text></TouchableOpacity>
                            </View> : <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator color="#dbc7f4" /><Text style={styles.meaning}>Tarotka připravuje tvůj výklad…</Text></View>}
                        </ScrollView> : <TouchableOpacity accessibilityRole="button" accessibilityLabel={face === 'back' ? 'Odhalit ilustraci karty' : 'Přečíst výklad karty'} onPress={flip} style={styles.fill}>
                            {face === 'back' ? back : cardArt(focusedIndex, focusWidth)}
                        </TouchableOpacity>}
                    </Animated.View>
                    {face !== 'back' && face !== 'interpretation' && <><Text style={styles.cardName}>{focused.card.nameCzech || focused.card.name}</Text><Text style={styles.caption}>{focused.position === 'reversed' ? 'Obrácená poloha' : 'Přímá poloha'}</Text></>}
                    {face !== 'interpretation' && <TouchableOpacity accessibilityRole="button" onPress={flip} style={styles.action}><Text style={styles.buttonText}>{face === 'back' ? 'Odhalit kartu' : 'Přečíst výklad'}</Text></TouchableOpacity>}
                </FocusBody>}
            </View>
        </Modal>
    </View>;
}

const styles = StyleSheet.create({
    root: { flex: 1 }, spreadContent: { padding: 16, paddingBottom: 24 },
    focusBody: { flex: 1, width: '100%' },
    focusContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 16 },
    title: { color: '#fff', fontSize: 30, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', marginVertical: 8 },
    description: { color: '#e0d5eb', fontSize: 16, textAlign: 'center', lineHeight: 23, marginBottom: 12 },
    hint: { color: '#cfb8e8', textAlign: 'center', fontSize: 14, marginBottom: 16 },
    exit: { minHeight: 44, minWidth: 44, alignSelf: 'flex-start', justifyContent: 'center' },
    triangle: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 28 },
    position: { alignItems: 'center', paddingHorizontal: 8 },
    label: { color: '#fff', fontSize: 21, fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', marginBottom: 10 },
    caption: { color: '#d8cae5', fontSize: 14, lineHeight: 20, textAlign: 'center', marginVertical: 8 },
    card: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#a28abb' },
    back: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#251b37', borderWidth: 5, borderColor: '#574269', borderRadius: 10 },
    dim: { flex: 1, backgroundColor: '#100b1b', alignItems: 'center', paddingHorizontal: 16 },
    returnButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 8 },
    buttonText: { color: '#fff', fontSize: 17, textAlign: 'center' },
    focusCard: { alignSelf: 'center', flexShrink: 0, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#a28abb', backgroundColor: '#251b37', marginVertical: 16, minHeight: 100 },
    fill: { flex: 1 }, cardName: { color: '#fff', textAlign: 'center', fontSize: 21, marginTop: 8 },
    interpretation: { padding: 22 }, meaning: { color: '#f4eef9', fontSize: 18, lineHeight: 29, marginVertical: 18 },
    action: { minHeight: 48, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: '#604477', borderRadius: 24, marginVertical: 12 },
    loading: { paddingVertical: 24, alignItems: 'center' },
});
