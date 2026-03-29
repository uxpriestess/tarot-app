# 🔮 Tarot App

A mindful tarot app for daily reflection and deep insights, built with React Native & Expo. Draw beautifully illustrated Czech tarot cards and receive personalized AI interpretations.

[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0-000020?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-orange)](https://github.com/pmndrs/zustand)

## ✨ Features

### 🎴 Daily Card Readings
- **Contextual draws**: Morning routine, evening reflection, or deeper questions
- **Beautiful card reveals** with smooth animations
- **Czech tarot deck** with complete Major Arcana and four suits
- **Daily streak tracking** to build a consistent practice

### 🤖 AI-Powered Insights
- **Personalized interpretations** powered by Claude AI
- **Authentic Czech responses** tailored to each reading context
- **Multiple reading modes**:
  - Daily draws (single card with daily guidance)
  - Custom questions (ask the universe anything)
  - Sophisticated spreads (love readings, complex multi-card layouts)
- Responses adapt to your spread type and question

### 📊 Progress Tracking
- **Persistent storage** using AsyncStorage
- Track journal entries and draw history
- Streak counter with visual milestones
- All progress syncs automatically across app sessions

### 💡 Smart Reading History
- View past draws and their interpretations
- Build patterns in your reading journey
- Collection of all cards for reference

### 🎨 Beautiful Design
- Soft color palette (lavender, sage, rose, bronze)
- Smooth animations and transitions
- Responsive layouts
- Glass morphism effects

## 🛠️ Tech Stack

- **Framework**: React Native 0.81 + Expo ~54.0
- **Language**: TypeScript 5.9
- **State Management**: Zustand 5.0 with persistence middleware
- **Storage**: AsyncStorage for persistent local data
- **AI**: Anthropic Claude API for Czech-language interpretations
- **Icons**: Expo Vector Icons
- **Assets**: Expo Asset for optimized image loading

## 📁 Project Structure

```
tarotapp-fresh/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── CardImage.tsx        # Card rendering component
│   │   ├── MysticCard.tsx       # Card reveal animations
│   │   └── ...
│   ├── data/                    # Static tarot deck data
│   │   ├── majorArcana.ts       # Major Arcana cards
│   │   ├── cups.ts              # Cups suit
│   │   ├── swords.ts            # Swords suit
│   │   ├── wands.ts             # Wands suit
│   │   ├── pentacles.ts         # Pentacles suit
│   │   └── index.ts
│   ├── hooks/                   # Custom React hooks
│   │   ├── useFonts.ts          # Font loading hook
│   │   └── useUserProgress.ts   # Track user progress
│   ├── screens/                 # Main app screens
│   │   ├── HomeScreen.tsx       # Dashboard with daily draw
│   │   ├── TarotReadingScreen.tsx # Complex spreads
│   │   ├── LoveReadingScreen.tsx  # Love spread specific UI
│   │   ├── CardRevealScreen.tsx # Card reveal animation
│   │   ├── UniverseResponseScreen.tsx # AI interpretation display
│   │   └── ...
│   ├── services/                # API and external services
│   │   └── universe.ts          # Claude AI integration
│   ├── store/                   # Global state management
│   │   └── appStore.ts          # Zustand store with persistence
│   ├── theme/                   # Design system
│   │   └── colors.ts            # Color palette
│   └── utils/                   # Utility functions
├── assets/                      # Images and fonts
│   └── cards/                   # Tarot card illustrations
├── app.json                     # Expo configuration
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo Go app (for testing on physical device)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/uxpriestess/tarot-app.git
   cd tarot-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Run on your device**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `a` for Android emulator, `i` for iOS simulator

## 📱 How It Works

### Daily Reflection Flow
1. **Open the app** and see your daily greeting
2. **Draw a card** with a single tap
3. **Reveal the card** with smooth animations
4. **Read the AI interpretation** generated in Czech, contextual to your question
5. **Track your practice** with streak counter and journal entries

### Reading Modes
- **Daily Draw**: Single card for morning/evening guidance
- **Custom Question**: Ask the universe anything and get a personalized interpretation
- **Spreads**: Multi-card layouts (including love spreads) with structured AI responses
- **Collection**: Browse all cards in your deck with their meanings

## 🎯 Key Features

### Intelligent State Management
- Zustand store with TypeScript for type-safe state
- AsyncStorage persistence middleware
- Optimized re-renders with selectors

### Beautiful UI/UX
- Animated card reveals and transitions
- Contextual time-based greetings
- Responsive design supporting various screen sizes
- Accessibility-friendly components

### Code Quality
- Full TypeScript coverage
- Modular architecture with clear separation of concerns
- Custom hooks for reusable logic
- Consistent code style

## 🔄 How the App Handles Changes

- **Persistent data**: The app uses AsyncStorage together with the Zustand persistence middleware to store draws, streaks, and journal entries locally. User progress is preserved across restarts and app updates.
- **Versioned state & migrations**: Stored state includes a version key so the app can run lightweight migrations on startup to adapt older state shapes (e.g., recalculating streaks or renaming fields) and avoid data loss when the schema changes.
- **Asset updates**: Card images are bundled in the `assets/cards/` folder and referenced by the card data in `src/data/`. When illustrations are updated, the mapping keeps existing saved draws referencing the correct assets.
- **Daily-draw & timezone handling**: The "last draw" is tracked as a date (UTC/ISO). The app compares stored dates to the current date to keep streak logic consistent across timezone or clock changes.

## 🌐 Connectivity & Data

### Offline & Connectivity
- **Offline-capable local data**: Your draws, streaks, and journal entries store locally and work without internet
- **AI readings require connectivity**: Personalized interpretations come from our Claude API backend and need an active connection
- **Graceful degradation**: If the connection drops, you'll see a friendly message and can retry
- **Future: Cross-device sync** with user accounts will keep your data in sync across devices

## 📄 License

This project is open source and available for educational purposes.

## 👤 Author

**uxpriestess**
- GitHub: [@uxpriestess](https://github.com/uxpriestess)

---

Built with ❤️ using React Native & Expo
