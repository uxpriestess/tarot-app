import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { CardImage } from './CardImage';
import { colors, spacing, borderRadius } from '../theme/colors';
import { TarotCard } from '../types/tarot';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper function to parse **bold** markdown syntax
function parseMeaningText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove the ** and make it bold
      const boldText = part.slice(2, -2);
      return (
        <Text key={index} style={{ fontWeight: '700' }}>
          {boldText}
        </Text>
      );
    }
    return part;
  });
}

interface RevealableCardProps {
  card: TarotCard;
  position?: string; // "Past", "Present", "You", "Partner", etc.
  isRevealed: boolean;
  onToggleReveal: () => void;
  onReveal?: () => Promise<string>; // Async function to fetch AI meaning
  aiMeaning?: string; // Pre-fetched meaning (if available)
  cardWidth?: number;
  cardHeight?: number;
  disabled?: boolean; // For locked progression (can't reveal yet)
  showPosition?: boolean; // Show position label above card
}

export function RevealableCard({
  card,
  position,
  isRevealed,
  onToggleReveal,
  onReveal,
  aiMeaning,
  cardWidth = 280,
  cardHeight = 420,
  disabled = false,
  showPosition = false,
}: RevealableCardProps) {
  const [meaning, setMeaning] = useState<string | null>(aiMeaning || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Sync aiMeaning prop with internal state
  useEffect(() => {
    if (aiMeaning) {
      setMeaning(aiMeaning);
    }
  }, [aiMeaning]);

  // Fetch meaning when card is revealed
  useEffect(() => {
    if (isRevealed && !meaning && onReveal) {
      fetchMeaning();
    }
  }, [isRevealed]);

  const fetchMeaning = async () => {
    if (!onReveal) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedMeaning = await onReveal();
      setMeaning(fetchedMeaning);
    } catch (err) {
      console.error('Error fetching meaning:', err);
      setError('Nepodařilo se načíst výklad. Zkus to znovu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    if (disabled) {
      // Shake animation for locked cards
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      return;
    }

    // Smooth expansion animation
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        400,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    onToggleReveal();

    // Glow effect when revealing
    if (!isRevealed) {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start();
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(186, 148, 240, 0)', 'rgba(186, 148, 240, 0.3)'],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      {/* Position Label */}
      {showPosition && position && (
        <View style={styles.positionLabelContainer}>
          <Text style={styles.positionLabel}>{position}</Text>
        </View>
      )}

      {/* Card Container */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        disabled={disabled && !isRevealed}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.cardContainer,
            { 
              shadowColor: glowColor,
              shadowOpacity: 1,
              shadowRadius: 20,
            },
          ]}
        >
          {/* Card Image */}
          <View style={styles.cardImageWrapper}>
            <CardImage
              imageName={card.imageName}
              width={cardWidth}
              height={cardHeight}
              resizeMode="cover"
            />
            
            {/* Disabled Overlay */}
            {disabled && !isRevealed && (
              <View style={styles.disabledOverlay}>
                <Ionicons name="lock-closed" size={40} color="rgba(255,255,255,0.6)" />
              </View>
            )}

            {/* Tap Indicator (when not revealed) */}
            {!isRevealed && !disabled && (
              <View style={styles.tapIndicator}>
                <Ionicons name="hand-left-outline" size={24} color={colors.lavender} />
                <Text style={styles.tapText}>Ťukni pro výklad</Text>
              </View>
            )}
          </View>

          {/* Expanded Meaning Section */}
          {isRevealed && (
            <View style={styles.meaningSection}>
              {/* Card Name */}
              <View style={styles.cardNameContainer}>
                <Text style={styles.cardName}>{card.nameCzech || card.name}</Text>
                {position && !showPosition && (
                  <Text style={styles.positionSubtext}>{position}</Text>
                )}
              </View>

              {/* Loading State - show when loading OR when revealed but no meaning yet */}
              {(isLoading || !meaning) && !error && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.lavender} />
                  <Text style={styles.loadingText}>Vesmír skládá tvůj příběh...</Text>
                </View>
              )}

              {/* Error State */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={fetchMeaning}>
                    <Text style={styles.retryButtonText}>Zkusit znovu</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Meaning Text */}
              {meaning && !isLoading && (
                <View style={styles.meaningContent}>
                  <Text style={styles.meaningText}>
                    {parseMeaningText(meaning)}
                  </Text>
                </View>
              )}

              {/* Collapse Indicator - only show if card can actually be toggled */}
              {disabled === false && onToggleReveal.toString() !== '() => {}' && (
                <TouchableOpacity style={styles.collapseButton} onPress={handlePress}>
                  <Ionicons name="chevron-up" size={20} color={colors.textLight} />
                  <Text style={styles.collapseText}>Skrýt</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  touchable: {
    width: '100%',
    alignItems: 'center',
  },
  positionLabelContainer: {
    marginBottom: spacing.sm,
  },
  positionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lavender,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardImageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapIndicator: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tapText: {
    marginLeft: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  meaningSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  cardNameContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  cardName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  positionSubtext: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textLight,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: borderRadius.full,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  meaningContent: {
    paddingVertical: spacing.sm,
  },
  meaningText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  collapseText: {
    fontSize: 13,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
});
