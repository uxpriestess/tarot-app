/**
 * ModernSpreadLayout
 *
 * Universal component for modern spread layouts (body_mind_spirit, moon_phase, future spreads)
 *
 * Features:
 * - Single-scroll architecture (no competing scroll areas)
 * - Flexible card grid (1 card or 3 cards horizontal)
 * - Keyword pills below each card
 * - Meaning containers with progressive animations
 * - Loading states (global + per-section)
 * - Fetch-on-flip strategy support
 * - Accessible, reusable, extensible
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { TarotCard } from '../types/tarot';
import { CardImage } from './CardImage';
import { ReadingSection } from '../services/universe';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────

interface DrawnCard {
  card: TarotCard;
  position: 'upright' | 'reversed';
}

export interface ModernSpreadLayoutProps {
  mode: 'body_mind_spirit' | 'moon_phase' | string;
  cards: DrawnCard[];
  meanings: ReadingSection[];
  flippedCards: number[];
  isLoading: boolean;
  loadingIndices?: number[];
  labels: string[];
  onCardFlip: (idx: number) => void;
  onDone: () => void;
  headerTitle?: string;
  headerSubtitle?: string;
  showKeywords?: boolean;
  showPositionBadge?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// CARD DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────

// Single card (moon spread, etc.)
const SINGLE_CARD_WIDTH = Math.round(width * 0.75);
const SINGLE_CARD_HEIGHT = Math.round(SINGLE_CARD_WIDTH * 1.5);

// Multi-card (body spread: 3 cards in row)
const MULTI_CARD_COUNT = 3;
const MULTI_CARD_WIDTH = Math.round((width - spacing.lg * 2 - spacing.sm * (MULTI_CARD_COUNT - 1)) / MULTI_CARD_COUNT);
const MULTI_CARD_HEIGHT = Math.round(MULTI_CARD_WIDTH * 1.5);

// ─────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export function ModernSpreadLayout({
  mode,
  cards,
  meanings,
  flippedCards,
  isLoading,
  loadingIndices = [],
  labels,
  onCardFlip,
  onDone,
  headerTitle,
  headerSubtitle,
  showKeywords = true,
  showPositionBadge = false,
}: ModernSpreadLayoutProps) {
  const isSingleCard = cards.length === 1;
  const cardWidth = isSingleCard ? SINGLE_CARD_WIDTH : MULTI_CARD_WIDTH;
  const cardHeight = isSingleCard ? SINGLE_CARD_HEIGHT : MULTI_CARD_HEIGHT;

  // Animation refs for meanings (one per card)
  const meaningFadeAnims = useRef(cards.map(() => new Animated.Value(0))).current;
  const meaningSlideAnims = useRef(cards.map(() => new Animated.Value(30))).current;

  // Animate in meaning when it appears
  useEffect(() => {
    flippedCards.forEach((idx) => {
      if (meanings[idx] && !loadingIndices.includes(idx)) {
        // Animate this meaning in
        Animated.parallel([
          Animated.timing(meaningFadeAnims[idx], {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(meaningSlideAnims[idx], {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [flippedCards, meanings, loadingIndices]);

  // Show done button when all cards flipped and all meanings loaded
  const allFlipped = flippedCards.length === cards.length;
  const allMeaningsLoaded = meanings.length === cards.length && loadingIndices.length === 0;
  const showDoneButton = allFlipped && allMeaningsLoaded && !isLoading;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ── Header ── */}
        {headerTitle && (
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            {headerSubtitle && (
              <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
            )}
          </View>
        )}

        {/* ── Cards Section ── */}
        <View style={styles.cardsSection}>
          {isSingleCard ? (
            // Single card layout
            <View style={styles.singleCardContainer}>
              <CardDisplay
                card={cards[0]}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                label={labels[0]}
                isFlipped={flippedCards.includes(0)}
                onFlip={() => onCardFlip(0)}
                showPositionBadge={showPositionBadge}
              />
              {showKeywords && cards[0].card.keywords && (
                <KeywordPills keywords={cards[0].card.keywords} />
              )}
            </View>
          ) : (
            // Multi-card horizontal layout
            <View style={styles.cardsRow}>
              {cards.map((card, idx) => (
                <View key={idx} style={styles.cardCol}>
                  <CardDisplay
                    card={card}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    label={labels[idx]}
                    isFlipped={flippedCards.includes(idx)}
                    onFlip={() => onCardFlip(idx)}
                    showPositionBadge={showPositionBadge}
                  />
                  {showKeywords && card.card.keywords && (
                    <KeywordPills keywords={card.card.keywords} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Meanings Section ── */}
        <View style={styles.meaningsSection}>
          {/* Global loading state (first load) */}
          {isLoading && meanings.length === 0 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.lavender} />
              <Text style={styles.loadingText}>Připravuji výklad...</Text>
            </View>
          )}

          {/* Meanings for flipped cards */}
          {flippedCards.map((cardIdx) => {
            const section = meanings[cardIdx];
            if (!section) return null;

            const isLoadingThisCard = loadingIndices.includes(cardIdx);

            return (
              <Animated.View
                key={cardIdx}
                style={[
                  styles.meaningCard,
                  {
                    opacity: meaningFadeAnims[cardIdx],
                    transform: [{ translateY: meaningSlideAnims[cardIdx] }],
                  },
                ]}
              >
                {/* Section label */}
                {section.label && (
                  <Text style={styles.meaningLabel}>{section.label}</Text>
                )}

                {/* Loading state or content */}
                {isLoadingThisCard ? (
                  <View style={styles.sectionLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.lavender} />
                    <Text style={styles.sectionLoadingText}>Čekám na odpověď...</Text>
                  </View>
                ) : (
                  <>
                    {/* Divider (optional, nice visual separator) */}
                    {section.label && <View style={styles.meaningDivider} />}

                    {/* Meaning text */}
                    <Text style={styles.meaningText}>{section.text}</Text>
                  </>
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* ── Done Button ── */}
        {showDoneButton && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onDone}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.lavender} />
            <Text style={styles.doneButtonText}>Zavřít výklad</Text>
          </TouchableOpacity>
        )}

        {/* ── Soft ending (padding at bottom) ── */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CARD DISPLAY SUB-COMPONENT
// ─────────────────────────────────────────────────────────────────────────

interface CardDisplayProps {
  card: DrawnCard;
  cardWidth: number;
  cardHeight: number;
  label: string;
  isFlipped: boolean;
  onFlip: () => void;
  showPositionBadge: boolean;
}

function CardDisplay({
  card,
  cardWidth,
  cardHeight,
  label,
  isFlipped,
  onFlip,
  showPositionBadge,
}: CardDisplayProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.7)).current;

  // Flip animation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isFlipped ? 1 : 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [isFlipped]);

  // Pulse animation (when not flipped yet)
  useEffect(() => {
    if (!isFlipped) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
    }
  }, [isFlipped]);

  // Glow animation (when not flipped)
  useEffect(() => {
    if (!isFlipped) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isFlipped]);

  const frontInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const scaleTransform = pulseAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [1, 1.03],
  });

  return (
    <View style={styles.cardWrapper}>
      {/* Label above card */}
      {label && (
        <Text style={styles.cardLabel}>{label}</Text>
      )}

      {/* Card touchable with flip animation */}
      <TouchableOpacity
        onPress={onFlip}
        activeOpacity={0.9}
        style={{
          width: cardWidth,
          height: cardHeight,
        }}
      >
        {/* Front (back of card) */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              width: cardWidth,
              height: cardHeight,
              transform: [{ rotateY: frontInterpolate }, { scale: scaleTransform }],
            },
          ]}
        >
          <View style={styles.cardBackInner}>
            <Ionicons name="sparkles" size={32} color={colors.lavender} />
            <Text style={styles.cardBackPrompt}>Tap to reveal</Text>
          </View>
        </Animated.View>

        {/* Back (front of card) */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardFront,
            {
              width: cardWidth,
              height: cardHeight,
              transform: [{ rotateY: backInterpolate }],
              backgroundColor: `rgba(0,0,0,${0.1 + (1 - glowAnim)})`,
            },
          ]}
        >
          <CardImage
            imageName={card.card.imageName}
            width={cardWidth - 4}
            height={cardHeight - 4}
          />

          {/* Reversed badge if needed */}
          {card.position === 'reversed' && (
            <View style={styles.reversedBadge}>
              <Text style={styles.reversedText}>Obrácená</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Position badge (optional) */}
      {showPositionBadge && (
        <View style={styles.positionBadge}>
          <Ionicons
            name={card.position === 'upright' ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={14}
            color={card.position === 'upright' ? colors.sage : colors.bronze}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.positionBadgeText}>
            {card.position === 'upright' ? 'Vzpřímená' : 'Obrácená'}
          </Text>
        </View>
      )}

      {/* Card name below */}
      <Text style={styles.cardName}>{card.card.nameCzech}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// KEYWORD PILLS SUB-COMPONENT
// ─────────────────────────────────────────────────────────────────────────

interface KeywordPillsProps {
  keywords: string[];
}

function KeywordPills({ keywords }: KeywordPillsProps) {
  return (
    <View style={styles.keywordsContainer}>
      {keywords.map((keyword, idx) => (
        <View key={idx} style={styles.keywordPill}>
          <Text style={styles.keywordText}>{keyword}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
  },

  // ── Header ──
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },

  // ── Cards Section ──
  cardsSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  singleCardContainer: {
    alignItems: 'center',
    width: '100%',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  cardCol: {
    alignItems: 'center',
    flex: 1,
  },
  cardWrapper: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    textAlign: 'center',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  cardFace: {
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  cardBack: {
    position: 'absolute',
    backgroundColor: '#1a1420',
    borderColor: '#8B7BA8',
    borderWidth: 2,
  },
  cardBackInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 123, 168, 0.4)',
    backgroundColor: '#0F0F0F',
  },
  cardBackPrompt: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  cardFront: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reversedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reversedText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '500',
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: spacing.sm,
  },
  positionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },

  // ── Keywords ──
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  keywordPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  keywordText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '500',
  },

  // ── Meanings Section ──
  meaningsSection: {
    marginTop: spacing.lg,
  },
  meaningCard: {
    backgroundColor: 'rgba(20, 15, 25, 0.7)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(150, 130, 200, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  meaningLabel: {
    fontSize: 11,
    color: 'rgba(201, 184, 212, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '600',
  },
  meaningDivider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(150, 130, 200, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  meaningText: {
    fontSize: 16,
    lineHeight: 25,
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'left',
    fontWeight: '400',
  },

  // ── Loading States ──
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  sectionLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  sectionLoadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontStyle: 'italic',
  },

  // ── Done Button ──
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(139, 123, 168, 0.25)',
    borderRadius: 24,
    marginTop: 20,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 184, 212, 0.4)',
  },
  doneButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 0.5,
  },
});
