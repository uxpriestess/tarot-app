import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const DAILY_CARD_BACKS = [
  {
    id: 'moonlight',
    label: 'Měsíční',
    colors: ['#17162f', '#3d2852'] as const,
    accent: '#e8c995',
    icon: 'moon' as const,
    detail: 'sparkles' as const,
  },
  {
    id: 'garden',
    label: 'Zahrada',
    colors: ['#152d2a', '#315345'] as const,
    accent: '#c9d9b1',
    icon: 'leaf' as const,
    detail: 'flower' as const,
  },
  {
    id: 'velvet',
    label: 'Sametová',
    colors: ['#351c31', '#6b3045'] as const,
    accent: '#f0c2a4',
    icon: 'sparkles' as const,
    detail: 'star' as const,
  },
] as const;

export type DailyCardBackId = (typeof DAILY_CARD_BACKS)[number]['id'];

interface DailyCardBackProps {
  designId: DailyCardBackId;
  width: number;
  height: number;
}

export function DailyCardBack({ designId, width, height }: DailyCardBackProps) {
  const design = DAILY_CARD_BACKS.find((option) => option.id === designId) ?? DAILY_CARD_BACKS[0];

  return (
    <View style={[styles.card, { width, height, borderRadius: Math.max(10, width * 0.06) }]}>
      <LinearGradient colors={design.colors} style={styles.gradient}>
        <View
          style={[
            styles.frame,
            {
              borderColor: `${design.accent}aa`,
              top: height * 0.035,
              left: width * 0.045,
              right: width * 0.045,
              bottom: height * 0.035,
              borderRadius: width * 0.045,
            },
          ]}
        />
        <View
          style={[
            styles.innerFrame,
            {
              borderColor: `${design.accent}55`,
              top: height * 0.055,
              left: width * 0.075,
              right: width * 0.075,
              bottom: height * 0.055,
              borderRadius: width * 0.035,
            },
          ]}
        />
        <View style={[styles.corner, styles.topLeft, { left: width * 0.1, top: height * 0.075 }]}>
          <Ionicons name={design.detail} size={Math.max(9, width * 0.07)} color={design.accent} />
        </View>
        <View style={[styles.corner, styles.topRight, { right: width * 0.1, top: height * 0.075 }]}>
          <Ionicons name={design.detail} size={Math.max(9, width * 0.07)} color={design.accent} />
        </View>
        <View style={[styles.corner, styles.bottomLeft, { left: width * 0.1, bottom: height * 0.075 }]}>
          <Ionicons name={design.detail} size={Math.max(9, width * 0.07)} color={design.accent} />
        </View>
        <View style={[styles.corner, styles.bottomRight, { right: width * 0.1, bottom: height * 0.075 }]}>
          <Ionicons name={design.detail} size={Math.max(9, width * 0.07)} color={design.accent} />
        </View>
        <View style={styles.center}>
          <View
            style={[
              styles.medallion,
              {
                width: width * 0.48,
                borderRadius: width * 0.24,
                borderColor: `${design.accent}99`,
              },
            ]}
          >
            <Ionicons name={design.icon} size={Math.min(width * 0.24, height * 0.12)} color={design.accent} />
          </View>
          <Text
            style={[
              styles.wordmark,
              { color: design.accent, fontSize: Math.max(7, width * 0.035) },
            ]}
          >
            TAROTKA
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#17162f',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    position: 'absolute',
    borderWidth: 1.2,
  },
  innerFrame: {
    position: 'absolute',
    borderWidth: 0.7,
  },
  corner: {
    position: 'absolute',
    opacity: 0.9,
  },
  topLeft: {
    transform: [{ rotate: '-45deg' }],
  },
  topRight: {
    transform: [{ rotate: '45deg' }],
  },
  bottomLeft: {
    transform: [{ rotate: '-135deg' }],
  },
  bottomRight: {
    transform: [{ rotate: '135deg' }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    aspectRatio: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    marginTop: 10,
    letterSpacing: 2,
    fontWeight: '600',
  },
});
