/**
 * types/spreads.ts
 *
 * Defines the SpreadTemplate system for routing and configuring all spread layouts
 *
 * This is the single source of truth for:
 * - Which spreads use modern vs legacy layout
 * - Which reading mode each spread uses
 * - Fetch strategy (pre-fetch vs on-flip)
 * - Visual customization (header, keywords, badges)
 *
 * Benefits:
 * - Easy to migrate spreads from legacy to modern
 * - Automatic routing based on layout mode
 * - Future spreads require only adding a template
 * - Configuration-driven, not code-scattered
 */

import { ReadingMode } from './tarot';

export type SpreadLayoutMode = 'modern' | 'legacy';
export type FetchStrategy = 'pre' | 'on-flip';
export type SpreadId = 'love' | 'finance' | 'body' | 'moon' | 'decision' | 'week';

/**
 * SpreadTemplate defines everything about a spread's behavior and appearance
 *
 * Properties:
 * - id: Unique identifier (matches SPREADS array id)
 * - name: User-facing name
 * - layout: 'modern' (uses ModernSpreadLayout) or 'legacy' (old absolute positioning)
 * - cardCount: How many cards drawn for this spread
 * - labels: Labels for each card position
 * - fetchStrategy: 'pre' (fetch all meanings upfront) or 'on-flip' (fetch as user flips)
 * - mode: Which reading mode backend uses (body_mind_spirit, moon_phase, etc)
 * - headerSubtitle: Optional subtitle below spread name
 * - keywords: Show keyword pills below each card?
 * - positionBadge: Show upright/reversed badge?
 * - icon: Optional emoji icon for visual branding
 */
export interface SpreadTemplate {
  id: SpreadId;
  name: string;
  layout: SpreadLayoutMode;
  cardCount: number;
  labels: string[];
  fetchStrategy: FetchStrategy;
  mode: ReadingMode;
  headerSubtitle?: string;
  keywords?: boolean;
  positionBadge?: boolean;
  icon?: string;
}

/**
 * SPREAD TEMPLATES
 *
 * Modern spreads: Use ModernSpreadLayout component
 * Legacy spreads: Use old renderReading() logic (will be refactored later)
 */
export const SPREAD_TEMPLATES: Record<SpreadId, SpreadTemplate> = {
  // ─────────────────────────────────────────────────────────────────────
  // MODERN SPREADS (use ModernSpreadLayout)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Body Mind Spirit - 3 card introspection spread
   * Reads: Mind, Body, Spirit aspects of current situation
   * Fetch: On-flip (for paced, intentional UX)
   * Keywords: Yes (help contextualize each card)
   */
  body: {
    id: 'body',
    name: 'Mysl, tělo a duše',
    layout: 'modern',
    cardCount: 3,
    labels: ['Mysl', 'Tělo', 'Duše'],
    fetchStrategy: 'on-flip',
    mode: 'body_mind_spirit',
    headerSubtitle: 'Ponořte se do třívrstvého pohledu',
    keywords: true,
    positionBadge: true,
    icon: '🌿',
  },

  /**
   * Moon Phase - 1 card reading aligned with lunar energy
   * Reads: Single card through lens of current moon phase
   * Fetch: Pre (moon phase is known, no need to wait)
   * Keywords: Yes
   * PositionBadge: No (would clutter single-card display)
   */
  moon: {
    id: 'moon',
    name: 'Měsíční fáze',
    layout: 'modern',
    cardCount: 1,
    labels: [],
    fetchStrategy: 'pre',
    mode: 'moon_phase',
    headerSubtitle: 'Energetická zpráva luny',
    keywords: true,
    positionBadge: false,
    icon: '🌙',
  },

  // ─────────────────────────────────────────────────────────────────────
  // LEGACY SPREADS (will be modernized later)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Love 3-Card - Relationship reading (YOU, PARTNER, RELATIONSHIP)
   * Status: LEGACY
   * TODO: Migrate to modern layout (special handling needed for JSON parsing)
   * Note: Current backend returns structured JSON response
   */
  love: {
    id: 'love',
    name: 'Láska a vztahy',
    layout: 'legacy',
    cardCount: 3,
    labels: ['Ty', 'Partner', 'Tvůj vztah'],
    fetchStrategy: 'pre',
    mode: 'love_3_card',
    keywords: false,
    positionBadge: false,
  },

  /**
   * Finance - 3 card money/resources reading
   * Status: LEGACY
   * TODO: Consider modernizing
   */
  finance: {
    id: 'finance',
    name: 'Finance',
    layout: 'legacy',
    cardCount: 3,
    labels: ['Dnes', 'Výzva', 'Výsledek'],
    fetchStrategy: 'pre',
    mode: 'reading-screen',
    keywords: false,
    positionBadge: false,
  },

  /**
   * Decision - 2 paths / 3 card reading
   * Status: LEGACY
   * TODO: Consider modernizing
   */
  decision: {
    id: 'decision',
    name: 'Rozhodnutí',
    layout: 'legacy',
    cardCount: 3,
    labels: ['Cesta A', 'Cesta B', 'Rada'],
    fetchStrategy: 'pre',
    mode: 'reading-screen',
    keywords: false,
    positionBadge: false,
  },

  /**
   * Week - 7 day spread
   * Status: LEGACY
   * TODO: Consider modernizing (might benefit from modern layout)
   */
  week: {
    id: 'week',
    name: '7 dní',
    layout: 'legacy',
    cardCount: 7,
    labels: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
    fetchStrategy: 'pre',
    mode: 'reading-screen',
    keywords: false,
    positionBadge: false,
  },
};

/**
 * UTILITY FUNCTIONS
 */

/**
 * Get a spread template by ID
 * @param id Spread ID
 * @returns SpreadTemplate or undefined
 */
export function getSpreadTemplate(id: SpreadId): SpreadTemplate | undefined {
  return SPREAD_TEMPLATES[id];
}

/**
 * Check if a spread uses modern layout
 * @param id Spread ID
 * @returns true if spread uses ModernSpreadLayout
 */
export function isModernSpread(id: SpreadId): boolean {
  const template = getSpreadTemplate(id);
  return template?.layout === 'modern';
}

/**
 * Check if a spread uses legacy layout
 * @param id Spread ID
 * @returns true if spread uses old layout
 */
export function isLegacySpread(id: SpreadId): boolean {
  const template = getSpreadTemplate(id);
  return template?.layout === 'legacy';
}

/**
 * Get all modern spreads (for listing in future)
 * @returns Array of modern spread templates
 */
export function getModernSpreads(): SpreadTemplate[] {
  return Object.values(SPREAD_TEMPLATES).filter((t) => t.layout === 'modern');
}

/**
 * Get all legacy spreads (for migration tracking)
 * @returns Array of legacy spread templates
 */
export function getLegacySpreads(): SpreadTemplate[] {
  return Object.values(SPREAD_TEMPLATES).filter((t) => t.layout === 'legacy');
}

/**
 * MIGRATION NOTES
 *
 * Current Status (June 2026):
 * - Modern: body, moon (2 spreads)
 * - Legacy: love, finance, decision, week (4 spreads)
 *
 * Migration Roadmap:
 * 1. Body Mind Spirit - DONE (modernized with new layout)
 * 2. Moon Phase - DONE (already modern)
 * 3. Love - READY FOR MIGRATION (just need to adapt JSON parsing to ModernSpreadLayout)
 * 4. Finance - COULD MODERNIZE (3 cards horizontal would work well)
 * 5. Decision - COULD MODERNIZE (Cesta A/B/Rada as 3-card horizontal)
 * 6. Week - NEEDS DESIGN (7 cards, might need special grid layout)
 *
 * To modernize a spread:
 * 1. Change layout: 'legacy' → 'modern'
 * 2. (Optional) Update labels/subtitle for better presentation
 * 3. Test with ModernSpreadLayout component
 * 4. Remove old renderXxxReading() function
 */
