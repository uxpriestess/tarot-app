import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NameScreen } from './src/screens/onboarding/NameScreen';
import { WelcomeScreen } from './src/screens/onboarding/WelcomeScreen';
import { BirthDateScreen } from './src/screens/onboarding/BirthDateScreen';
import { ZodiacRevealScreen } from './src/screens/onboarding/ZodiacRevealScreen';
import { FirstCardScreen } from './src/screens/onboarding/FirstCardScreen';
import { SignUpScreen } from './src/screens/onboarding/SignUpScreen';
import { LoginScreen } from './src/screens/onboarding/LoginScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Alert, ActivityIndicator, View, Modal } from 'react-native';
import { TabNavigator } from './src/navigation/TabNavigator';
import { CardRevealScreen } from './src/screens/CardRevealScreen';
import { UniverseResponseScreen } from './src/screens/UniverseResponseScreen';
import { drawCard } from './src/data';
import { TarotCard } from './src/types/tarot';
import { useAppStore, JournalEntry } from './src/store/appStore';
import { useOnboardingStore } from './src/store/onboardingStore';
import { askUniverse } from './src/services/universe';
import { colors } from './src/theme/colors';
import { TarotReadingScreen, LoveReadingScreen, TomorrowScreen } from './src/screens';
import { supabase } from './src/services/supabase';

export default function App() {
  const [isMysticOpen, setIsMysticOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<
    'welcome' | 'name' | 'birthDate' | 'zodiacReveal' | 'firstCard' | 'signUp' | 'login' | ''
  >('welcome');
  const [isLoveReadingOpen, setIsLoveReadingOpen] = useState(false);
  const [isTomorrowScreenOpen, setIsTomorrowScreenOpen] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [isFirstCardDraw, setIsFirstCardDraw] = useState(false);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('onboarding_complete');
        if (hasCompleted === 'true') {
          setOnboardingStep('');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const [currentCard, setCurrentCard] = useState<{
    card: TarotCard;
    position: 'upright' | 'reversed';
    aiMeaning?: string;
  } | null>(null);

  const [universeResponse, setUniverseResponse] = useState<{
    question: string;
    answer: string;
    cards: TarotCard[];
  } | null>(null);

  const [isLoadingUniverse, setIsLoadingUniverse] = useState(false);

  const addJournalEntry = useAppStore((state) => state.addJournalEntry);

  const handleDrawCard = async (subsetIds?: string[]) => {
    const drawn = drawCard(subsetIds);
    setCurrentCard({ ...drawn, aiMeaning: undefined });

    try {
      const response = await askUniverse(
        `Výklad pro kartu: ${drawn.card.nameCzech || drawn.card.name} (${drawn.position === 'upright' ? 'vzpřímená' : 'obrácená'})`,
        'daily',
        [{
          name: drawn.card.name,
          nameCzech: drawn.card.nameCzech || drawn.card.name,
          position: drawn.position
        }]
      );
      setCurrentCard(prev => prev ? { ...prev, aiMeaning: response.answer } : null);
    } catch (error) {
      console.error('Failed to fetch AI meaning:', error);
    }
  };

  const handleClose = () => {
    setCurrentCard(null);
    if (isFirstCardDraw && onboardingStep === 'firstCard') {
      setIsFirstCardDraw(false);
      setOnboardingStep('signUp');
    }
  };

  const handleSaveReading = () => {
    if (!currentCard) return;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      cardId: currentCard.card.id,
      date: new Date().toISOString(),
      position: currentCard.position,
    };

    addJournalEntry(entry);
    Alert.alert("Uloženo!", "Tvůj výklad byl uložen do deníku.");
  };

  const handleAskUniverse = async (question: string) => {
    if (!question.trim()) {
      Alert.alert('Chyba', 'Musíš napsat otázku');
      return;
    }

    setIsLoadingUniverse(true);
    try {
      const response = await askUniverse(question);
      setUniverseResponse({
        question,
        answer: response.answer,
        cards: response.cards,
      });
    } catch (error) {
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Něco se pokazilo');
    } finally {
      setIsLoadingUniverse(false);
    }
  };

  const handleCloseUniverse = () => {
    setUniverseResponse(null);
  };

  const handleFirstCardComplete = async () => {
    setIsFirstCardDraw(true);
  };

  // Sign up with email and password
  const handleSignUp = async (email: string, password: string) => {
    try {
      const onboardingData = useOnboardingStore.getState().data;

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        if (error.message.includes('already registered')) {
          Alert.alert('Účet již existuje', 'Tento e-mail je již registrován. Přihlaš se.');
        } else {
          Alert.alert('Chyba', error.message);
        }
        return;
      }

      const user = data.user;
      if (!user) return;

      // Force sign in to guarantee an active session before RLS-protected insert
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Auto sign-in after signup failed:', signInError);
      }

      // Now insert profile — session is guaranteed
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: onboardingData.displayName,
          birth_date: onboardingData.birthDate,
          zodiac_sign: onboardingData.zodiacSign,
        });

      if (profileError && profileError.code !== '23505') {
        // 23505 = unique violation, profile already exists — that's fine
        console.error('Profile insert error:', profileError);
      }

      // Save profile to local store
      useAppStore.getState().setUserProfile(
        onboardingData.displayName,
        onboardingData.zodiacSign,
      );

      await AsyncStorage.setItem('onboarding_complete', 'true');
      useOnboardingStore.getState().reset();
      setOnboardingStep('');
    } catch (error) {
      Alert.alert('Chyba', 'Něco se pokazilo. Zkus to znovu.');
    }
  };

  // Log in with email and password
  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert('Chyba', 'Špatný e-mail nebo heslo.');
        } else {
          Alert.alert('Chyba', error.message);
        }
        return;
      }

      const user = data.user;
      if (!user) return;

      // Try to load existing profile, don't crash if missing (PGRST116)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Load profile into local store if it exists
      if (profile) {
        useAppStore.getState().setUserProfile(
          profile.display_name,
          profile.zodiac_sign,
        );
      }

      await AsyncStorage.setItem('onboarding_complete', 'true');
      setOnboardingStep('');
    } catch (error) {
      Alert.alert('Chyba', 'Něco se pokazilo. Zkus to znovu.');
    }
  };

  // Skip auth entirely
  const handleSignUpSkip = async () => {
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
    } catch (error) {
      console.error('Error setting onboarding_complete:', error);
    }
    setOnboardingStep('');
  };

  if (isCheckingOnboarding) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.lavender} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {onboardingStep === 'welcome' ? (
          <WelcomeScreen onContinue={() => setOnboardingStep('name')} />
        ) : onboardingStep === 'name' ? (
          <NameScreen onContinue={() => setOnboardingStep('birthDate')} />
        ) : onboardingStep === 'birthDate' ? (
          <BirthDateScreen onContinue={() => setOnboardingStep('zodiacReveal')} />
        ) : onboardingStep === 'zodiacReveal' ? (
          <ZodiacRevealScreen onContinue={() => setOnboardingStep('firstCard')} />
        ) : onboardingStep === 'firstCard' ? (
          <FirstCardScreen onDrawCard={() => {
            handleDrawCard();
            setTimeout(() => handleFirstCardComplete(), 100);
          }} />
        ) : onboardingStep === 'signUp' ? (
          <SignUpScreen
            onSignUp={handleSignUp}
            onGoToLogin={() => setOnboardingStep('login')}
            onSkip={handleSignUpSkip}
          />
        ) : onboardingStep === 'login' ? (
          <LoginScreen
            onLogin={handleLogin}
            onBackToSignUp={() => setOnboardingStep('signUp')}
            onSkip={handleSignUpSkip}
          />
        ) : isLoadingUniverse ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.lavender} />
          </View>
        ) : universeResponse ? (
          <UniverseResponseScreen
            question={universeResponse.question}
            answer={universeResponse.answer}
            cards={universeResponse.cards}
            onClose={handleCloseUniverse}
          />
        ) : isLoveReadingOpen ? (
          <LoveReadingScreen onClose={() => setIsLoveReadingOpen(false)} />
        ) : isMysticOpen ? (
          <TarotReadingScreen
            onClose={() => setIsMysticOpen(false)}
            onOpenLoveReading={() => {
              setIsMysticOpen(false);
              setIsLoveReadingOpen(true);
            }}
          />
        ) : (
          <>
            <TabNavigator
              onDrawCard={handleDrawCard}
              onAskUniverse={handleAskUniverse}
              onOpenMystic={() => setIsMysticOpen(true)}
              onOpenLoveReading={() => setIsLoveReadingOpen(true)}
              onShowAuth={() => setOnboardingStep('login')}
              onTomorrowReading={() => setIsTomorrowScreenOpen(true)}
            />
          </>
        )}

        {/* CardRevealScreen Modal - always available regardless of onboarding state */}
        <Modal
          visible={!!currentCard}
          animationType="fade"
          transparent={true}
          onRequestClose={handleClose}
        >
          {currentCard && (
            <CardRevealScreen
              card={currentCard.card}
              position={currentCard.position}
              aiMeaning={currentCard.aiMeaning}
              onClose={handleClose}
              onSaveReading={handleSaveReading}
              isOnboarding={onboardingStep === 'firstCard'}
            />
          )}
        </Modal>

        {/* TomorrowScreen Modal */}
        <Modal
          visible={isTomorrowScreenOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsTomorrowScreenOpen(false)}
        >
          <TomorrowScreen
            onBack={() => setIsTomorrowScreenOpen(false)}
            onDrawCard={() => {
              setIsTomorrowScreenOpen(false);
              handleDrawCard();
            }}
          />
        </Modal>

        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
