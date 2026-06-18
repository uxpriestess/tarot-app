# 🌿 BODY MIND SPIRIT REDESIGN — MASTER PLAN v2.0

**Status**: Active Implementation  
**Created**: June 10, 2026  
**Phase**: 1A-4.3 (Full Design System Implementation)  
**Total Scope**: 7-9 hours  

---

## 🎯 EXECUTIVE SUMMARY

**Problem**: Body Mind Spirit reading has broken layout (meanings scroll off-screen), uses old card design, no visual cohesion with rest of app.

**Solution**: 
- Immediate fix (Phases 1-3): Create modern reusable component system
- Long-term fix (Phase 4 concurrent): Establish design system shared across all card displays
- Result: Body reading works beautifully, other spreads benefit, future spreads trivial to add

**Key Decisions Made**:
- ✅ Pre-fetch strategy: **Fetch-on-flip** (with async pre-fetch optimization)
- ✅ Card layout: **1 card for single-card readings, 3 cards horizontal for multi-card**
- ✅ Design system timing: **Phase 4 concurrent** with phases 1-3 (not retrofit)

---

## 📐 DESIGN PATTERNS REFERENCE

### Pattern 1: Single-Card Reads (Daily, Tomorrow, Custom Question)
- **Layout**: 1 card centered
- **Below card**: Keywords as pills
- **Below keywords**: Meaning text in styled container
- **Example**: CardRevealScreen, JournalScreen detail view

### Pattern 2: Multi-Card Reads (Body, Moon, Future Spreads)
- **Layout**: Cards in flexible grid (3 columns for body, 1 for moon)
- **Below each card**: Keywords as pills
- **Below keywords**: Meaning container with label + text
- **Navigation**: Single ScrollView (no competing scroll areas)
- **Example**: Moon spread (already modern), Body spread (being redesigned)

### Pattern 3: Old Multi-Card (No Longer Used for New Spreads)
- ❌ Absolute positioning in fixed-height container
- ❌ Meanings in separate scroll area below
- ❌ Hard to see all content
- **Used by**: Finance, Decision, Week spreads (legacy)

---

## 📋 DETAILED PHASES

### PHASE 1A: Create ModernSpreadLayout Component ⚙️

**File**: `src/components/ModernSpreadLayout.tsx` (NEW)  
**Time**: 1-1.5 hours  
**Priority**: CRITICAL (foundation for everything else)

**Component Signature**:
```tsx
interface ModernSpreadLayoutProps {
  mode: 'body_mind_spirit' | 'moon_phase' | string;  // Reading type
  cards: DrawnCard[];                                  // Cards drawn
  meanings: ReadingSection[];                          // Backend-parsed meanings
  flippedCards: number[];                              // Which card indices are flipped
  isLoading: boolean;                                  // Global loading state
  loadingIndices?: number[];                           // Per-card loading indices
  labels: string[];                                    // Card labels (Mysl, Tělo, etc)
  onCardFlip: (idx: number) => void;                  // Called when card tapped
  onDone: () => void;                                 // Called when done button pressed
  headerTitle?: string;                               // e.g. "Mysl, tělo a duše"
  headerSubtitle?: string;                            // e.g. "Ponořte se..."
  showKeywords?: boolean;                             // Show keyword pills
  showPositionBadge?: boolean;                        // Show upright/reversed
}

export function ModernSpreadLayout(props: ModernSpreadLayoutProps) {
  // Implementation
}
```

**Key Features**:
- ✅ Single ScrollView with `flexGrow: 1` (no competing scroll areas)
- ✅ Flexible card grid (detects 1 vs 3 cards, layouts appropriately)
- ✅ Keywords auto-extracted from `card.keywords` array
- ✅ Keyword pills with consistent styling (from `spreadStyles.ts`)
- ✅ Meaning containers with label + text (from `spreadStyles.ts`)
- ✅ Loading spinners per section during fetch
- ✅ Progressive animations (fade + slide on reveal)
- ✅ Done button (shows when all cards flipped + all meanings loaded)
- ✅ Handles both pre-fetch and on-flip strategies

**Styling Dependencies**:
- Uses `spreadStyles.keywordBadge`
- Uses `spreadStyles.meaningCard`
- Uses `spreadStyles.meaningLabel`
- Uses `spreadStyles.meaningText`
- Uses `spreadStyles.headerContainer`
- Uses `spreadStyles.doneButton`
- All defined in `spreadStyles.ts` (Phase 1B)

---

### PHASE 1B: Create Shared Styling Module 🎨

**File**: `src/theme/spreadStyles.ts` (NEW)  
**Time**: 30-45 minutes  
**Priority**: HIGH (blocks Phase 1C)

**Exports**:
```tsx
// Keyword badge styling (used by all spreads, CardReveal, Journal)
export const spreadStyles = StyleSheet.create({
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

  // Meaning card container (used by spreads)
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

  // Header styling
  headerContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Done button
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

  // Loading spinner
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
});
```

**Benefits**:
- Single source of truth for all spread styling
- Change color/font → affects all spreads automatically
- Shared between `ModernSpreadLayout`, `CardRevealScreen`, `JournalScreen`
- Centralized theme management

---

### PHASE 1C: Refactor TarotReadingScreen 🔧

**File**: `src/screens/TarotReadingScreen.tsx`  
**Time**: 1-1.5 hours  
**Priority**: HIGH

**Key Changes**:
1. Import `ModernSpreadLayout` and `spreadStyles`
2. Create `SPREAD_TEMPLATES` config (Phase 4.1 template, added here)
3. Remove old `renderMoonReading()` and `renderBodyReading()` functions
4. Replace with single `renderSpread()` that routes based on template
5. Keep old `renderReading()` for legacy spreads (finance, decision, week)

**New Code Structure**:
```tsx
// At top of file, after imports
import { ModernSpreadLayout } from '../components/ModernSpreadLayout';
import { spreadStyles } from '../theme/spreadStyles';

// Spread templates (moved from SPREADS array)
interface SpreadTemplate {
  id: SpreadId;
  name: string;
  cards: number;
  labels: string[];
  layout: 'modern' | 'legacy';
  mode: 'body_mind_spirit' | 'moon_phase' | 'love_3_card';
  fetchStrategy: 'pre' | 'on-flip';
  headerSubtitle?: string;
}

const MODERN_SPREADS: Record<string, SpreadTemplate> = {
  body: {
    id: 'body',
    name: 'Mysl, tělo a duše',
    cards: 3,
    labels: ['Mysl', 'Tělo', 'Duše'],
    layout: 'modern',
    mode: 'body_mind_spirit',
    fetchStrategy: 'on-flip',
    headerSubtitle: 'Ponořte se do třívrstvého pohledu',
  },
  moon: {
    id: 'moon',
    name: 'Měsíční fáze',
    cards: 1,
    labels: ['Vzkaz luny'],
    layout: 'modern',
    mode: 'moon_phase',
    fetchStrategy: 'pre',
    headerSubtitle: 'Energetická zpráva',
  },
};

// Helper: Determine if spread is modern
const isModernSpread = (spreadId: SpreadId): boolean => {
  return spreadId === 'body' || spreadId === 'moon';
};

// In renderReading():
const renderReading = () => {
  if (!selectedSpread) return null;

  // Modern spreads use new component
  if (isModernSpread(selectedSpread.id)) {
    const template = MODERN_SPREADS[selectedSpread.id];
    return (
      <ModernSpreadLayout
        mode={template.mode}
        cards={drawnCards}
        meanings={cardMeanings}
        flippedCards={flippedCards}
        isLoading={isLoadingMeanings}
        labels={template.labels}
        onCardFlip={flipCard}
        onDone={resetReading}
        headerTitle={template.name}
        headerSubtitle={template.headerSubtitle}
      />
    );
  }

  // Legacy spreads keep using old renderReading() logic
  return renderLegacySpread();
};
```

---

### PHASE 2A: Body Mind Spirit Special Theming 🎨

**File**: `src/screens/TarotReadingScreen.tsx` (body-specific)  
**Time**: 30-45 minutes

**What to Add**:
- [ ] Optional icons for each section: 🧠 Mysl, 💫 Tělo, 🌿 Duše
- [ ] Divider line below section labels (like moon spread)
- [ ] Subtle section color accents (optional, could be same for all)
- [ ] Body-specific font styling if desired

**Example Enhancement**:
```tsx
// In ModernSpreadLayout or TarotReadingScreen
const getSectionIcon = (mode: string, label: string): string => {
  if (mode === 'body_mind_spirit') {
    if (label === 'Mysl') return '🧠';
    if (label === 'Tělo') return '💫';
    if (label === 'Duše') return '🌿';
  }
  return '';
};

// In meaning card rendering:
<Text style={styles.meaningLabel}>
  {icon} {label}
</Text>
```

---

### PHASE 2B: Implement Fetch-on-Flip Logic 🔄

**File**: `src/screens/TarotReadingScreen.tsx`  
**Time**: 45-60 minutes

**Current Flow**:
```
startReading('body')
  → preFetchBodyMindSpirit() (fetches all 3)
  → meanings stored in cardMeanings state
  → renderMeanings() shows all (if flipped)
```

**New Flow**:
```
startReading('body')
  → preFetchBodyMindSpirit() (async, background)
  → User flips card[0]
    → If meaning ready: show with animation
    → If not ready: show spinner, use when available
  → Same for cards[1], [2]
  → If all ready before any flip: show instantly (still animated)
```

**Implementation**:
```tsx
// Track which sections are loading
const [loadingIndices, setLoadingIndices] = useState<number[]>([]);

const flipCard = (idx: number) => {
  setFlippedCards([...flippedCards, idx]);
  
  // If meaning exists, animate it in
  if (cardMeanings[idx]) {
    animateMeaningIn(idx);
  } else {
    // Mark as loading, will show when pre-fetch completes
    setLoadingIndices([...loadingIndices, idx]);
  }
};

// In pre-fetch, when meaning arrives
useEffect(() => {
  if (cardMeanings[idx] && loadingIndices.includes(idx)) {
    // Remove from loading, animate in
    setLoadingIndices(loadingIndices.filter(i => i !== idx));
    animateMeaningIn(idx);
  }
}, [cardMeanings]);
```

---

### PHASE 3: Polish & Navigation ✨

**File**: `src/screens/TarotReadingScreen.tsx`  
**Time**: 30 minutes

**Changes**:
- [ ] Done button shows when: `flippedCards.length === cardCount && !isLoadingMeanings`
- [ ] Done button calls `resetReading()` (return to spread selection)
- [ ] Test: Can close during reading without errors
- [ ] Test: Navigation flow (going back mid-reading)
- [ ] Verify animations are smooth on all devices

---

### PHASE 4.1: Define SpreadTemplate System 📋

**File**: `src/types/spreads.ts` (NEW)  
**Time**: 30 minutes  
**Priority**: HIGH (guides all other Phase 4 work)

**Content**:
```tsx
export type SpreadLayoutMode = 'modern' | 'legacy';
export type FetchStrategy = 'pre' | 'on-flip';
export type ReadingMode = 'body_mind_spirit' | 'moon_phase' | 'love_3_card' | 'daily' | 'tomorrow' | 'custom_question';

export interface SpreadTemplate {
  id: SpreadId;
  name: string;
  layout: SpreadLayoutMode;
  cardCount: number;
  labels: string[];
  fetchStrategy: FetchStrategy;
  mode: ReadingMode;
  headerSubtitle?: string;
  icon?: string;
  keywords?: boolean;  // Show keyword pills?
  positionBadge?: boolean;  // Show upright/reversed?
}

export const SPREAD_TEMPLATES: Record<SpreadId, SpreadTemplate> = {
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
  },
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
  },
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
  // ... other spreads
};
```

**Benefits**:
- Single config file for all spreads
- Easy to migrate spreads from legacy to modern
- Future spreads require only adding to this config
- Routing logic becomes: `const template = SPREAD_TEMPLATES[id]; use(template.layout)`

---

### PHASE 4.2: Create Unified Card Display Styles 🎨

**File**: `src/theme/cardDisplayStyles.ts` (NEW)  
**Time**: 45 minutes

**Exported Styles**:
```tsx
// Used by CardRevealScreen, JournalScreen detail, and ModernSpreadLayout
export const cardDisplayStyles = StyleSheet.create({
  // Card container
  cardContainer: { ... },
  cardImage: { ... },
  cardName: { ... },
  positionBadge: { ... },
  positionBadgeText: { ... },

  // Keywords (shared across all displays)
  keywordsContainer: { ... },
  keywordPill: { ... },
  keywordPillText: { ... },

  // Meaning section
  meaningContainer: { ... },
  meaningText: { ... },

  // Animations
  fadeAnimation: { ... },
  slideAnimation: { ... },
});
```

**Integration**:
- `CardRevealScreen` uses `cardDisplayStyles.keywordPill` instead of local `styles.keywordBadge`
- `JournalScreen` detail view uses same
- `ModernSpreadLayout` uses same
- All synchronized

---

### PHASE 4.3: Update CardRevealScreen & JournalScreen 🔗

**Files**: `src/screens/CardRevealScreen.tsx`, `src/screens/JournalScreen.tsx`  
**Time**: 1 hour

**Changes**:
1. Import `cardDisplayStyles` from theme
2. Replace local keyword styling with `cardDisplayStyles.keywordPill`
3. Replace meaning styling with `cardDisplayStyles.meaningContainer`
4. Remove duplicate style definitions
5. Test: Visuals still match (they should, styles are identical)

**Before**:
```tsx
// In CardRevealScreen.tsx
const styles = StyleSheet.create({
  keywordBadge: { ... },  // 🔴 Duplicate in JournalScreen
  meaningCard: { ... },   // 🔴 Similar in multiple places
});
```

**After**:
```tsx
// In CardRevealScreen.tsx
import { cardDisplayStyles } from '../theme/cardDisplayStyles';

// Use cardDisplayStyles.keywordPill instead of styles.keywordBadge
// All keyword styling synchronized across app
```

---

## 📊 IMPLEMENTATION ROADMAP

### Week 1 (June 10-14)

| Day | Phase | Task | Time | Blocker? |
|-----|-------|------|------|----------|
| Mon | 1A | Create `ModernSpreadLayout.tsx` | 1.5h | — |
| Tue | 1B | Create `spreadStyles.ts` | 0.75h | — |
| Tue | 4.1 | Define `SpreadTemplate` system | 0.5h | — |
| Wed | 1C | Refactor `TarotReadingScreen.tsx` | 1.5h | ← Needs 1A, 1B, 4.1 |
| Wed | 2A | Body theming (icons, dividers) | 0.75h | ← Needs 1C |
| Thu | 2B | Fetch-on-flip logic | 1h | ← Needs 1C |
| Thu | 3 | Polish & navigation testing | 0.5h | ← Needs 2B |
| Fri | 4.2 | Create `cardDisplayStyles.ts` | 0.75h | — |
| Fri | 4.3 | Update CardReveal + Journal | 1h | ← Needs 4.2 |

**Total**: ~8 hours across 5 days

### Week 2+ (Ongoing)
- Testing on actual devices
- Fine-tuning animations
- Documenting spread template system
- Planning next spread migrations (love → modern)

---

## ✅ SUCCESS CRITERIA

### Functional
- [ ] All 3 meanings visible without scrolling off-screen
- [ ] Cards render in horizontal row, not absolute positioned
- [ ] Keywords displayed below each card
- [ ] Loading spinners appear during fetch-on-flip
- [ ] Done button appears when reading complete
- [ ] Close button works at all times
- [ ] Navigation flow smooth (can go back, close, continue)

### Visual
- [ ] Matches moon spread's design language
- [ ] Header + subtitle themed for body spread
- [ ] Animations smooth (fade + slide on reveal)
- [ ] Spacing/padding consistent across spreads
- [ ] Typography matches app style

### System
- [ ] `ModernSpreadLayout` reusable for future spreads
- [ ] `SpreadTemplate` system documented
- [ ] CardReveal + Journal + Spreads use shared styling
- [ ] No duplicate styling code across files
- [ ] Easy to add new spread (just add template)

---

## 🎨 DESIGN FLEXIBILITY

**Key Principle**: All design decisions centralized in `spreadStyles.ts` and `cardDisplayStyles.ts`

### Easy to Change (Centralized)
✅ Colors (background, text, border, accent)  
✅ Fonts (family, size, weight)  
✅ Spacing (padding, margins, gaps)  
✅ Border radius (rounded corners)  
✅ Shadows (elevation, depth)  
✅ Animations (duration, easing, direction)  

**Example**: To change all keyword badges from lavender to rose:
```tsx
// In spreadStyles.ts, ONE place:
keywordBadge: {
  backgroundColor: 'rgba(255, 192, 203, 0.15)',  // ← Change once
  borderColor: 'rgba(240, 100, 100, 0.2)',      // ← Affects everywhere
}
```

### Hard to Change (Scattered)
❌ Component structure (layout, order)  
❌ Content (card names, labels)  
❌ API integration (reading mode, fetch strategy)  

---

## 📁 FILES MODIFIED / CREATED

| File | Type | Status |
|------|------|--------|
| `src/components/ModernSpreadLayout.tsx` | CREATE | Phase 1A |
| `src/theme/spreadStyles.ts` | CREATE | Phase 1B |
| `src/types/spreads.ts` | CREATE | Phase 4.1 |
| `src/theme/cardDisplayStyles.ts` | CREATE | Phase 4.2 |
| `src/screens/TarotReadingScreen.tsx` | MODIFY | Phase 1C, 2A, 2B, 3 |
| `src/screens/CardRevealScreen.tsx` | MODIFY | Phase 4.3 |
| `src/screens/JournalScreen.tsx` | MODIFY | Phase 4.3 |

**Total new code**: ~1200 lines (well-organized, reusable)  
**Deleted code**: ~400 lines (old patterns removed)  
**Net**: ~800 lines added (foundational infrastructure)

---

## 🚀 NEXT STEPS

**Ready to start Phase 1A?** I'll create:
1. `ModernSpreadLayout.tsx` (complete, tested structure)
2. Full component with animations, flexibility, and edge cases
3. Prop documentation
4. Integration notes for TarotReadingScreen

**Estimated**: 1.5 hours → foundational component complete

Then move to Phase 1B, 4.1, 1C in sequence.

---

## 📝 QUESTIONS & DECISIONS

| Question | Answer | Locked? |
|----------|--------|--------|
| Pre-fetch strategy | Fetch-on-flip (with async pre-fetch) | ✅ Yes |
| Card layout (multi) | 3 cards horizontal | ✅ Yes |
| Design system timing | Phase 4 concurrent | ✅ Yes |
| Keyboard font | Didot/serif (keep current) | 🔄 Ask user |
| Background colors | Keep current (dark purple) | 🔄 Ask user |
| Animation duration | 600ms default | 🔄 Ask user |

---

## 🎯 VISION AFTER COMPLETION

**After Phase 3** (Core redesign):
- Body Mind Spirit reading works perfectly
- Modern, polished, intentional design
- Ready to use

**After Phase 4** (Design system):
- CardReveal + Journal + Spreads aligned
- Easy to change design (one file, affects everywhere)
- Framework for future spreads
- App feels cohesive, not assembled
- **Tech debt eliminated**

**Next spreads** (Love, Finance, etc):
- Just add template
- Use `ModernSpreadLayout`
- Automatically follow pattern
- **No reinventing the wheel**

---

## 📞 SUPPORT & TROUBLESHOOTING

**If animations stutter**:
- Check `useNativeDriver: true` on all Animated operations
- Verify no heavy state updates during animation

**If styling doesn't apply**:
- Confirm import: `import { spreadStyles } from '../theme/spreadStyles'`
- Check StyleSheet.create() wrapping

**If component doesn't layout**:
- Verify ScrollView has `flexGrow: 1` in contentContainerStyle
- Check all Views have proper flex/sizing

**If fetch-on-flip doesn't work**:
- Check `loadingIndices` state management
- Verify `preFetchBodyMindSpirit()` calls `setCardMeanings()`

---

## 📚 REFERENCE LINKS

- **Core System Prompt**: `docs/TAROTKA_CORE_SYSTEM_PROMPT_v7.md`
- **Backend API**: `my-ai-backend/api/chat.js`
- **Moon Spread (reference)**: `src/screens/TarotReadingScreen.tsx` → `renderMoonReading()`
- **Journal Screen (reference)**: `src/screens/JournalScreen.tsx` → detail modal styling
- **Theme Config**: `src/theme/colors.ts`

---

**Plan Created**: June 10, 2026  
**Last Updated**: June 10, 2026  
**Status**: Ready for implementation  
**Priority**: CRITICAL PATH for app quality

✨ **Ready to build!**
