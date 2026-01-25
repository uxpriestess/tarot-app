# Tarot App - AI Coding Agent Instructions

## Architecture Overview
This is a React Native Expo app for tarot card readings with AI-powered interpretations. The app consists of:
- **Frontend**: React Native 0.81 + Expo ~54, TypeScript, Zustand state management with AsyncStorage persistence
- **Backend**: Node.js API deployed on Vercel, using Anthropic Claude API for Czech-language tarot readings
- **Data**: Czech tarot deck (Major Arcana + 4 suits), modular card data structure in `src/data/`

## Key Components & Data Flow
- **App.tsx**: Main entry point with modal navigation for card reveals and universe responses
- **TabNavigator**: Bottom tabs (Home, Čtení/Reading, Deník/Journal, Kolekce/Collection, Profil/Profile)
- **Screens**: HomeScreen (daily draw), TarotReadingScreen (complex spreads), CardRevealScreen (modal), UniverseResponseScreen (AI answers)
- **State**: `appStore.ts` - journal entries, streak counter, user microcopy style (soft/genz)
- **AI Integration**: `services/universe.ts` posts to backend API with cards/question/mode, receives formatted Czech responses

## Critical Patterns & Conventions
- **Language**: All user-facing text in Czech, AI responses structured with specific shapers (daily: 4 short paragraphs ~130 words; love spreads: JSON with ty/partner/vztah fields)
- **Card Drawing**: `drawCard()` from `src/data/index.ts` returns random card + upright/reversed position
- **AI Modes**: 'daily' (single card), 'reading-screen' (multi-card spreads), 'love_3_card' (JSON output), 'custom_question'
- **Persistence**: Zustand persist middleware with AsyncStorage, versioned storage keys (e.g., "tarot-app-storage-v2")
- **Navigation**: React Navigation with bottom tabs, modal overlays for card reveals
- **Styling**: Custom color palette (lavender/sage/rose/bronze), glass morphism effects, responsive layouts

## Development Workflow
- **Start**: `npm start` or `npx expo start` (runs on iOS/Android/web)
- **Build**: No custom build scripts; Expo handles compilation
- **Testing**: Manual testing on devices/simulators; no automated tests yet
- **Backend**: Deploy to Vercel from `my-ai-backend/` folder; requires ANTHROPIC_API_KEY env var
- **Assets**: Tarot card images in `assets/cards/`, optimized with Expo Asset

## Common Tasks & Examples
- **Add new screen**: Create in `src/screens/`, add to TabNavigator, update `src/screens/index.ts`
- **New card data**: Add to appropriate suit file (e.g., `src/data/cups.ts`), ensure id/name/nameCzech fields
- **AI response format**: For love readings, backend returns JSON `{"ty": "...", "partner": "...", "vztah": "..."}` parsed into delimited string
- **State updates**: Use `useAppStore` selectors for performance; persist automatically via middleware
- **Modal flows**: Card draws trigger `CardRevealScreen` modal; universe questions show `UniverseResponseScreen`

## Integration Points
- **Backend API**: POST to `https://my-ai-backend-dun.vercel.app/api/chat` with `{question, cards[], mode}`
- **Card Images**: Referenced by `card.image` field, loaded via Expo Asset
- **External APIs**: Only Anthropic Claude; no other external dependencies
- **Storage**: AsyncStorage for all persistence; no database

## File Organization Reference
- `src/components/`: Reusable UI (CardImage, MysticCard, etc.)
- `src/data/`: Card definitions by suit + combined `allCards` array
- `src/insights/`: Dynamic microcopy logic with soft/genz styles
- `src/services/`: `universe.ts` for AI API calls
- `src/store/`: Zustand store with persistence
- `src/theme/`: Colors and shared styles
- `my-ai-backend/api/chat.js`: Claude API integration with response shapers
- `docs/`: Implementation guides and system prompts