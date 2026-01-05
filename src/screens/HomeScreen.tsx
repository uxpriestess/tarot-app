import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useInsights } from '../hooks/useInsights';
import { MYSTERY_CARD_IDS } from '../data/subsets';
import { ImmersiveScreen } from '../components/ImmersiveScreen';

interface HomeScreenProps {
  onDrawCard: (subsetIds?: string[]) => void;
  onAskUniverse?: (question: string) => Promise<void>;
  hasReadToday: boolean;
  streak: number;
  onViewGuides?: () => void;
  onShowSplash?: () => void;
  insights?: any[];
  onSingleCard?: () => void;
  onThreeCards?: () => void;
  onOpenMystic?: () => void;
}

type TimeContext = 'morning' | 'evening' | 'deeper';

const { width } = Dimensions.get('window');

export function HomeScreen({
  onDrawCard,
  onAskUniverse,
  hasReadToday,
  streak,
  onViewGuides,
  onShowSplash,
  insights = [],
  onSingleCard,
  onThreeCards,
  onOpenMystic,
}: HomeScreenProps) {
  // Get insights from Zustand store
  const { insights: dynamicInsights } = useInsights();


  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedContext, setSelectedContext] = useState<TimeContext>(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'morning';
    return 'evening';
  });
  // View mode for Custom Question input
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [question, setQuestion] = useState('');

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const buttonY = useRef(new Animated.Value(20)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Moon phase calculation (Mathematical approximation)
  const getMoonPhase = () => {
    const lp = 2551443;
    const now = new Date();
    const newMoon = new Date(1970, 0, 7, 20, 35, 0);
    const phase = ((now.getTime() - newMoon.getTime()) / 1000) % lp;
    const res = Math.floor(phase / (24 * 3600)) + 1;

    // Simple mapping: 
    // 0-3: New, 4-6: Waxing Crescent, 7-10: First Quarter, 11-14: Waxing Gibbous
    // 15-18: Full, 19-22: Waning Gibbous, 23-25: Last Quarter, 26-29: Waning Crescent
    if (res <= 3) return { icon: 'moon-outline', name: 'Novoluní' };
    if (res <= 10) return { icon: 'moon-outline', name: 'Dorůstající měsíc' };
    if (res <= 18) return { icon: 'moon', name: 'Úplněk' };
    if (res <= 25) return { icon: 'moon-outline', name: 'Ubývající měsíc' };
    return { icon: 'moon-outline', name: 'Novoluní' };
  };

  const moon = getMoonPhase();

  useEffect(() => {
    // Entrance animations - subtle and graceful
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(buttonY, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(fabScale, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Pulse animation for the daily card
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = () => {
    return currentTime.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    return hour < 12
      ? 'Dobré ráno'
      : hour < 18
        ? 'Krásné odpoledne'
        : 'Krásný večer';
  };

  const getContextualMessage = () => {
    if (hasReadToday) {
      return {
        title: 'Už máš dnešní kartu',
        subtitle: 'Zítra tě čeká nová ✨',
      };
    }

    switch (selectedContext) {
      case 'morning':
        return {
          title: 'Tvoje denní karta čeká',
          subtitle: '',
        };
      case 'evening':
        return {
          title: 'Večerníček',
          subtitle: '',
        };
      case 'deeper':
        return {
          title: 'Ptej se na cokoliv',
          subtitle: '',
        };
    }
  };

  return (
    <ImmersiveScreen
      screenName="home"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          {/* Header Area */}
          <View style={styles.header}>
            {/* Greeting + Moon Phase */}
            <View style={styles.greetingWrapper}>
              <Ionicons name={moon.icon as any} size={18} color="rgba(249, 248, 244, 0.8)" style={{ marginRight: 8 }} />
              <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            </View>

            {/* App Name - Center */}
            <View style={styles.appNameContainer}>
              <Text style={styles.appName}>Tarotka</Text>
            </View>

            {/* Streak Badge - Right */}
            <View style={styles.headerRight}>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={12} color="#F9F8F4" />
                  <Text style={styles.streakText}>{streak}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Title - "DNEŠNÍ KARTA" instead of date */}
            <Text style={styles.sectionTitle}>DNEŠNÍ KARTA</Text>

            {/* Card Visualization */}
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ scale: Animated.multiply(cardScale, pulseAnim) }],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onDrawCard()}
                disabled={hasReadToday}
                style={styles.card}
              >
                <Image
                  source={require('../../assets/cards/card_back_mystic.png')}
                  style={styles.cardBackImage}
                  resizeMode="cover"
                />
                {!hasReadToday && (
                  <View style={styles.cardOverlay}>
                    <Animated.View style={{ opacity: pulseAnim.interpolate({ inputRange: [1, 1.03], outputRange: [0.6, 1] }) }}>
                      <Ionicons name="sparkles" size={32} color="#F9F8F4" />
                    </Animated.View>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.cardCaption}>Tvá karta čeká</Text>
            </Animated.View>

            {/* Main CTA moved to click on card, so we can hide or change this */}
            {hasReadToday && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Dnešní moudrost odhalena ✨</Text>
              </View>
            )}

            {/* Custom Question Input (Conditionally rendered) */}
            {isAskingQuestion && !hasReadToday && (
              <View style={styles.questionInputContainer}>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Na co se ptáš?"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  maxLength={200}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => {
                    if (onAskUniverse && question.trim().length > 0) {
                      onAskUniverse(question);
                      setIsAskingQuestion(false); // Reset after ask
                    }
                  }}
                  style={styles.askSubmitButton}
                >
                  <Text style={styles.askSubmitText}>Zeptat se</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Aesthetic Action Holders */}
            <View style={styles.aestheticActions}>
              {/* Holder 1: Evening Reflection */}
              <TouchableOpacity
                style={styles.aestheticHolder}
                onPress={() => onDrawCard(MYSTERY_CARD_IDS)}
                activeOpacity={0.7}
              >
                <View style={styles.holderIconCircle}>
                  <Ionicons name="moon-outline" size={20} color="#F9F8F4" />
                </View>
                <Text style={styles.holderText}>Karta před spaním</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(249, 248, 244, 0.4)" />
              </TouchableOpacity>

              {/* Holder 2: Custom Question */}
              <TouchableOpacity
                style={styles.aestheticHolder}
                onPress={() => setIsAskingQuestion(!isAskingQuestion)}
                activeOpacity={0.7}
              >
                <View style={styles.holderIconCircle}>
                  <Ionicons name="sparkles-outline" size={20} color="#F9F8F4" />
                </View>
                <Text style={styles.holderText}>Zeptej se cokoliv</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(249, 248, 244, 0.4)" />
              </TouchableOpacity>
            </View>

            {/* Reading Types - Minimal List (Optional - pushed down) */}
            {onSingleCard && onThreeCards && (
              <View style={styles.readingTypesContainer}>
                <View style={styles.divider} />
                <View style={styles.readingLinks}>
                  <TouchableOpacity onPress={onSingleCard} style={styles.textLink}>
                    <Text style={styles.textLinkText}>Jedna karta</Text>
                  </TouchableOpacity>
                  <View style={styles.verticalDivider} />
                  <TouchableOpacity onPress={onThreeCards} style={styles.textLink}>
                    <Text style={styles.textLinkText}>Tři karty</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button - Cat Guides */}
      {onViewGuides && (
        <Animated.View
          style={[
            styles.fab,
            {
              transform: [{ scale: fabScale }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={onViewGuides}
            activeOpacity={0.8}
            style={styles.fabButton}
          >
            <Text style={styles.fabEmoji}>🐱</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Dev Splash Button */}
      {onShowSplash && (
        <TouchableOpacity
          onPress={onShowSplash}
          style={styles.devButton}
          activeOpacity={0.5}
        />
      )}
    </ImmersiveScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 120,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
    height: 60,
  },
  greetingWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 15,
    color: '#F9F8F4', // Creamy
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontStyle: 'italic',
    opacity: 0.9,
  },
  appNameContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  appName: {
    fontSize: 34,
    color: '#F9F8F4',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '600',
    letterSpacing: 2,
    opacity: 0.95,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 248, 244, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(249, 248, 244, 0.2)',
  },
  streakText: {
    color: '#F9F8F4',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  mainContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginTop: spacing.md,
  },

  sectionTitle: {
    fontSize: 12,
    color: 'rgba(249, 248, 244, 0.6)',
    marginBottom: spacing.lg,
    letterSpacing: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    textTransform: 'uppercase',
  },
  cardContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 220,
    height: 330,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 248, 244, 0.3)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  cardBackImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCaption: {
    marginTop: spacing.md,
    fontSize: 18,
    color: '#F9F8F4',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(249, 248, 244, 0.1)',
    borderRadius: borderRadius.full,
    marginBottom: spacing.xl,
  },
  statusText: {
    color: '#F9F8F4',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  aestheticActions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  aestheticHolder: {
    width: '100%',
    height: 64,
    backgroundColor: 'rgba(249, 248, 244, 0.08)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(249, 248, 244, 0.15)',
  },
  holderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 248, 244, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  holderText: {
    flex: 1,
    color: '#F9F8F4',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  questionInputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  questionInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: '#F9F8F4',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(249, 248, 244, 0.2)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    marginBottom: spacing.sm,
  },
  askSubmitButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(249, 248, 244, 0.2)',
    borderRadius: borderRadius.full,
  },
  askSubmitText: {
    color: '#F9F8F4',
    fontWeight: '600',
    fontSize: 14,
  },
  readingTypesContainer: {
    marginTop: spacing.xxl,
    width: '100%',
    alignItems: 'center',
    opacity: 0.6,
  },
  divider: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(249, 248, 244, 0.3)',
    marginBottom: spacing.md,
  },
  readingLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  verticalDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(249, 248, 244, 0.3)',
  },
  textLink: {
    padding: spacing.xs,
  },
  textLinkText: {
    color: '#F9F8F4',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: spacing.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  fabButton: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(249, 248, 244, 0.15)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249, 248, 244, 0.3)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  fabEmoji: {
    fontSize: 28,
  },
  devButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#F9F8F4',
    opacity: 0.05,
  },
});
