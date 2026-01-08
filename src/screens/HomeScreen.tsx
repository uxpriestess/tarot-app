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

    // Subtle slow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
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
    if (hour < 12) return { text: 'Dobré ráno', icon: 'sunny-outline' };
    if (hour < 18) return { text: 'Krásné odpoledne', icon: 'sunny' };
    return { text: 'Krásný večer', icon: 'moon-outline' };
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

  const greeting = getGreeting();

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
            <View style={styles.headerTopCenter}>
              <Text style={styles.headerGreeting}>{greeting.text}</Text>
            </View>
            <View style={styles.streakBadgeContainer}>
              {streak > 0 && (
                <View style={styles.streakBadgeSmall}>
                  <Ionicons name="flame" size={12} color={colors.textCream} />
                  <Text style={styles.streakBadgeText}>{streak}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
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
                onPress={() => onDrawCard()}
                disabled={hasReadToday}
                activeOpacity={0.9}
                style={styles.mysticCard}
              >
                <View style={styles.mysticCardInner}>
                  <Ionicons
                    name="sunny-outline"
                    size={80}
                    color="rgba(255,255,255,0.4)"
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* NEW Tab-like selector */}
            <View style={styles.tabSelector}>
              {(['morning', 'evening', 'deeper'] as const).map((ctx) => (
                <TouchableOpacity
                  key={ctx}
                  onPress={() => setSelectedContext(ctx)}
                  style={styles.tabItem}
                >
                  <Text style={[
                    styles.tabText,
                    selectedContext === ctx && styles.tabTextActive
                  ]}>
                    {ctx === 'morning' ? 'Ráno' : ctx === 'evening' ? 'Večer' : 'Otázka'}
                  </Text>
                  {selectedContext === ctx && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Context Caption */}
            <Text style={styles.contextItalicCaption}>
              {hasReadToday ? 'Dnešní karta vyložena' :
                selectedContext === 'morning' ? 'Tvoje dnešní karta čeká' :
                  selectedContext === 'evening' ? 'Reflexe před spaním' :
                    'Zeptej se na cokoliv'}
            </Text>

            {/* Custom Question Input (Integrated into the flow) */}
            {selectedContext === 'deeper' && !hasReadToday && (
              <View style={styles.questionInputContainer}>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Karty ti naslouchají!"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  maxLength={150}
                />
              </View>
            )}

            {/* Main CTA Button - "Vyložit kartu" */}
            <Animated.View
              style={{
                transform: [{ translateY: buttonY }],
                width: '100%',
                alignItems: 'center',
                marginTop: 32, // More space above button
                marginBottom: 20, // Add explicit margin bottom
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (selectedContext === 'deeper' && question.trim()) {
                    onAskUniverse?.(question);
                    setQuestion('');
                  } else {
                    onDrawCard(selectedContext === 'evening' ? MYSTERY_CARD_IDS : undefined);
                  }
                }}
                disabled={hasReadToday || (selectedContext === 'deeper' && !question.trim())}
                style={[
                  styles.mysticButton,
                  hasReadToday && styles.mysticButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.mysticButtonText}>
                  {hasReadToday ? 'Vyloženo' : 'Vyložit kartu'}
                </Text>
                {!hasReadToday && (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={colors.textCream}
                    style={{ marginLeft: 12 }}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
            {/* Reading Types - Minimal List */}
            {onSingleCard && onThreeCards && (
              <View style={styles.readingTypesContainer}>
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
    paddingBottom: 180, // Substantially increased to prevent nav bar overlap
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    justifyContent: 'center',
    marginTop: 20, // Reduced to pull content up
    marginBottom: 40,
    position: 'relative',
  },
  headerTopCenter: {
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 32,
    color: colors.textCream,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '400',
  },
  streakBadgeContainer: {
    position: 'absolute',
    right: 0,
    top: 10,
  },
  streakBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  streakBadgeText: {
    color: colors.textCream,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  mainContent: {
    width: '100%',
    alignItems: 'center',
  },
  cardContainer: {
    marginBottom: 40, // Slightly reduced
    alignItems: 'center',
  },
  mysticCard: {
    width: width * 0.52, // Slightly narrower
    height: width * 0.8, // Reduced height to fix layout overlap
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  mysticCardInner: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24, // Tightened
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  tabTextActive: {
    color: colors.textCream,
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 1.5,
    backgroundColor: '#fff',
  },
  contextItalicCaption: {
    fontSize: 16,
    color: colors.textCream,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontStyle: 'italic',
    marginBottom: 20, // Tightened
    textAlign: 'center',
    opacity: 0.9,
  },
  mysticButton: {
    width: width * 0.7,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mysticButtonText: {
    color: colors.textCream,
    fontSize: 19,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '400',
  },
  mysticButtonDisabled: {
    opacity: 0.3,
  },
  questionInputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  questionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.textCream,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  readingTypesContainer: {
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
    opacity: 0.5,
  },
  readingLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  verticalDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  textLink: {
    padding: 8,
  },
  textLinkText: {
    color: colors.textCream,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '400',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
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
    bottom: 20,
    left: 20,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    opacity: 0.05,
  },
});
