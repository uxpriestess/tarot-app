# 🔮 Tarot App

A mindful tarot app for daily reflection, built with React Native & Expo. Draw beautifully illustrated Czech tarot cards, track your journey, and receive personalized insights.

[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0-000020?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-orange)](https://github.com/pmndrs/zustand)

## ✨ Features

### 🎴 Daily Card Readings
- **Contextual draws**: Morning routine, evening reflection, or deeper questions
- **Beautiful card reveals** with smooth animations
- **Czech tarot deck** with authentic illustrations
- Daily streak tracking to build a consistent practice

### 📊 Progress Tracking
- **Persistent storage** using AsyncStorage
- Track journal entries and draw history
- Streak counter with visual badges
- All progress syncs automatically

### 💡 Dynamic Insights
- **Personalized microcopy** with two styles:
  - 🌙 **Soft**: Gentle, mindful language
  - ✨ **GenZ**: Modern, energetic tone
- **Smart insights** based on your usage patterns
- Milestone celebrations and favorites tracking

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
- **Icons**: Expo Vector Icons
- **Assets**: Expo Asset for optimized image loading

## 📁 Project Structure

```
tarotapp-fresh/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── CardImage.tsx    # Card rendering component
│   ├── data/                # Static data and card definitions
│   │   ├── cards.ts         # Tarot card data
│   │   ├── cardImages.ts    # Image asset mappings
│   │   └── index.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── useFonts.ts      # Font loading hook
│   │   └── useUserProgress.ts # Track user progress
│   ├── screens/             # Main app screens
│   │   ├── HomeScreen.tsx   # Dashboard with daily draw
│   │   ├── DrawScreen.tsx   # Card selection interface
│   │   ├── CardRevealScreen.tsx  # Card reveal and meaning
│   │   └── index.ts
│   ├── store/               # Global state management
│   │   └── appStore.ts      # Zustand store with persistence
│   ├── theme/               # Design system
│   │   └── colors.ts        # Color palette and spacing
│   ├── types/               # Shared TypeScript types
│   │   └── index.ts
│   └── utils/               # Utility functions
├── assets/                  # Images, fonts, and other assets
│   └── cards/              # Tarot card illustrations
├── index.ts                # App entry point
├── app.json                # Expo configuration
├── package.json
└── tsconfig.json

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

## 📱 Usage

1. **Home Screen**: View your daily greeting and current streak
2. **Choose Context**: Select morning, evening, or deeper reading
3. **Draw Card**: Tap to reveal your daily tarot card
4. **Explore Meaning**: Read the card's interpretation
5. **Track Progress**: Watch your streak and insights grow

## 🎯 Key Features Showcase

### State Management
- Zustand store with TypeScript for type-safe state
- AsyncStorage persistence middleware
- Optimized re-renders with selectors

### UI/UX Excellence
- Animated transitions using React Native's Animated API
- Contextual time-based greetings
- Responsive design supporting various screen sizes
- Accessibility-friendly components

### Code Quality
- Full TypeScript coverage
- Modular architecture with clear separation of concerns
- Custom hooks for reusable logic
- Consistent code style and formatting

## 🔄 Future Enhancements


## 🔁 How the App Handles Changes

- **Persistent data:** The app uses AsyncStorage together with the Zustand persistence middleware to store draws, streaks, and journal entries locally. User progress is preserved across restarts and app updates.
- **Versioned state & migrations:** Stored state includes a version key so the app can run lightweight migrations on startup to adapt older state shapes (e.g., recalculating streaks or renaming fields) and avoid data loss when the schema changes.
- **Asset updates:** Card images are bundled in the `assets/cards` folder and referenced via the image mapping in `src/data/cardImages.ts`. When illustrations are updated, updating the mapping keeps existing saved draws referencing the correct assets.
- **Daily-draw & timezone handling:** The "last draw" is tracked as a date (UTC/ISO). The app compares stored dates to the current date to keep streak logic consistent across timezone or clock changes.
- **Offline-first & sync considerations:** Progress is written locally immediately. If cloud sync is added later, local changes should merge by timestamp to resolve conflicts and preserve the most recent user actions.
- **Backups & export (recommended):** For long-term preservation, provide export or backup options (or rely on device backups) so users can keep their history when moving devices or reinstalling the app.

- **Security note:** Do not commit secrets or `.env.local` files. If sensitive keys are accidentally committed, rotate/revoke them immediately and remove the file from the repository history. See `docs/CONTRIBUTING.md` for guidance and use `.env.example` as a template.

For implementation details, migration examples, and contributor guidance see:

- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

## 📄 License

This project is open source and available for educational purposes.

## 👤 Author

**uxpriestess**
- GitHub: [@uxpriestess](https://github.com/uxpriestess)

---

Built with ❤️ using React Native & Expo
