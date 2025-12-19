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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useInsights } from '../hooks/useInsights';
import { MYSTERY_CARD_IDS } from '../data/subsets';

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
          title: 'Začni den lehce',
          subtitle: 'Co ti dnešek připravil? 🌅',
        };
      case 'evening':
        return {
          title: 'Uklidni hlavu',
          subtitle: 'Reflexe dne před spaním 🌙',
        };
      case 'deeper':
        return {
          title: question ? 'Tvoje otázka' : 'Na co se chceš zeptat?',
          subtitle: question ? '' : 'Polož otázku a karty ti odpoví 🔮',
        };
    }
  };

  return (
    <View style={styles.container}>
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
            {/* Greeting */}
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
                {/* Decorative border */}
                <View style={styles.cardBorder}>
                  {/* Center symbol */}
                  <View style={styles.cardCenter}>
                    <Ionicons
                      name="sparkles-outline"
                      size={48}
                      color={colors.lavender}
                      style={styles.cardIcon}
                    />
                    {/* Small decorative elements */}
                    <View style={styles.cardDots}>
                      <View style={[styles.dot, { backgroundColor: colors.bronze }]} />
                      <View style={[styles.dot, { backgroundColor: colors.sage }]} />
                      <View style={[styles.dot, { backgroundColor: colors.rose }]} />
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Time Context Chips - Override for Dev/Testing */}
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
                  ☀️ Ráno
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
                  🌙 Večer
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
                  🔮 Zeptej se cokoliv
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
                    // This should ideally open the specific journal entry for today
                    // For now, we reuse the onDrawCard (which handles 'today' logic in layout) or prompt
                    // But if hasReadToday is true, onDrawCard is disabled usually.
                    // We need a specific action to open the detail view of the daily card.
                    // Since we don't have the entry ID here easily without store prop refactor, 
                    // we might simulate a "View" action if available, or just disable for now.
                    // Ideally: navigation.navigate('Journal') or open modal.
                    // For MVP of this feature: We will rely on user navigating to Journal tab manually,
                    // OR if onSingleCard is available we assume it shows daily card.
                    // HOWEVER, the logic below specifically asks for "Encouraged to write notes".

                    // Let's assume onDrawCard handles "View Today's Card" if already drawn, OR we add a new prop.
                    // For this task scope, we'll direct them to the journal tab via text or simple alert if we can't nav.
                    // Better: Use `onViewGuides` as placeholder or just keep disabled but change text.
                  }}
                  disabled={true} // For now, until we wire up "Open Today's Entry"
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
                  disabled={hasReadToday && selectedContext !== 'evening'} // Allow evening interaction if we had "action" but we split above
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
                      : (selectedContext === 'deeper' ? 'Vyložit karty' : (selectedContext === 'evening' ? 'Odhalit večerní tajemství' : 'Vytáhnout kartu'))
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

      {/* Dev Splash Button */}
      {onShowSplash && (
        <TouchableOpacity
          onPress={onShowSplash}
          style={styles.devButton}
          activeOpacity={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    textTransform: 'capitalize',
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
    backgroundColor: colors.lavender,
    borderRadius: borderRadius.xl,
    opacity: 0.08,
    transform: [{ scale: 1.15 }],
  },
  card: {
    width: 180,
    height: 270,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBorder: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.softLinen,
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
    opacity: 0.6,
  },
  cardDots: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
    marginRight: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.softLinen,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.softLinen,
    borderColor: colors.lavender,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  messageSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mainButton: {
    width: '100%',
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  mainButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  mainButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  readingTypesContainer: {
    marginTop: spacing.xl,
    width: '100%',
  },
  readingGrid: {
    // gap removed
  },
  readingCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.softLinen,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.md,
  },
  readingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  readingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  insightsContainer: {
    marginTop: spacing.xl,
    width: '100%',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.softLinen,
    marginBottom: spacing.sm,
  },
  insightText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  insightIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.softLinen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.lavender,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
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
    backgroundColor: colors.text,
    opacity: 0.2,
  },
  questionInputContainer: {
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  questionInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.lavender,
  },
});
