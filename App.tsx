import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import { TabNavigator } from './src/navigation/TabNavigator';
import { CardRevealScreen } from './src/screens';
import { drawCard } from './src/data';
import { TarotCard } from './src/types/tarot';
import { useAppStore, JournalEntry } from './src/store/appStore';

export default function App() {
  const [currentCard, setCurrentCard] = useState<{
    card: TarotCard;
    position: 'upright' | 'reversed';
  } | null>(null);

  const addJournalEntry = useAppStore((state) => state.addJournalEntry);

  const handleDrawCard = () => {
    const drawn = drawCard();
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

  return (
    <NavigationContainer>
      {currentCard ? (
        <CardRevealScreen
          card={currentCard.card}
          position={currentCard.position}
          onClose={handleClose}
          onSaveReading={handleSaveReading}
        />
      ) : (
        <TabNavigator onDrawCard={handleDrawCard} />
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}