import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen, CardRevealScreen } from './src/screens';
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
    <>
      {currentCard ? (
        <CardRevealScreen
          card={currentCard.card}
          position={currentCard.position}
          onClose={handleClose}
          onSaveReading={() => console.log('Save reading')}
        />
      ) : (
        <HomeScreen
          onDrawCard={handleDrawCard}
          hasReadToday={false}
          streak={3}
        />
      )}
      <StatusBar style="auto" />
    </>
  );
}