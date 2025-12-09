import React from 'react';
import { Image, StyleSheet, View, Text, ImageSourcePropType } from 'react-native';

interface CardImageProps {
  imageName: string;
  width?: number;
  height?: number;
}

// Static mapping of image names to require statements
const cardImages: { [key: string]: ImageSourcePropType } = {
  // Major Arcana
  '0-fool.png': require('../../assets/cards/majorArcana/0-fool.png'),
  '1-magician.png': require('../../assets/cards/majorArcana/1-magician.png'),
  '2-high-priestess.png': require('../../assets/cards/majorArcana/2-high-priestess.png'),
  '3-empress.png': require('../../assets/cards/majorArcana/3-empress.png'),
  '4-emperor.png': require('../../assets/cards/majorArcana/4-emperor.png'),
  '5-hierophant.png': require('../../assets/cards/majorArcana/5-hierophant.png'),
  '6-lovers.png': require('../../assets/cards/majorArcana/6-lovers.png'),
  '7-chariot.png': require('../../assets/cards/majorArcana/7-chariot.png'),
  '8-strength.png': require('../../assets/cards/majorArcana/8-strength.png'),
  '9-hermit.png': require('../../assets/cards/majorArcana/9-hermit.png'),
  '10-wheel-of-fortune.png': require('../../assets/cards/majorArcana/10-wheel-of-fortune.png'),
  '11-justice.png': require('../../assets/cards/majorArcana/11-justice.png'),
  '12-hanged-man.png': require('../../assets/cards/majorArcana/12-hanged-man.png'),
  '13-death.png': require('../../assets/cards/majorArcana/13-death.png'),
  '14-temperance.png': require('../../assets/cards/majorArcana/14-temperance.png'),
  '15-devil.png': require('../../assets/cards/majorArcana/15-devil.png'),
  '16-tower.png': require('../../assets/cards/majorArcana/16-tower.png'),
  '17-star.png': require('../../assets/cards/majorArcana/17-star.png'),
  '18-moon.png': require('../../assets/cards/majorArcana/18-moon.png'),
  '19-sun.png': require('../../assets/cards/majorArcana/19-sun.png'),
  '20-judgment.png': require('../../assets/cards/majorArcana/20-judgment.png'),
  '21-world.png': require('../../assets/cards/majorArcana/21-world.png'),

  // Cups
  'eso-poharu.png': require('../../assets/cards/cups/eso-poharu.png'),
  '2-pohary.png': require('../../assets/cards/cups/2-pohary.png'),
  '3-pohary.png': require('../../assets/cards/cups/3-pohary.png'),
  '4-pohary.png': require('../../assets/cards/cups/4-pohary.png'),
  '5-poharu.png': require('../../assets/cards/cups/5-poharu.png'),
  '6-poharu.png': require('../../assets/cards/cups/6-poharu.png'),
  '7-poharu.png': require('../../assets/cards/cups/7-poharu.png'),
  '8-poharu.png': require('../../assets/cards/cups/8-poharu.png'),
  '9-poharu.png': require('../../assets/cards/cups/9-poharu.png'),
  '10-poharu.png': require('../../assets/cards/cups/10-poharu.png'),
  'paze-poharu.png': require('../../assets/cards/cups/paze-poharu.png'),
  'rytir-poharu.png': require('../../assets/cards/cups/rytir-poharu.png'),
  'kralovna-poharu.png': require('../../assets/cards/cups/kralovna-poharu.png'),
  'kral-poharu.png': require('../../assets/cards/cups/kral-poharu.png'),

  // Pentacles
  'eso-pentaklu.png': require('../../assets/cards/pentacles/eso-pentaklu.png'),
  '2-pentaklu.png': require('../../assets/cards/pentacles/2-pentaklu.png'),
  '3-pentaklu.png': require('../../assets/cards/pentacles/3-pentaklu.png'),
  '4-pentaklu.png': require('../../assets/cards/pentacles/4-pentaklu.png'),
  '5-pentaklu.png': require('../../assets/cards/pentacles/5-pentaklu.png'),
  '6-pentaklu.png': require('../../assets/cards/pentacles/6-pentaklu.png'),
  '7-pentaklu.png': require('../../assets/cards/pentacles/7-pentaklu.png'),
  '8-pentaklu.png': require('../../assets/cards/pentacles/8-pentaklu.png'),
  '9-pentaklu.png': require('../../assets/cards/pentacles/9-pentaklu.png'),
  '10-pentaklu.png': require('../../assets/cards/pentacles/10-pentaklu.png'),
  'paze-pentaklu.jpg': require('../../assets/cards/pentacles/paze-pentaklu.jpg'),
  'rytir-pentaklu.jpg': require('../../assets/cards/pentacles/rytir-pentaklu.jpg'),
  'kralovna-pentaklu.png': require('../../assets/cards/pentacles/kralovna-pentaklu.png'),
  'kral-pentaklu.jpg': require('../../assets/cards/pentacles/kral-pentaklu.jpg'),
};

export function CardImage({ imageName, width = 200, height = 300 }: CardImageProps) {
  const imageSource = cardImages[imageName];

  if (!imageSource) {
    console.warn(`[CardImage] Image not found for: ${imageName}`);
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <Text style={styles.placeholderText}>Image not found</Text>
        <Text style={styles.debugText}>{imageName}</Text>
      </View>
    );
  }

  return (
    <Image
      source={imageSource}
      style={[styles.cardImage, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  cardImage: {
    borderRadius: 20,
    // Removed background color to allow transparency if needed
  },
  placeholder: {
    backgroundColor: '#F5F0E8',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  placeholderText: {
    color: '#857A6E',
    fontSize: 14,
    marginBottom: 4,
  },
  debugText: {
    color: 'red',
    fontSize: 10,
    textAlign: 'center',
  },
});