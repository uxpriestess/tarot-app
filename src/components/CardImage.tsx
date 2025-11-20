import React from 'react';
import { Image, StyleSheet, View, ImageSourcePropType, Text } from 'react-native';
interface CardImageProps {
  imageName: string;
  width?: number;
  height?: number;
}

// Map of image names to require statements
const cardImages: { [key: string]: ImageSourcePropType } = {
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
};

export function CardImage({ imageName, width = 200, height = 300 }: CardImageProps) {
  const imageSource = cardImages[imageName];

  if (!imageSource) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <Text style={styles.placeholderText}>Image not found</Text>
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
  },
  placeholder: {
    backgroundColor: '#F5F0E8',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#857A6E',
    fontSize: 14,
  },
});