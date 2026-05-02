# 🔮 Tarotka — Zítřek Feature Plan

## Overview
Adding a "Co přinese zítřek?" (Tomorrow reading) slot to the HomeScreen carousel, plus time-based morphing of slot 1 between morning and evening modes.

---

## 🤖 Hey Haiku — read this first

This is a React Native + Expo app written in TypeScript. You are helping implement the **Zítřek (Tomorrow reading) feature**. Follow these instructions precisely and do not change anything outside the files listed below.

### Key rules:
- **Do not rename or remove** any existing props, functions or styles unless explicitly told to
- **Do not touch** `CelestialBackground`, `HomeCarousel`, `ActionBottomSheet` — these components are stable
- **Preserve** all existing Czech strings exactly as written — do not translate or autocorrect them
- **Do not add** new dependencies or packages
- When in doubt — do less, not more. Ask before changing something not listed here.

---

## 📁 Files to change — in this exact order

---

### STEP 1 — `src/screens/HomeScreen.tsx`

**What to do:**

1. Add `onTomorrowReading?: () => void` to the `HomeScreenProps` interface
2. Add `onTomorrowReading` to the destructured props
3. Move `carouselItems` array from module level to **inside** the component function body, just before the `return` statement
4. Add this variable before `carouselItems`:
```ts
const isEvening = currentTime.getHours() >= 14;
```

5. Replace the `carouselItems` array with this exact version:
```ts
const carouselItems: CarouselItem[] = [
  isEvening
    ? {
        id: 'night',
        title: 'Večerní reflexe',
        subtitle: '',
        greeting: 'Chvilka jen pro tebe.',
        icon: require('../../assets/home_icons/moon_icon.png'),
        action: 'night',
      }
    : {
        id: 'daily',
        title: 'Karta dne',
        subtitle: '',
        greeting: 'Vyložíme karty na stůl?',
        icon: require('../../assets/home_icons/sun_icon.png'),
        action: 'daily',
      },
  {
    id: 'custom',
    title: 'Tvoje otázka',
    subtitle: '',
    greeting: 'Zeptej se cokoliv',
    icon: require('../../assets/home_icons/crystal_ball_icon.png'),
    action: 'custom',
  },
  {
    id: 'tomorrow',
    title: 'Co přinese zítřek?',
    subtitle: '',
    greeting: 'Nahlédni za oponu času',
    icon: require('../../assets/home_icons/sun_icon.png'),
    action: 'tomorrow',
  },
];
```

6. Replace the existing `onItemPress` inline handler in `<HomeCarousel />` with a named function:
```ts
const handleItemPress = (id: string) => {
  if (id === 'daily') onDrawCard();
  if (id === 'custom') setIsModalVisible(true);
  if (id === 'night') onDrawCard(MYSTERY_CARD_IDS);
  if (id === 'tomorrow') onTomorrowReading?.();
};
```

7. Update `<HomeCarousel />` to use `onItemPress={handleItemPress}`

**Do not change** anything else in this file.

---

### STEP 2 — `App.tsx`

**What to do:**

1. Find where `<HomeScreen />` is rendered
2. Add the `onTomorrowReading` prop:
```tsx
onTomorrowReading={() => {
  // TODO: navigate to TomorrowScreen
  // temporary fallback until TomorrowScreen is built:
  onDrawCard();
}}
```

**Do not change** anything else in this file.

---

### STEP 3 — `src/screens/TomorrowScreen.tsx`

**What to do:** Create this file from scratch.

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, spacing } from '../theme/colors';
import { CelestialBackground } from '../components/CelestialBackground';
import { Ionicons } from '@expo/vector-icons';

interface TomorrowScreenProps {
  onBack: () => void;
  onDrawCard: () => void;
}

export function TomorrowScreen({ onBack, onDrawCard }: TomorrowScreenProps) {
  return (
    <CelestialBackground>
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#f5f0f6" />
        </TouchableOpacity>

        <Text style={styles.title}>Co přinese zítřek?</Text>
        <Text style={styles.subtitle}>Nahlédni za oponu času</Text>

        <TouchableOpacity style={styles.button} onPress={onDrawCard}>
          <Text style={styles.buttonText}>Odhalit kartu</Text>
        </TouchableOpacity>
      </View>
    </CelestialBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  title: {
    fontSize: 32,
    color: '#f5f0f6',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#c9b8d4',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 48,
  },
  button: {
    backgroundColor: 'rgba(155, 138, 163, 0.3)',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c9b8d4',
  },
  buttonText: {
    color: '#f5f0f6',
    fontSize: 16,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
});
```

---

### STEP 4 — `src/screens/index.ts`

**What to do:** Add this export line:
```ts
export { TomorrowScreen } from './TomorrowScreen';
```

---

## ✅ Quick Priority Order

| Priority | Step | File |
|----------|------|------|
| 🔴 1 | Carousel morphing + Zítřek slot | `HomeScreen.tsx` |
| 🔴 2 | Wire onTomorrowReading | `App.tsx` |
| 🟡 3 | Create tomorrow screen | `TomorrowScreen.tsx` |
| 🟡 4 | Export new screen | `src/screens/index.ts` |

---

## 🔮 What Zítřek slot looks like when done

| Time | Slot 1 | Slot 2 | Slot 3 |
|------|--------|--------|--------|
| Before 14:00 | ☀️ Karta dne | 🔮 Tvoje otázka | ✨ Co přinese zítřek? |
| After 14:00 | 🌙 Večerní reflexe | 🔮 Tvoje otázka | ✨ Co přinese zítřek? |

---

*Last updated: May 2026 — Plan by Claude Sonnet, implementation by Claude Haiku* 🤝
