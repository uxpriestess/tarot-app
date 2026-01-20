import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/colors';
import { MYSTERY_CARD_IDS } from '../data/subsets';
import { CelestialBackground } from '../components/CelestialBackground';
import { HomeCarousel, CarouselItem } from '../components/HomeCarousel';
import { ActionBottomSheet } from '../components/ActionBottomSheet';
import { getMoonPhase } from '../utils/moonPhase';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onDrawCard: (subsetIds?: string[]) => void;
  onAskUniverse?: (question: string) => Promise<void>;
  hasReadToday: boolean;
  streak: number;
  onViewGuides?: () => void;
  onOpenMystic?: () => void;
  onSingleCard?: () => void;
  onThreeCards?: () => void;
}

const carouselItems: CarouselItem[] = [
  {
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
    id: 'night',
    title: 'Na dobrou noc',
    subtitle: '',
    greeting: 'Chvilka jen pro tebe.',
    icon: require('../../assets/home_icons/moon_icon.png'),
    action: 'night',
  },
];

export function HomeScreen({
  onDrawCard,
  onAskUniverse,
  hasReadToday,
  streak,
  onViewGuides,
  onOpenMystic,
  onSingleCard,
  onThreeCards,
}: HomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(buttonY, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Dobré ráno', icon: '☀️' };
    if (hour < 18) return { text: 'Dobré odpoledne', icon: '🌤️' };
    return { text: 'Dobrý večer', icon: '✨' };
  };

  const greeting = getGreeting();
  const moon = getMoonPhase(currentTime);

  const handleMainDrawPress = () => {
    const item = carouselItems[currentIndex];
    if (item.action === 'custom') {
      setIsModalVisible(true);
    } else if (item.action === 'daily') {
      onDrawCard();
    } else {
      onDrawCard(MYSTERY_CARD_IDS);
    }
  };

  const currentItem = carouselItems[currentIndex];

  return (
    <CelestialBackground>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>Tarotka</Text>
            <View style={styles.statusBar}>
              <View style={styles.moonInfo}>
                <Text style={styles.statusIcon}>{moon.icon}</Text>
                <Text style={styles.statusText}>{moon.name}</Text>
              </View>
            </View>
          </View>

          {/* Carousel Section */}
          <View style={styles.carouselSection}>
            <Text style={styles.dynamicGreeting}>
              {currentItem.greeting || greeting.text}
            </Text>
            <HomeCarousel
              items={carouselItems}
              onIndexChange={setCurrentIndex}
              currentIndex={currentIndex}
              onItemPress={(id) => {
                if (id === 'daily') onDrawCard();
                if (id === 'custom') setIsModalVisible(true);
                if (id === 'night') onOpenMystic?.();
              }}
            />
          </View>
        </Animated.View>
      </ScrollView>

      <ActionBottomSheet
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={(q) => onAskUniverse?.(q)}
        title="Vaše otázka"
        subtitle="Soustřeďte se na to, co vás zajímá"
      />
    </CelestialBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 40,
    color: '#f5f0f6',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 4,
    marginBottom: 15,
    textAlign: 'center',
  },
  statusBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  moonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: '#c9b8d4',
    fontSize: 13,
    letterSpacing: 1,
  },
  statusIcon: {
    fontSize: 16,
  },
  carouselSection: {
    flex: 1,
    paddingVertical: 20,
  },
  dynamicGreeting: {
    textAlign: 'center',
    fontSize: 20,
    color: '#f5f0f6',
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 2,
  },
});
