/**
 * useFonts.ts
 * 
 * Custom hook to load fonts for Love Reading screen
 * Place this in: src/hooks/useFonts.ts (or create the hooks folder)
 */

import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Caveat-Bold': require('../../assets/fonts/Caveat-Bold.ttf'),
        'Cormorant-Italic': require('../../assets/fonts/CormorantGaramond-Italic.ttf'),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  return fontsLoaded;
};
