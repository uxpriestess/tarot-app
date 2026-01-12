import { CardImage } from '../components/CardImage';
import { ImmersiveScreen } from '../components/ImmersiveScreen';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme/colors';
import { TarotCard } from '../types/tarot';

interface CardRevealScreenProps {
  card: TarotCard;
  position: 'upright' | 'reversed';
  aiMeaning?: string;
  onClose: () => void;
  onSaveReading?: () => void;
  note?: string;
  onUpdateNote?: (text: string) => void;
  isJournalMode?: boolean;
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
  aiMeaning,
  onClose,
  onSaveReading,
  note,
  onUpdateNote,
  isJournalMode = false,
}: CardRevealScreenProps) {
  const [isRevealed, setIsRevealed] = useState(isJournalMode); // Auto-reveal in journal mode
  const [localNote, setLocalNote] = useState(note || '');

  // Sync local note if prop changes
  useEffect(() => {
    setLocalNote(note || '');
  }, [note]);

  const handleNoteChange = (text: string) => {
    setLocalNote(text);
    onUpdateNote?.(text);
  };

  // Animation values
  const flipAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const liftAnim = useRef(new Animated.Value(0)).current; // 0 to 1
  const aiOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start lift and flip animation quickly
    Animated.sequence([
      // 1. Lift the card slightly
      Animated.timing(liftAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 2. Flip the card
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      // 3. Fade in content
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
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
  }, []);

  // Fade in AI meaning when it arrives
  useEffect(() => {
    if (aiMeaning) {
      Animated.timing(aiOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [aiMeaning]);

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
    <View style={styles.modalOverlay}>
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
          <Ionicons name="close" size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* Card container */}
        <View style={styles.cardSection}>
          <Animated.View
            style={[
              styles.cardContainer,
              {
                transform: [
                  { rotateY: flipRotation },
                  { scale: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                  { translateY: liftAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }
                ],
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
              <View style={styles.cardBackInner}>
                <Ionicons
                  name="sunny-outline"
                  size={80}
                  color="rgba(255,255,255,0.4)"
                />
              </View>
            </Animated.View>

            {/* Card Front (revealed state) */}
            <Animated.View
              style={[
                styles.cardFace,
                styles.cardFront,
                {
                  opacity: backOpacity,
                  backgroundColor: colors.surface,
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
                color={colors.surface}
                style={{ marginRight: spacing.xs }}
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
            {!aiMeaning && !isJournalMode ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.lavender} size="small" />
                <Text style={styles.loadingText}>Vesmír skládá tvůj příběh...</Text>
              </View>
            ) : (
              <Animated.Text style={[styles.meaningText, { opacity: isJournalMode ? 1 : aiOpacity }]}>
                {aiMeaning || meaning}
              </Animated.Text>
            )}
          </View>

          {/* Notes Section (Journal Mode) */}
          {(isJournalMode || onUpdateNote) && (
            <View style={styles.noteContainer}>
              <Text style={styles.sectionTitle}>Tvé poznámky</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Sem si napiš své myšlenky..."
                placeholderTextColor={colors.textLight}
                multiline
                value={localNote}
                onChangeText={handleNoteChange}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {onSaveReading && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={onSaveReading}
                activeOpacity={0.8}
              >
                <Ionicons name="bookmark-outline" size={20} color={colors.surface} style={{ marginRight: spacing.xs }} />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', // Semi-transparent overlay
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 10,
  },
  cardSection: {
    alignItems: 'center',
    marginTop: 20,
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
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBack: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  cardBackInner: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cardDots: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.8,
    marginRight: spacing.sm,
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
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    marginTop: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  contentSection: {
    width: '100%',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  keywordBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassy badges
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  keywordText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  meaningContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker glass for readability
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.lg,
  },
  meaningText: {
    fontSize: 17,
    lineHeight: 28,
    color: 'rgba(255, 255, 255, 0.95)', // High contrast white
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    textAlign: 'center',
    fontWeight: '400',
  },
  actionsContainer: {
    // gap removed
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: spacing.sm,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 0.5,
  },
  doneButton: {
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassy
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff', // White text
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 1,
  },
  noteContainer: {
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
});