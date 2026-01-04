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

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const buttonY = useRef(new Animated.Value(20)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

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
            {/* App Name */}
            <Text style={styles.appName}>Tarotka</Text>

            {/* Streak Badge */}
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={12} color="#fff" />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Greeting - Smaller now */}
            <Text style={styles.greeting}>{getGreeting()}</Text>

            {/* Title - "DNEŠNÍ KARTA" instead of date */}
            <Text style={styles.sectionTitle}>DNEŠNÍ KARTA</Text>

            {/* Card Visualization */}
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
              <View style={styles.card}>
                <View style={styles.cardBorder}>
                  <View style={styles.cardCenter}>
                    <Ionicons
                      name="sparkles-outline"
                      size={32}
                      color="rgba(255,255,255,0.6)"
                      style={styles.cardIcon}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Main CTA Button - Directly under card */}
            {/* "Vytáhnout kartu" */}
            <Animated.View
              style={{
                transform: [{ translateY: buttonY }],
                width: '100%',
                alignItems: 'center',
                marginBottom: spacing.xl,
              }}
            >
              <TouchableOpacity
                onPress={() => onDrawCard()}
                disabled={hasReadToday}
                style={[
                  styles.mainButton,
                  hasReadToday && styles.mainButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.mainButtonText}>
                  {hasReadToday ? 'Vyloženo' : 'Vytáhnout kartu'}
                </Text>
                {!hasReadToday && (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#fff"
                    style={{ opacity: 0.8 }}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>

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

            {/* Bottom Actions Row */}
            <View style={styles.bottomActionsRow}>
              {/* Left: Večerní reflexe */}
              <TouchableOpacity
                style={styles.bottomActionButton}
                onPress={() => {
                  // For now, map to Mystery Card aka "Evening" flow
                  onDrawCard(MYSTERY_CARD_IDS);
                }}
              >
                <View style={styles.bottomActionIcon}>
                  <Ionicons name="moon-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.bottomActionText}>Večerní reflexe</Text>
              </TouchableOpacity>

              {/* Right: Vlastní otázka */}
              <TouchableOpacity
                style={styles.bottomActionButton}
                onPress={() => {
                  setIsAskingQuestion(!isAskingQuestion);
                }}
              >
                <View style={[styles.bottomActionIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.bottomActionText}>Vlastní otázka</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  appName: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  streakBadge: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  streakText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  mainContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xl,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 160,
    height: 240,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardBorder: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    opacity: 0.8,
    color: '#fff',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: spacing.sm,
  },
  mainButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },

  // Bottom Action Row
  bottomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  bottomActionButton: {
    flex: 1,
    aspectRatio: 1, // Square-ish
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    minHeight: 100, // ensure min height
  },
  bottomActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bottomActionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    lineHeight: 18,
  },

  questionInputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  questionInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    marginBottom: spacing.sm,
  },
  askSubmitButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  askSubmitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  readingTypesContainer: {
    marginTop: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: spacing.md,
  },
  readingLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  verticalDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  textLink: {
    padding: spacing.xs,
  },
  textLinkText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: spacing.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fabEmoji: {
    fontSize: 24,
  },
  devButton: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    opacity: 0.1,
  },
});
