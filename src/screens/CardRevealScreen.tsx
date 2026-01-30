import { RevealableCard } from '../components/RevealableCard';
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
const CARD_WIDTH = Math.round(width * 0.85);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.5);

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
  const [isRevealed, setIsRevealed] = useState(false);
  const [localNote, setLocalNote] = useState(note || '');
  const [showContent, setShowContent] = useState(false);

  // Sync local note if prop changes
  useEffect(() => {
    setLocalNote(note || '');
  }, [note]);

  const handleNoteChange = (text: string) => {
    setLocalNote(text);
    onUpdateNote?.(text);
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  // Auto-reveal animation sequence
  useEffect(() => {
    // Delay before auto-revealing (dramatic pause)
    const revealTimer = setTimeout(() => {
      setIsRevealed(true);

      // After card reveals, show the content section
      setTimeout(() => {
        setShowContent(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(slideUp, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600); // Wait for card expansion to complete
    }, isJournalMode ? 0 : 1000); // Instant in journal mode, delayed otherwise

    return () => clearTimeout(revealTimer);
  }, [isJournalMode]);

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
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Card Section - Now using RevealableCard */}
        <View style={styles.cardSection}>
          <RevealableCard
            card={card}
            position={position === 'upright' ? 'Vzpřímená' : 'Obrácená'}
            isRevealed={isRevealed}
            onToggleReveal={() => { }} // No manual toggle - auto-reveals
            aiMeaning={aiMeaning} // Don't fallback to static meaning
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_HEIGHT}
            showPosition={true}
            disabled={false}
          />

          {/* Keywords - show after card reveals */}
          {showContent && (
            <Animated.View
              style={[
                styles.keywordsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideUp }],
                },
              ]}
            >
              {card.keywords.map((keyword, index) => (
                <View key={index} style={styles.keywordBadge}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Additional Content Section */}
        {showContent && (
          <Animated.View
            style={[
              styles.contentSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUp }],
              },
            ]}
          >
            {/* Notes Section */}
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

            {/* Save Button (only if onSaveReading provided) */}
            {onSaveReading && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={onSaveReading}
                activeOpacity={0.8}
              >
                <Ionicons name="bookmark-outline" size={20} color="#fff" style={{ marginRight: spacing.xs }} />
                <Text style={styles.saveButtonText}>Uložit výklad</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  contentSection: {
    width: '100%',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  keywordBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: spacing.md,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 0.5,
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
});
