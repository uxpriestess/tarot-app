import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Alert, ActivityIndicator, View } from 'react-native';
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
  } | null>(null);

  const [universeResponse, setUniverseResponse] = useState<{
    question: string;
    answer: string;
    cards: TarotCard[];
  } | null>(null);

  const [isLoadingUniverse, setIsLoadingUniverse] = useState(false);

  const addJournalEntry = useAppStore((state) => state.addJournalEntry);

  const handleDrawCard = (subsetIds?: string[]) => {
    const drawn = drawCard(subsetIds);
    setCurrentCard(drawn);
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
      ) : currentCard ? (
        <CardRevealScreen
          card={currentCard.card}
          position={currentCard.position}
          onClose={handleClose}
          onSaveReading={handleSaveReading}
        />
      ) : (
        <TabNavigator
          onDrawCard={handleDrawCard}
          onAskUniverse={handleAskUniverse}
          onOpenMystic={() => setIsMysticOpen(true)}
        />
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}