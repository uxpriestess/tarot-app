import React, { useState } from 'react';
import {
  View,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  StatusBar,
  LayoutChangeEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_LAYOUTS, Hotspot } from '../config/screenLayouts';

interface ImmersiveScreenProps {
  screenName: string;
  variant?: string; // e.g., 'ritual' or 'celestial' to override
  onHotspotPress?: (action: string) => void;
  children?: React.ReactNode;
  debugMode?: boolean; // Show semi-transparent boxes for hotspots
}

export function ImmersiveScreen({
  screenName,
  variant,
  onHotspotPress,
  children,
  debugMode = false // Default to false, can toggle for dev
}: ImmersiveScreenProps) {
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // Determine which layout config to use
  // Try 'screenName_variant' first (e.g. 'home_ritual'), then 'screenName' (e.g. 'home')
  const configKey = variant ? `${screenName}_${variant}` : screenName;
  const layoutConfig = SCREEN_LAYOUTS[configKey] || SCREEN_LAYOUTS[screenName];

  if (!layoutConfig) {
    console.warn(`ImmersiveScreen: No layout found for ${screenName} (variant: ${variant})`);
    return <View style={styles.container}>{children}</View>;
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={layoutConfig.backgroundImage}
        style={[styles.background, { paddingBottom: insets.bottom }]}
        resizeMode="cover"
      >
        {/* Render Hotspots */}
        {layout.width > 0 && layoutConfig.hotspots.map((spot: Hotspot) => {
          // Helper to parse percentages
          const parseDim = (val: string | number, total: number) => {
            if (typeof val === 'number') return val;
            if (val.endsWith('%')) {
              return (parseFloat(val) / 100) * total;
            }
            return parseFloat(val);
          };

          // Calculate position
          // Hotspots are typically defined relative to the image center or specific points
          // Here we assume x/y are TOP-LEFT coordinates of the box

          const left = parseDim(spot.x, layout.width);
          const top = parseDim(spot.y, layout.height);
          const width = parseDim(spot.width, layout.width);
          const height = parseDim(spot.height, layout.height);

          // If coordinates were intended to be "center", we'd subtract half width/height
          // For now, let's assume standard "left/top" positioning

          return (
            <TouchableOpacity
              key={spot.id}
              style={[
                styles.hotspot,
                {
                  left,
                  top,
                  width,
                  height,
                  // In debug mode, show the box. In prod, typically transparent
                  backgroundColor: debugMode ? 'rgba(255, 0, 0, 0.3)' : 'transparent',
                  borderWidth: debugMode ? 1 : 0,
                  borderColor: 'red'
                }
              ]}
              onPress={() => onHotspotPress && onHotspotPress(spot.action)}
              activeOpacity={debugMode ? 0.5 : 1} // No visual feedback on tap in production unless desired
            >
              {debugMode && <Text style={styles.debugLabel}>{spot.label || spot.id}</Text>}
            </TouchableOpacity>
          );
        })}

        {/* Render Standard Children (Overlay UI) */}
        <View style={[styles.contentContainer, { paddingTop: insets.top }]}>
          {children}
        </View>

      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Fallback
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    // Ensure children are above background but below hotspots (or above? Usually UI is above bg)
    // If hotspots are for "baked in" UI, they should be top-most. 
    // If we have mixed UI, we need to be careful with zIndex.
    zIndex: 1,
  },
  hotspot: {
    position: 'absolute',
    zIndex: 10, // Hotspots sit on top of everything
  },
  debugLabel: {
    color: 'white',
    fontSize: 10,
    backgroundColor: 'black',
    padding: 2,
  }
});
