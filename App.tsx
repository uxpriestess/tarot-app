import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Alert, ActivityIndicator, View, Modal } from 'react-native';
import { TabNavigator } from './src/navigation/TabNavigator';
import { CardRevealScreen } from './src/screens';
import { UniverseResponseScreen } from './src/screens/UniverseResponseScreen';
import { drawCard } from './src/data';
import { TarotCard } from './src/types/tarot';
import { useAppStore, JournalEntry } from './src/store/appStore';
import { askUniverse } from './src/services/universe';
import { colors } from './src/theme/colors';
import { TarotReadingScreen } from './src/screens/TarotReadingScreen';

export default function App() {
  const [isMysticOpen, setIsMysticOpen] = useState(false);
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
      const response = await askUniverse(`Výklad pro kartu: ${drawn.card.nameCzech || drawn.card.name} (${drawn.position === 'upright' ? 'vzpřímená' : 'obrácená'})`, 'daily');
      setCurrentCard(prev => prev ? { ...prev, aiMeaning: response.answer } : null);
    } catch (error) {
      console.error('Failed to fetch AI meaning:', error);
      // Fallback is handled by the component or it just stays undefined
    }
  };

  const handleClose = () => {
    setCurrentCard(null);
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

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isLoadingUniverse ? (
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
        ) : isMysticOpen ? (
          <TarotReadingScreen onClose={() => setIsMysticOpen(false)} />
        ) : (
          <>
            <TabNavigator
              onDrawCard={handleDrawCard}
              onAskUniverse={handleAskUniverse}
              onOpenMystic={() => setIsMysticOpen(true)}
            />

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
                />
              )}
            </Modal>
          </>
        )}
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}