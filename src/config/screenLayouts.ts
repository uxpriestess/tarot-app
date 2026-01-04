import { ImageSourcePropType } from 'react-native';

export interface Hotspot {
  id: string;
  x: string; // Percentage string e.g., '50%'
  y: string; // Percentage string e.g., '60%'
  width: number | string;
  height: number | string;
  action: string;
  label?: string; // For debugging/fallback
}

export interface ScreenLayout {
  backgroundImage: ImageSourcePropType;
  hotspots: Hotspot[];
}

export const SCREEN_LAYOUTS: Record<string, ScreenLayout> = {
  // Option A: Ritual (Candles)
  home_ritual: {
    backgroundImage: require('../../assets/screens/home_ritual.jpg'),
    hotspots: [
      // Example placeholders - positions need to be tuned to the image
      { id: 'draw_card', x: '50%', y: '50%', width: '40%', height: '10%', action: 'draw_card', label: 'Draw Card' },
      { id: 'journal', x: '20%', y: '80%', width: '30%', height: '10%', action: 'journal', label: 'Journal' },
    ],
  },
  // Option B: Celestial (Clouds)
  home_celestial: {
    backgroundImage: require('../../assets/screens/home_celestial.png'),
    hotspots: [
      // Example placeholders
      { id: 'draw_card', x: '50%', y: '50%', width: '40%', height: '10%', action: 'draw_card', label: 'Draw Card' },
      { id: 'journal', x: '80%', y: '80%', width: '30%', height: '10%', action: 'journal', label: 'Journal' },
    ],
  },
  // Default fallback
  home: {
    backgroundImage: require('../../assets/screens/home_ritual.jpg'),
    hotspots: [], // We are styling RN text for now, so no invisible spots yet
  }
};
