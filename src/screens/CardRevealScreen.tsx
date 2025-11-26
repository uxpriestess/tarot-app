import { CardImage } from '../components/CardImage';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { TarotCard } from '../types/tarot';

interface CardRevealScreenProps {
  card: TarotCard;
  position: 'upright' | 'reversed';
  onClose: () => void;
  onSaveReading?: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.round(width * 0.9);
const CARD_PADDING = 12;
const INNER_WIDTH = CARD_WIDTH - (CARD_PADDING * 2);
// Image is 1040x1384 (ratio ~1.33)
const IMAGE_RATIO = 1384 / 1040;
const IMAGE_HEIGHT = Math.round(INNER_WIDTH * IMAGE_RATIO);
// Card height is now just image + padding (no text area)
const CARD_HEIGHT = IMAGE_HEIGHT + (CARD_PADDING * 2);

export function CardRevealScreen({
  card,
  position,
  onClose,
  onSaveReading,
}: CardRevealScreenProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Animation values
  const flipAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start flip animation after a short delay
    setTimeout(() => {
      Animated.sequence([
        // Flip the card
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Fade in content
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(slideUp, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setIsRevealed(true);
      });
    }, 500);
  }, []);

  // Interpolate flip animation
  const flipRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const meaning = position === 'upright' ? card.meaningUpright : (card.meaningReversed || card.meaningUpright);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>

        {/* Card container */}
        <View style={styles.cardSection}>
          <Animated.View
            style={[
              styles.cardContainer,
              {
                transform: [{ rotateY: flipRotation }],
              },
            ]}
          >
            {/* Card Back (initial state) */}
            <Animated.View
              style={[
                styles.cardFace,
                styles.cardBack,
                { opacity: frontOpacity },
              ]}
            >
              <View style={styles.cardBackBorder}>
                <View style={styles.cardBackCenter}>
                  <Ionicons
                    name="sparkles-outline"
                    size={60}
                    color={colors.lavender}
                    style={{ opacity: 0.6 }}
                  />
                  <View style={styles.cardDots}>
                    <View style={[styles.dot, { backgroundColor: colors.bronze }]} />
                    <View style={[styles.dot, { backgroundColor: colors.sage }]} />
                    <View style={[styles.dot, { backgroundColor: colors.rose }]} />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Card Front (revealed state) */}
            <Animated.View
              style={[
                styles.cardFace,
                styles.cardFront,
                {
                  opacity: backOpacity,
                  backgroundColor: colors.softLinen,
                  transform: [{ rotateY: '180deg' }],
                },
              ]}
            >
              {/* Card image - fills the space */}
              <View style={styles.cardImagePlaceholder}>
                <CardImage
                  imageName={card.imageName}
                  width={INNER_WIDTH}
                  height={IMAGE_HEIGHT}
                />
              </View>
            </Animated.View>
          </Animated.View>

          {/* Card Name - Now outside the 3D card */}
          {isRevealed && (
            <Animated.View style={{ opacity: contentOpacity, alignItems: 'center', marginTop: 20 }}>
              <Text style={styles.cardName}>{card.nameCzech}</Text>
            </Animated.View>
          )}

          {/* Position indicator */}
          {isRevealed && (
            <Animated.View
              style={[
                styles.positionBadge,
                { opacity: contentOpacity },
              ]}
            >
              <Ionicons
                name={position === 'upright' ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={16}
                color={position === 'upright' ? colors.sage : colors.bronze}
              />
              <Text style={styles.positionText}>
                {position === 'upright' ? 'Vzpřímená' : 'Obrácená'}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Content section */}
        <Animated.View
          style={[
            styles.contentSection,
            {
              opacity: contentOpacity,
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          {/* Keywords */}
          <View style={styles.keywordsContainer}>
            {card.keywords.map((keyword, index) => (
              <View key={index} style={styles.keywordBadge}>
                <Text style={styles.keywordText}>{keyword}</Text>
              </View>
            ))}
          </View>

          {/* Meaning */}
          <View style={styles.meaningContainer}>
            <Text style={styles.meaningText}>{meaning}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {onSaveReading && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={onSaveReading}
                activeOpacity={0.8}
              >
                <Ionicons name="bookmark-outline" size={20} color={colors.text} />
                <Text style={styles.saveButtonText}>Uložit výklad</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Hotovo</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
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
  cardSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: spacing.xl,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBack: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardBackBorder: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.softLinen,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  cardBackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  cardFront: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: CARD_PADDING,
  },
  cardImagePlaceholder: {
    width: INNER_WIDTH,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  cardName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.softLinen,
  },
  positionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  contentSection: {
    width: '100%',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  keywordBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.softLinen,
    borderRadius: borderRadius.full,
  },
  keywordText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  meaningContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.softLinen,
    marginBottom: spacing.lg,
  },
  meaningText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.softLinen,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  doneButton: {
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.text,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});