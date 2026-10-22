// screens/YesNoScreen.tsx
//
// Needs one package (Expo): npx expo install expo-haptics
//
// Props:
//   onClose    - close the screen (same as CardRevealScreen)
//   onExplain  - optional. Called when the user taps "Proč?". Wire it to your
//                existing API helper, sending buildExplainBody(reading) from
//                data/yesNo.ts to the backend (mode 'yes_no') and return the
//                `answer` text. If you leave it out, the "Proč?" button is hidden.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../theme/colors';
import { CardImage } from '../components/CardImage';
import {
  YesNoReading,
  VerdictCopy,
  drawYesNoReading,
  describeCard,
  pickVerdictCopy,
  pickCloseCallLine,
  getSessionWink,
  normalizeQuestion,
  isCrisisQuestion,
  CRISIS_MESSAGE,
  PLACEHOLDERS,
  HEADER_TITLE,
  HEADER_SUBTITLE,
  INPUT_HINT,
  CTA_LABEL,
  NEW_QUESTION_LABEL,
  FOOTER_DEFAULT,
  REPEAT_LINE,
} from '../data/yesNo';

interface YesNoScreenProps {
  onClose: () => void;
  onExplain?: (reading: YesNoReading) => Promise<string>;
}

type Phase = 'ask' | 'reveal' | 'crisis';

interface Result {
  reading: YesNoReading;
  copy: VerdictCopy;
  closeLine: string | null;
  repeated: boolean;
}

type WhyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; text: string };

const { width } = Dimensions.get('window');
const CARD_W = Math.round(width * 0.56);
const CARD_H = Math.round(CARD_W * (1384 / 1040)); // card images are 1040x1384
const HOLD_MS = 1500;
const MARKER_SIZE = 28;

// Same question twice -> same answer (with a wink) instead of a re-roll.
// Set to false to always draw a new card.
const LOCK_SAME_QUESTION = true;

// Session memory only (resets when the app restarts). The question never
// leaves the phone and is never stored.
let sessionAsks = 0;
let lastAnswered: { q: string; result: Result } | null = null;

// Where the marker lands on the NE <-> ANO track (0 = Ne, 1 = Ano)
const MARKER_TARGET = { no: 0, 'leaning-no': 0.3, 'leaning-yes': 0.7, yes: 1 } as const;

export function YesNoScreen({ onClose, onExplain }: YesNoScreenProps) {
  const [phase, setPhase] = useState<Phase>('ask');
  const [question, setQuestion] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [why, setWhy] = useState<WhyState>({ status: 'idle' });
  const [trackW, setTrackW] = useState(0);

  // progress uses the JS driver (it drives width/opacity), the rest is native.
  // They live on different Animated.Views so the drivers never mix.
  const progress = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const marker = useRef(new Animated.Value(0.5)).current;

  const holding = useRef(false);
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionRef = useRef('');
  questionRef.current = question;

  // Rotate the example placeholders while the field is empty
  useEffect(() => {
    if (phase !== 'ask' || question.length > 0) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, [phase, question]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
      holdAnim.current?.stop();
    };
  }, []);

  const clearTick = () => {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
  };

  // ---------------------------------------------------------------- hold
  const startHold = () => {
    if (phase !== 'ask' || holding.current) return;
    holding.current = true;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    tick.current = setInterval(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      250
    );
    holdAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) completeHold();
    });
  };

  const cancelHold = () => {
    if (!holding.current) return; // already completed
    holding.current = false;
    clearTick();
    holdAnim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  // Quick tap on the CTA button: same result, no ritual
  const askNow = () => {
    if (phase !== 'ask' || holding.current) return;
    Keyboard.dismiss();
    completeHold();
  };

  const completeHold = () => {
    holding.current = false;
    clearTick();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const q = questionRef.current;

    if (isCrisisQuestion(q)) {
      progress.setValue(0);
      setPhase('crisis');
      return;
    }

    const normalized = normalizeQuestion(q);
    let next: Result;

    if (LOCK_SAME_QUESTION && normalized && lastAnswered && lastAnswered.q === normalized) {
      next = { ...lastAnswered.result, repeated: true };
    } else {
      const reading = drawYesNoReading();
      sessionAsks += 1;
      next = {
        reading,
        copy: pickVerdictCopy(reading.isYes),
        closeLine: reading.closeCall ? pickCloseCallLine() : null,
        repeated: false,
      };
      if (normalized) lastAnswered = { q: normalized, result: next };
    }

    reveal(next);
  };

  // -------------------------------------------------------------- reveal
  const reveal = (next: Result) => {
    setResult(next);
    setPhase('reveal');

    Animated.timing(flip, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => {
      // Answer text, marker and haptic land together
      Animated.timing(content, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      Haptics.notificationAsync(
        next.reading.isYes
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      Animated.sequence([
        Animated.timing(marker, { toValue: 0.38, duration: 180, useNativeDriver: true }),
        Animated.timing(marker, { toValue: 0.62, duration: 220, useNativeDriver: true }),
        Animated.spring(marker, {
          toValue: MARKER_TARGET[next.reading.verdict],
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const reset = () => {
    flip.setValue(0);
    content.setValue(0);
    progress.setValue(0);
    marker.setValue(0.5);
    setResult(null);
    setWhy({ status: 'idle' });
    setQuestion('');
    setPhase('ask');
  };

  const askWhy = async () => {
    if (!onExplain || !result) return;
    setWhy({ status: 'loading' });
    try {
      const text = await onExplain(result.reading);
      setWhy({ status: 'done', text: text || describeCard(result.reading) });
    } catch {
      setWhy({ status: 'done', text: describeCard(result.reading) });
    }
  };

  // ----------------------------------------------------------- animation
  const flipRotation = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backOpacity = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  const holdScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const glowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const accent = result?.reading.isYes ? colors.sage : colors.rose;
  const accentWash = result?.reading.isYes ? 'rgba(143,169,152,0.16)' : 'rgba(212,164,164,0.22)';

  const markerX = marker.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(trackW - MARKER_SIZE, 0)],
  });

  // ---------------------------------------------------------------- card
  const renderCard = () => (
    <Animated.View style={{ transform: [{ scale: holdScale }] }}>
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.cardContainer, { transform: [{ rotateY: flipRotation }] }]}>
        {/* Back of the card (what you hold) */}
        <Animated.View style={[styles.cardFace, styles.cardBack, { opacity: backOpacity }]}>
          <View style={styles.cardBackBorder}>
            <View style={styles.cardBackCenter}>
              <Ionicons name="sparkles-outline" size={52} color={colors.lavender} style={{ opacity: 0.6 }} />
              <View style={styles.cardDots}>
                <View style={[styles.dot, { backgroundColor: colors.bronze }]} />
                <View style={[styles.dot, { backgroundColor: colors.sage }]} />
                <View style={[styles.dot, { backgroundColor: colors.rose }]} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Front of the card (the answer) */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardFront,
            { opacity: frontOpacity, transform: [{ rotateY: '180deg' }] },
          ]}
        >
          {result && (
            <View
              style={{
                transform: [{ rotate: result.reading.position === 'reversed' ? '180deg' : '0deg' }],
              }}
            >
              <CardImage
                imageName={result.reading.card.imageName}
                width={CARD_W - 16}
                height={CARD_H - 16}
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );

  // ---------------------------------------------------------------- views
  const renderAsk = () => (
    <>
      <Text style={styles.title}>{HEADER_TITLE}</Text>
      <Text style={styles.subtitle}>{HEADER_SUBTITLE}</Text>

      <TextInput
        style={styles.input}
        value={question}
        onChangeText={setQuestion}
        placeholder={PLACEHOLDERS[placeholderIdx]}
        placeholderTextColor={colors.textLight}
        maxLength={200}
        returnKeyType="done"
        blurOnSubmit
      />
      <Text style={styles.hint}>{INPUT_HINT}</Text>

      <View style={styles.cardSection}>
        <Pressable onPressIn={startHold} onPressOut={cancelHold}>
          {renderCard()}
        </Pressable>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
        <Text style={styles.holdCaption}>Podrž kartu</Text>
      </View>

      <TouchableOpacity style={styles.cta} onPress={askNow} activeOpacity={0.8}>
        <Ionicons name="sparkles" size={18} color={colors.background} style={{ marginRight: spacing.sm }} />
        <Text style={styles.ctaText}>{CTA_LABEL}</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>{FOOTER_DEFAULT}</Text>
    </>
  );

  const renderReveal = () => {
    if (!result) return null;
    const wink = getSessionWink(sessionAsks);

    return (
      <>
        <View style={styles.cardSection}>{renderCard()}</View>

        <Animated.View style={[styles.resultBox, { backgroundColor: accentWash, borderColor: accent, opacity: content }]}>
          <Text style={styles.resultTitle}>{result.copy.title}</Text>
          {result.closeLine && <Text style={[styles.closeCall, { color: colors.textSecondary }]}>{result.closeLine}</Text>}
          <Text style={styles.resultBody}>{result.copy.body}</Text>

          {/* NE <-> ANO scale with the marker */}
          <View style={styles.scaleWrap}>
            <Text style={styles.scaleLabel}>NE</Text>
            <View style={styles.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
              <View style={[styles.trackHalf, { backgroundColor: 'rgba(212,164,164,0.45)' }]} />
              <View style={[styles.trackHalf, { backgroundColor: 'rgba(143,169,152,0.45)' }]} />
              <Animated.View
                style={[
                  styles.marker,
                  { backgroundColor: accent, transform: [{ translateX: markerX }] },
                ]}
              />
            </View>
            <Text style={styles.scaleLabel}>ANO</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: content, width: '100%' }}>
          {result.repeated && <Text style={styles.repeat}>{REPEAT_LINE}</Text>}

          {onExplain && why.status === 'idle' && (
            <TouchableOpacity style={styles.whyButton} onPress={askWhy} activeOpacity={0.8}>
              <Text style={styles.whyButtonText}>Proč tahle karta?</Text>
            </TouchableOpacity>
          )}
          {why.status === 'loading' && <ActivityIndicator color={colors.lavender} style={{ marginVertical: spacing.md }} />}
          {why.status === 'done' && (
            <View style={styles.whyBox}>
              <Text style={styles.whyText}>{why.text}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cta} onPress={reset} activeOpacity={0.8}>
            <Text style={styles.ctaText}>{NEW_QUESTION_LABEL}</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>{wink ?? FOOTER_DEFAULT}</Text>
        </Animated.View>
      </>
    );
  };

  const renderCrisis = () => (
    <View style={styles.crisisBox}>
      <Ionicons name="heart-outline" size={32} color={colors.rose} />
      <Text style={styles.crisisText}>{CRISIS_MESSAGE}</Text>
      <TouchableOpacity style={styles.cta} onPress={reset} activeOpacity={0.8}>
        <Text style={styles.ctaText}>Zpět</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>

          {phase === 'ask' && renderAsk()}
          {phase === 'reveal' && renderReveal()}
          {phase === 'crisis' && renderCrisis()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLinen,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cardSection: { alignItems: 'center', marginVertical: spacing.xl },
  glow: {
    position: 'absolute',
    width: CARD_W + 40,
    height: CARD_H + 40,
    top: -20,
    left: -20,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.lavender,
  },
  cardContainer: { width: CARD_W, height: CARD_H },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBack: { backgroundColor: colors.surface, padding: spacing.md },
  cardBackBorder: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.softLinen,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  cardBackCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardDots: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, opacity: 0.55 },
  cardFront: {
    backgroundColor: colors.softLinen,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    overflow: 'hidden',
  },
  barTrack: {
    width: CARD_W,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.softLinen,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  barFill: { height: 4, backgroundColor: colors.lavender },
  holdCaption: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, fontWeight: '500' },
  cta: {
    width: '100%',
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaText: { color: colors.background, fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  resultBox: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  resultTitle: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center', letterSpacing: -0.4 },
  closeCall: { fontSize: 13, fontWeight: '600', marginTop: spacing.xs, textAlign: 'center' },
  resultBody: { fontSize: 16, lineHeight: 24, color: colors.text, textAlign: 'center', marginTop: spacing.md },
  scaleWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: spacing.lg, gap: spacing.sm },
  scaleLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, width: 34, textAlign: 'center' },
  track: { flex: 1, height: MARKER_SIZE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  trackHalf: { flex: 1, height: 8 },
  marker: {
    position: 'absolute',
    left: 0,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  repeat: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  whyButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.lavender,
    backgroundColor: colors.surface,
  },
  whyButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  whyBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLinen,
  },
  whyText: { fontSize: 15, lineHeight: 22, color: colors.text },
  crisisBox: {
    width: '100%',
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLinen,
    alignItems: 'center',
    gap: spacing.md,
  },
  crisisText: { fontSize: 16, lineHeight: 24, color: colors.text, textAlign: 'center' },
});
