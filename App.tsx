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
import { useDailyDraw } from './src/hooks/useDailyDraw';
import type { Session } from '@supabase/supabase-js';
import { normalizeEmail, readOwnProfile, recoverRegistration, RegistrationError } from './src/services/registration';

export default function App() {
  const [isMysticOpen, setIsMysticOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<
    'welcome' | 'name' | 'birthDate' | 'zodiacReveal' | 'firstCard' | 'signUp' | 'login' | ''
  >('welcome');
  const [isLoveReadingOpen, setIsLoveReadingOpen] = useState(false);
  const [isTomorrowScreenOpen, setIsTomorrowScreenOpen] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [isFirstCardDraw, setIsFirstCardDraw] = useState(false);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [isRecoveringProfile, setIsRecoveringProfile] = useState(false);

  // A previous app version could mark onboarding complete without saving a profile.
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthSession(session);
    });
    const checkOnboardingStatus = async () => {
      setIsCheckingOnboarding(true);
      try {
        await useOnboardingStore.getState().restoreDraft();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        setAuthSession(data.session);
        const hasCompleted = await AsyncStorage.getItem('onboarding_complete');
        if (!active) return;
        if (data.session) {
          const profile = await readOwnProfile(data.session.user.id);
          if (!active) return;
          if (profile) {
            await finishRegistration();
          } else {
            await AsyncStorage.removeItem('onboarding_complete');
            setIsRecoveringProfile(true);
            setOnboardingStep('signUp');
          }
        } else {
          const pending = useOnboardingStore.getState().data.email;
          setOnboardingStep(pending ? 'login' : hasCompleted === 'true' ? '' : 'welcome');
        }
      } catch {
        if (!active) return;
        setOnboardingStep('login');
        Alert.alert('Připojení k účtu', 'Stav účtu se nepodařilo ověřit. Zkus to znovu.', [
          { text: 'Zkusit znovu', onPress: () => { void checkOnboardingStatus(); } },
          { text: 'Přihlásit se', style: 'cancel' },
        ]);
      } finally {
        if (active) setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
    return () => { active = false; subscription.unsubscribe(); };
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
  const dailyDraw = useDailyDraw();

  const handleDrawCard = async (subsetIds?: string[], mode: string = 'daily') => {
    dailyDraw.reset();
    const drawn = drawCard(subsetIds);
    setCurrentCard({ ...drawn, aiMeaning: undefined });

    try {
      const response = await askUniverse(
        `Výklad pro kartu: ${drawn.card.nameCzech || drawn.card.name} (${drawn.position === 'upright' ? 'vzpřímená' : 'obrácená'})`,
        mode,
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

  const handleDailyDraw = () => {
    setCurrentCard(null);
    dailyDraw.drawDailyCard();
  };

  const handleClose = () => {
    setCurrentCard(null);
    dailyDraw.reset();
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
      aiMeaning: currentCard.aiMeaning,
    };

    addJournalEntry(entry);
    Alert.alert("Uloženo!", "Tvůj výklad byl uložen do deníku.");
  };

  const handleSaveDailyReading = () => {
    if (dailyDraw.saveReading()) {
      Alert.alert("Uloženo!", "Tvůj výklad byl uložen do deníku.");
    }
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

  const finishRegistration = async () => {
    const profile = await recoverRegistration(useOnboardingStore.getState().data);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    useAppStore.getState().setUserProfile(profile.display_name ?? '', profile.zodiac_sign ?? '');
    await useOnboardingStore.getState().clearDraft();
    setIsRecoveringProfile(false);
    setOnboardingStep('');
  };

  const showRecoveryError = (error: unknown) => {
    if (error instanceof RegistrationError && error.kind === 'details') {
      setIsRecoveringProfile(true);
      Alert.alert('Dokončení profilu', error.message, [
        { text: 'Doplnit údaje', onPress: () => setOnboardingStep('name') },
        { text: 'Později', style: 'cancel' },
      ]);
      return;
    }
    if (error instanceof RegistrationError && error.kind === 'session') {
      setOnboardingStep('login');
    } else {
      setIsRecoveringProfile(true);
      setOnboardingStep('signUp');
    }
    Alert.alert('Dokončení účtu', error instanceof RegistrationError
      ? error.message
      : 'Dokončení účtu se nepodařilo. Zkontroluj připojení a zkus to znovu. Tvoje údaje zůstaly uložené.');
  };

  const handleRecoverProfile = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        throw new RegistrationError('session', 'Přihlas se pro dokončení profilu.');
      }
      const draft = useOnboardingStore.getState().data;
      if (!draft.email && data.session.user.email) {
        await useOnboardingStore.getState().saveDraft(data.session.user.email);
      }
      await finishRegistration();
    } catch (error) {
      showRecoveryError(error);
    }
  };

  const showAuthError = (code?: string) => {
    const message = code === 'email_not_confirmed'
      ? 'Nejdřív potvrď e-mail pomocí odkazu v doručené poště. Potom se tady přihlas a dokonči profil.'
      : code === 'invalid_credentials'
        ? 'E-mail nebo heslo nesouhlasí. Pokud účet už existuje, použij jeho původní heslo.'
        : 'Přihlášení se nepodařilo. Zkontroluj připojení a přihlašovací údaje a zkus to znovu.';
    Alert.alert('Přihlášení', message);
  };

  const handleSignUp = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    try {
      const { data: current, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (current.session) {
        await handleRecoverProfile();
        return;
      }
      await useOnboardingStore.getState().saveDraft(normalizedEmail);
      const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
      if (error) {
        setOnboardingStep('login');
        Alert.alert('Registrace', error.code === 'user_already_exists'
          ? 'Účet už existuje. Přihlas se a dokonči profil.'
          : 'Registraci se nepodařilo dokončit. Pokud účet už vznikl, přihlas se pro dokončení profilu. Jinak můžeš registraci zkusit znovu.');
        return;
      }
      if (!data.session) {
        setOnboardingStep('login');
        Alert.alert('Zkontroluj e-mail', 'Pokud je potřeba potvrdit e-mail, otevři odkaz v doručené poště. Potom se přihlas původním heslem. Údaje pro profil zůstaly uložené.');
        return;
      }
      setAuthSession(data.session);
      await finishRegistration();
    } catch (error) {
      showRecoveryError(error);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email), password,
      });
      if (error || !data.session) {
        showAuthError(error?.code);
        return;
      }
      setAuthSession(data.session);
      await finishRegistration();
    } catch (error) {
      showRecoveryError(error);
    }
  };

  // Skip auth entirely
  const handleSignUpSkip = async () => {
    if (isRecoveringProfile || authSession || useOnboardingStore.getState().data.email) {
      Alert.alert('Dokončení účtu', 'Nejdřív dokonči profil nebo se přihlas k rozpracovanému účtu.');
      return;
    }
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
    } catch (error) {
      console.error('Error setting onboarding_complete:', error);
    }
    setOnboardingStep('');
  };

  const revealCard = dailyDraw.currentCard ?? currentCard;
  const isDailyReveal = dailyDraw.currentCard !== null;

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
          <ZodiacRevealScreen onContinue={async () => {
            if (isRecoveringProfile) {
              // Bind newly entered details only after the user confirms them.
              try {
                const { data, error } = await supabase.auth.getSession();
                if (error || !data.session?.user.email) {
                  throw new RegistrationError('session', 'Přihlas se pro dokončení profilu.');
                }
                await useOnboardingStore.getState().saveDraft(data.session.user.email);
                setOnboardingStep('signUp');
              } catch (error) { showRecoveryError(error); }
            } else {
              setOnboardingStep('firstCard');
            }
          }} />
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
            onRecover={authSession ? handleRecoverProfile : undefined}
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
              onDrawDaily={handleDailyDraw}
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
          visible={!!revealCard}
          animationType="fade"
          transparent={true}
          onRequestClose={handleClose}
        >
          {revealCard && (
            <CardRevealScreen
              card={revealCard.card}
              position={revealCard.position}
              aiMeaning={revealCard.aiMeaning}
              onClose={handleClose}
              onSaveReading={isDailyReveal ? handleSaveDailyReading : handleSaveReading}
              isOnboarding={onboardingStep === 'firstCard'}
              dailyRitual={isDailyReveal}
              isMeaningLoading={isDailyReveal && dailyDraw.isLoadingMeaning}
              meaningError={isDailyReveal ? dailyDraw.meaningError : undefined}
              onRetryMeaning={isDailyReveal ? dailyDraw.retryMeaning : undefined}
              isReadingSaved={isDailyReveal && dailyDraw.isSaved}
              canSaveReading={
                !isDailyReveal ||
                (Boolean(dailyDraw.currentCard?.aiMeaning) && !dailyDraw.isLoadingMeaning)
              }
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
              handleDrawCard(undefined, 'tomorrow');
            }}
          />
        </Modal>

        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
