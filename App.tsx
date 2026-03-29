import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NameScreen } from './src/screens/onboarding/NameScreen';
import { WelcomeScreen } from './src/screens/onboarding/WelcomeScreen';
import { BirthDateScreen } from './src/screens/onboarding/BirthDateScreen';
import { ZodiacRevealScreen } from './src/screens/onboarding/ZodiacRevealScreen';
import { FirstCardScreen } from './src/screens/onboarding/FirstCardScreen';
import { SignUpScreen } from './src/screens/onboarding/SignUpScreen';
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
import { TarotReadingScreen, LoveReadingScreen } from './src/screens';
import { supabase } from './src/services/supabase';

export default function App() {
  const [isMysticOpen, setIsMysticOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'name' | 'birthDate' | 'zodiacReveal' | 'firstCard' | 'signUp' | ''>('welcome');
  const [isLoveReadingOpen, setIsLoveReadingOpen] = useState(false);
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
    setCurrentCard({ ...drawn, aiMeaning: undefined }); // Reset AI meaning for new draw

    // Fetch AI meaning in the background
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
      // Fallback is handled by the component or it just stays undefined
    }
  };

  const handleClose = () => {
    setCurrentCard(null);
    // If this was the first card during onboarding, show sign-up screen
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

  // Mock Auth: Create user profile in Supabase with onboarding data
  const createUserProfile = async (authMethod: 'google' | 'apple' | 'skip') => {
    try {
      const onboardingData = useOnboardingStore.getState().data;
      
      if (!onboardingData.displayName) {
        Alert.alert('Chyba', 'Chybí tvoje jméno. Zkus to znovu.');
        return;
      }

      // In real OAuth, we'd get a UUID from Supabase auth
      // For mock auth, we'll generate a simple mock ID
      const mockUserId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Write profile data to Supabase (RLS disabled for mock auth testing)
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: mockUserId,
          display_name: onboardingData.displayName,
          birth_date: onboardingData.birthDate,
          zodiac_sign: onboardingData.zodiacSign,
        });

      if (error) {
        console.error('Supabase insert error:', error);
        Alert.alert('Chyba při ukládání', 'Tvůj profil se nepodařilo uložit. Zkus to znovu.');
        return;
      }

      // Success: Mark onboarding as complete and navigate to home
      await AsyncStorage.setItem('onboarding_complete', 'true');
      
      // Reset onboarding store for future use
      useOnboardingStore.getState().reset();
      
      // Navigate to home screen
      setOnboardingStep('');
      
      Alert.alert('Vítej! 🔮', `Ahoj ${onboardingData.displayName}! Tvůj profil je připraven.`);
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Něco se pokazilo při vytváření profilu.');
    }
  };

  const handleSignUpGoogle = async () => {
    // Phase A (Mock Auth): Simulate Google OAuth
    console.log('Mock: Google sign-up');
    await createUserProfile('google');
  };

  const handleSignUpApple = async () => {
    // Phase A (Mock Auth): Simulate Apple Sign-In
    console.log('Mock: Apple sign-up');
    await createUserProfile('apple');
  };

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
                  onSignUpGoogle={handleSignUpGoogle}
                  onSignUpApple={handleSignUpApple}
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
            
            <StatusBar style="auto" />
        </NavigationContainer>
    </SafeAreaProvider>
);
}