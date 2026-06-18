/**
 * spreadStyles.ts
 *
 * Centralized styling for all modern spread layouts
 *
 * Single source of truth for:
 * - Keyword badges
 * - Meaning card containers
 * - Section labels
 * - Header styling
 * - Loading states
 * - Done buttons
 *
 * Changes here affect ALL spreads, CardRevealScreen, JournalScreen, etc.
 */

import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, borderRadius } from './colors';

export const spreadStyles = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────
  // KEYWORD BADGES
  // ─────────────────────────────────────────────────────────────────────
  // Used by: ModernSpreadLayout, CardRevealScreen, JournalScreen, etc.
  // Change here → affects all keyword displays globally

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

  keywordBadgeText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },

  // ─────────────────────────────────────────────────────────────────────
  // MEANING CARDS
  // ─────────────────────────────────────────────────────────────────────
  // Container for each meaning section (Mysl, Tělo, Duše)
  // Used by: ModernSpreadLayout, moon spread renderer, future spreads

  meaningCard: {
    backgroundColor: 'rgba(20, 15, 25, 0.7)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.md,
    marginHorizontal: spacing.sm,
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

  meaningTextSpacing: {
    marginTop: 16,
  },

  // ─────────────────────────────────────────────────────────────────────
  // HEADER STYLING
  // ─────────────────────────────────────────────────────────────────────
  // Used by: ModernSpreadLayout header, spread titles

  headerContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
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

  // ─────────────────────────────────────────────────────────────────────
  // LOADING STATES
  // ─────────────────────────────────────────────────────────────────────

  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: 'rgba(255,255,255,0.4)',
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

  // ─────────────────────────────────────────────────────────────────────
  // BUTTONS
  // ─────────────────────────────────────────────────────────────────────

  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(139, 123, 168, 0.25)',
    borderRadius: 24,
    marginTop: 20,
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

  // ─────────────────────────────────────────────────────────────────────
  // UTILITY STYLES
  // ─────────────────────────────────────────────────────────────────────

  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

/**
 * USAGE GUIDE
 *
 * In any component, import and use:
 *
 * import { spreadStyles } from '../theme/spreadStyles';
 *
 * Then reference styles:
 *
 * <View style={spreadStyles.meaningCard}>
 *   <Text style={spreadStyles.meaningLabel}>Mysl</Text>
 *   <View style={spreadStyles.meaningDivider} />
 *   <Text style={spreadStyles.meaningText}>Content...</Text>
 * </View>
 *
 * To change ALL keyword badges globally, edit:
 * spreadStyles.keywordBadge { backgroundColor: '...' }
 *
 * The change automatically affects:
 * ✅ ModernSpreadLayout keywords
 * ✅ CardRevealScreen keywords
 * ✅ JournalScreen keywords
 * ✅ Moon spread keywords
 * ✅ All future spreads
 */
