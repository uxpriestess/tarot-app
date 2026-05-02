import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, spacing } from '../theme/colors';
import { CelestialBackground } from '../components/CelestialBackground';
import { Ionicons } from '@expo/vector-icons';

interface TomorrowScreenProps {
  onBack: () => void;
  onDrawCard: () => void;
}

export function TomorrowScreen({ onBack, onDrawCard }: TomorrowScreenProps) {
  return (
    <CelestialBackground>
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#f5f0f6" />
        </TouchableOpacity>

        <Text style={styles.title}>Co přinese zítřek?</Text>
        <Text style={styles.subtitle}>Nahlédni za oponu času</Text>

        <TouchableOpacity style={styles.button} onPress={onDrawCard}>
          <Text style={styles.buttonText}>Odhalit kartu</Text>
        </TouchableOpacity>
      </View>
    </CelestialBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  title: {
    fontSize: 32,
    color: '#f5f0f6',
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#c9b8d4',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 48,
  },
  button: {
    backgroundColor: 'rgba(155, 138, 163, 0.3)',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c9b8d4',
  },
  buttonText: {
    color: '#f5f0f6',
    fontSize: 16,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
  },
});
