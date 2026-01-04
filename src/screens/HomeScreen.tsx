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
  const [question, setQuestion] = useState('');

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
    // Defaulting to schema config, no variant override needed as we set 'home' to Ritual
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          {/* Streak Badge - Minimal Glass */}
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={12} color="#fff" />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Greeting - Ritual Style: Large Serif, Elegant */}
            <Text style={styles.greeting}>{getGreeting()}</Text>

            {/* Date - Small, Caps, Spaced */}
            <Text style={styles.date}>{formatDate().toUpperCase()}</Text>

            {/* Card Visualization - Transparent/Ghost */}
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
              {/* Card back design - Ghostly */}
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

            {/* Time Context Chips - Text Only / Minimal Underline */}
            <View style={styles.chipsContainer}>
              <TouchableOpacity
                onPress={() => setSelectedContext('morning')}
                style={[
                  styles.chip,
                  selectedContext === 'morning' && styles.chipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedContext === 'morning' && styles.chipTextActive,
                  ]}
                >
                  Ráno
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedContext('evening')}
                style={[
                  styles.chip,
                  selectedContext === 'evening' && styles.chipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedContext === 'evening' && styles.chipTextActive,
                  ]}
                >
                  Večer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedContext('deeper')}
                style={[
                  styles.chip,
                  selectedContext === 'deeper' && styles.chipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedContext === 'deeper' && styles.chipTextActive,
                  ]}
                >
                  Otázka
                </Text>
              </TouchableOpacity>
            </View>


            {/* Contextual Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.messageTitle}>
                {getContextualMessage().title}
              </Text>
            </View>

            {/* Question Input for "Zeptej se cokoliv" */}
            {selectedContext === 'deeper' && !hasReadToday && (
              <View style={styles.questionInputContainer}>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Na co se ptáš?"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  maxLength={200}
                />
              </View>
            )}

            {/* Main CTA Button - Elegant Text Button */}
            <Animated.View
              style={{
                transform: [{ translateY: buttonY }],
                width: '100%',
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (!hasReadToday) {
                    if (selectedContext === 'deeper') {
                      if (onAskUniverse) onAskUniverse(question);
                    } else if (selectedContext === 'evening') {
                      onDrawCard(MYSTERY_CARD_IDS);
                    } else {
                      onDrawCard();
                    }
                  }
                }}
                disabled={hasReadToday && selectedContext !== 'evening'}
                style={[
                  styles.mainButton,
                  hasReadToday && styles.mainButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.mainButtonText}>
                  {hasReadToday
                    ? (selectedContext === 'evening' ? 'Odhalit kartu' : 'Vyloženo')
                    : (selectedContext === 'deeper' ? 'Vyložit' : (selectedContext === 'evening' ? 'Dobrou noc' : 'Vyložit kartu'))
                  }
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#fff"
                  style={{ opacity: 0.8 }}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Reading Types - Minimal List */}
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

            {/* Insights - Bare text */}
            {dynamicInsights.length > 0 && (
              <View style={styles.insightsContainer}>
                {dynamicInsights.map((insight, index) => (
                  <Text key={index} style={styles.insightTextSimple}>
                    • {insight.text}
                  </Text>
                ))}
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
    paddingTop: 80, // More top space for cleaner look
    paddingBottom: 120,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  streakBadge: {
    position: 'absolute',
    top: -40,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
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
    fontSize: 32,
    fontWeight: '400', // Lighter weight for elegance
    color: '#fff',
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif', // Elegant serif
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontStyle: 'italic', // Adds that ritual vibe
  },
  date: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.xl,
    letterSpacing: 2, // Spaced out caps
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 140, // Smaller, less dominant
    height: 210,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darker glass
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardBorder: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    opacity: 0.8,
  },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    justifyContent: 'center',
    gap: 20,
  },
  chip: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  chipActive: {
    borderBottomColor: '#fff', // Underline style
  },
  chipText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    minHeight: 30,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontStyle: 'italic',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Very subtle pill
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: spacing.sm,
  },
  mainButtonDisabled: {
    opacity: 0.5,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  questionInputContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  questionInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
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
  insightsContainer: {
    marginTop: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  insightTextSimple: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
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
