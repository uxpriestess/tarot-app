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

  // Design Variant State for A/B Testing
  const [bgVariant, setBgVariant] = useState<'ritual' | 'celestial'>('ritual');

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
      ? 'Dobré ráno ☀️'
      : hour < 18
        ? 'Krásné odpoledne 🌤️'
        : 'Krásný večer 🌙';
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
      variant={bgVariant}
      debugMode={true} // Enable debug mode to see hotspots if we add them later
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          {/* Streak Badge */}
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color={colors.bronze} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Greeting - Updated text color for better contrast on images */}
            <Text style={styles.greeting}>{getGreeting()}</Text>

            {/* Date */}
            <Text style={styles.date}>{formatDate()}</Text>

            {/* Card Visualization */}
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
              {/* Subtle glow */}
              <View style={styles.cardGlow} />

              {/* Card back design */}
              <View style={styles.card}>
                {/* Decorative border - "Gold Dipped" */}
                <View style={[styles.cardBorder, { borderColor: colors.secondary }]}>
                  {/* Center symbol */}
                  <View style={styles.cardCenter}>
                    <Ionicons
                      name="sparkles-outline"
                      size={48}
                      color={colors.primary} // Amethyst
                      style={styles.cardIcon}
                    />
                    {/* Small decorative elements */}
                    <View style={styles.cardDots}>
                      <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
                      <View style={[styles.dot, { backgroundColor: colors.tertiary }]} />
                      <View style={[styles.dot, { backgroundColor: colors.sage }]} />
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Time Context Chips - Vintage Gem Style */}
            <View style={styles.chipsContainer}>
              <TouchableOpacity
                onPress={() => setSelectedContext('morning')}
                style={[
                  styles.chip,
                  selectedContext === 'morning' ? styles.chipActiveMorning : styles.chipInactive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedContext === 'morning' && styles.chipTextActive,
                  ]}
                >
                  ☀️ Ráno
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedContext('evening')}
                style={[
                  styles.chip,
                  selectedContext === 'evening' ? styles.chipActiveEvening : styles.chipInactive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedContext === 'evening' && styles.chipTextActive,
                  ]}
                >
                  🌙 Večer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedContext('deeper')}
                style={[
                  styles.chip,
                  selectedContext === 'deeper' ? styles.chipActiveDeeper : styles.chipInactive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedContext === 'deeper' && styles.chipTextActive,
                  ]}
                >
                  🔮 Vlastní otázka
                </Text>
              </TouchableOpacity>
            </View>


            {/* Contextual Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.messageTitle}>
                {getContextualMessage().title}
              </Text>
              <Text style={styles.messageSubtitle}>
                {getContextualMessage().subtitle}
              </Text>
            </View>

            {/* Question Input for "Zeptej se cokoliv" */}
            {selectedContext === 'deeper' && !hasReadToday && (
              <View style={styles.questionInputContainer}>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Na co se chceš zeptat?"
                  placeholderTextColor={colors.textLight}
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  maxLength={200}
                />
              </View>
            )}

            {/* Main CTA Button */}
            <Animated.View
              style={{
                transform: [{ translateY: buttonY }],
                width: '100%',
              }}
            >
              {/* If Evening and Card Drawn -> Show Reflect/Journal Button */}
              {selectedContext === 'evening' && hasReadToday ? (
                <TouchableOpacity
                  onPress={() => {
                  }}
                  disabled={true}
                  style={[styles.mainButton, { backgroundColor: colors.lavender }]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color={colors.background}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.mainButtonText}>
                    Zapsat večerní reflexi
                  </Text>
                </TouchableOpacity>
              ) : (
                /* Standard Draw Button (Morning or Evening Mystery) */
                <TouchableOpacity
                  onPress={() => {
                    if (!hasReadToday) {
                      if (selectedContext === 'deeper') {
                        // Call universe service
                        if (onAskUniverse) {
                          onAskUniverse(question);
                        }
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
                  activeOpacity={hasReadToday ? 1 : 0.8}
                >
                  <Ionicons
                    name={selectedContext === 'evening' ? 'moon' : (selectedContext === 'deeper' ? 'chatbubbles' : 'sparkles')}
                    size={20}
                    color={colors.background}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.mainButtonText}>
                    {hasReadToday
                      ? (selectedContext === 'evening' ? 'Karta dne odhalena' : ' Hotovo na dnes')
                      : (selectedContext === 'deeper' ? 'Vyvěšti svou odpověď' : (selectedContext === 'evening' ? 'Karta na dobrou noc' : 'Vytáhnout kartu'))
                    }
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Reading Types - Placeholder */}
            {onSingleCard && onThreeCards && (
              <View style={styles.readingTypesContainer}>
                <Text style={styles.sectionTitle}>Typy výkladů</Text>
                <View style={styles.readingGrid}>
                  <TouchableOpacity
                    style={styles.readingCard}
                    onPress={onSingleCard}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flash-outline" size={24} color={colors.bronze} />
                    <Text style={styles.readingTitle}>Jednoduchý</Text>
                    <Text style={styles.readingSubtitle}>1 karta</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.readingCard}
                    onPress={onThreeCards}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="triangle-outline" size={24} color={colors.lavender} />
                    <Text style={styles.readingTitle}>Tři karty</Text>
                    <Text style={styles.readingSubtitle}>Minulost・Současnost・Budoucnost</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Tarotka Insights */}
            {dynamicInsights.length > 0 && (
              <View style={styles.insightsContainer}>
                <Text style={styles.sectionTitle}>Tarotka insights</Text>
                {dynamicInsights.map((insight, index) => (
                  <View key={`${insight.type}-${index}`} style={styles.insightCard}>
                    <View style={styles.insightIconWrapper}>
                      <Ionicons
                        name={
                          insight.type === 'Journal' ? 'book-outline' :
                            insight.type === 'Streak' ? 'flame-outline' :
                              insight.type === 'Favorite' ? 'heart-outline' :
                                insight.type === 'Milestone' ? 'trophy-outline' :
                                  'sparkles-outline'
                        }
                        size={20}
                        color={colors.bronze}
                      />
                    </View>
                    <Text style={styles.insightText}>{insight.text}</Text>
                  </View>
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

      {/* Design Variant Toggle - Temporary for A/B Testing */}
      <TouchableOpacity
        onPress={() => setBgVariant(prev => prev === 'ritual' ? 'celestial' : 'ritual')}
        style={styles.toggleButton}
        activeOpacity={0.8}
      >
        <Ionicons name="color-palette-outline" size={20} color={colors.background} />
        <Text style={styles.toggleButtonText}>
          {bgVariant === 'ritual' ? 'Switch to Celestial' : 'Switch to Ritual'}
        </Text>
      </TouchableOpacity>

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
  container: {
    flex: 1,
    // Background handled by ImmersiveScreen
  },
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
  streakBadge: {
    position: 'absolute',
    top: -20,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // More transparent
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  streakText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  mainContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24, // Larger greeting
    fontWeight: '700',
    color: '#fff', // White text for image contrast
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Drop shadow for readability
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)', // Lighter white
    marginBottom: spacing.xxl,
    textTransform: 'capitalize',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardContainer: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlow: {
    position: 'absolute',
    width: 200,
    height: 300,
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    opacity: 0.15, // stronger glow
    transform: [{ scale: 1.15 }],
  },
  card: {
    width: 180,
    height: 270,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassmorphism
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  cardCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    marginBottom: spacing.md,
    opacity: 0.9,
    color: '#fff',
  },
  cardDots: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
    marginRight: spacing.xs,
    backgroundColor: '#fff',
  },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark glass
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: spacing.sm,
  },
  chipInactive: {
    // defaults
  },
  chipActiveMorning: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)', // Gold tint
    borderColor: '#FFD700',
  },
  chipActiveEvening: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)', // Violet tint
    borderColor: '#8A2BE2',
  },
  chipActiveDeeper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#fff',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messageSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mainButton: {
    width: '100%',
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.full,
    backgroundColor: '#fff', // White button for contrast
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  mainButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    opacity: 0.8,
  },
  buttonIcon: {
    marginRight: spacing.sm,
    color: colors.text, // Dark icon since button is white
  },
  mainButtonText: {
    color: colors.text, // Dark text
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.md,
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowRadius: 2,
  },
  readingTypesContainer: {
    marginTop: spacing.xl,
    width: '100%',
  },
  readingGrid: {
    // gap removed
  },
  readingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  readingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  readingSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  insightsContainer: {
    marginTop: spacing.xl,
    width: '100%',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: spacing.sm,
  },
  insightText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  insightIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  fab: {
    position: 'absolute',
    bottom: 140, // Moved up to make room for toggle
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  fabEmoji: {
    fontSize: 32,
  },
  devButton: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    opacity: 0.2,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 8,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  questionInputContainer: {
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  questionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
