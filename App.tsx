import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { TabNavigator } from './src/navigation/TabNavigator';
import { CardRevealScreen } from './src/screens';
import { drawCard } from './src/data';
import { TarotCard } from './src/types/tarot';

export default function App() {
  const [currentCard, setCurrentCard] = useState<{
    card: TarotCard;
    position: 'upright' | 'reversed';
  } | null>(null);

  const handleDrawCard = () => {
    const drawn = drawCard();
    setCurrentCard(drawn);
  };

  const handleClose = () => {
    setCurrentCard(null);
  };

  return (
    <NavigationContainer>
      {currentCard ? (
        <CardRevealScreen
          card={currentCard.card}
          position={currentCard.position}
          onClose={handleClose}
          onSaveReading={() => console.log('Save reading')}
        />
      ) : (
        <TabNavigator onDrawCard={handleDrawCard} />
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}