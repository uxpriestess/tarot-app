import { useCallback, useRef, useState } from 'react';
import { drawCard } from '../data';
import { askUniverse } from '../services/universe';
import { JournalEntry, useAppStore } from '../store/appStore';
import { TarotCard } from '../types/tarot';

interface DailyDraw {
  card: TarotCard;
  position: 'upright' | 'reversed';
  aiMeaning?: string;
}

export function useDailyDraw() {
  const [currentCard, setCurrentCard] = useState<DailyDraw | null>(null);
  const [isLoadingMeaning, setIsLoadingMeaning] = useState(false);
  const [meaningError, setMeaningError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const requestId = useRef(0);
  const addJournalEntry = useAppStore((state) => state.addJournalEntry);

  const fetchMeaning = useCallback(async (drawn: DailyDraw, id: number) => {
    setIsLoadingMeaning(true);
    setMeaningError(null);

    try {
      const response = await askUniverse(
        `Výklad pro kartu: ${drawn.card.nameCzech || drawn.card.name} (${drawn.position === 'upright' ? 'vzpřímená' : 'obrácená'})`,
        'daily',
        [{
          name: drawn.card.name,
          nameCzech: drawn.card.nameCzech || drawn.card.name,
          position: drawn.position,
        }],
      );

      if (!response.answer?.trim()) {
        throw new Error('Výklad se nepodařilo načíst. Zkus to znovu.');
      }

      if (requestId.current === id) {
        setCurrentCard({ ...drawn, aiMeaning: response.answer });
      }
    } catch (error) {
      console.error('Failed to fetch daily AI meaning:', error);
      if (requestId.current === id) {
        setMeaningError(error instanceof Error ? error.message : 'Výklad se nepodařilo načíst.');
      }
    } finally {
      if (requestId.current === id) {
        setIsLoadingMeaning(false);
      }
    }
  }, []);

  const drawDailyCard = useCallback(() => {
    const id = ++requestId.current;
    const drawn = drawCard();
    const dailyCard = { ...drawn };

    setCurrentCard(dailyCard);
    setIsSaved(false);
    setMeaningError(null);
    void fetchMeaning(dailyCard, id);
  }, [fetchMeaning]);

  const retryMeaning = useCallback(() => {
    if (!currentCard || isLoadingMeaning) return;
    void fetchMeaning(currentCard, requestId.current);
  }, [currentCard, fetchMeaning, isLoadingMeaning]);

  const reset = useCallback(() => {
    requestId.current += 1;
    setCurrentCard(null);
    setIsLoadingMeaning(false);
    setMeaningError(null);
    setIsSaved(false);
  }, []);

  const saveReading = useCallback(() => {
    if (!currentCard || !currentCard.aiMeaning || isLoadingMeaning || isSaved) return false;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      cardId: currentCard.card.id,
      date: new Date().toISOString(),
      position: currentCard.position,
      aiMeaning: currentCard.aiMeaning,
    };

    addJournalEntry(entry);
    setIsSaved(true);
    return true;
  }, [addJournalEntry, currentCard, isLoadingMeaning, isSaved]);

  return {
    currentCard,
    isLoadingMeaning,
    meaningError,
    isSaved,
    drawDailyCard,
    retryMeaning,
    reset,
    saveReading,
  };
}
