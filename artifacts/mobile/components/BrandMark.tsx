import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const officialMark = require('../assets/images/og-official-mark.png');

/** The approved splash artwork, with transparent clear space and no tinting. */
export function BrandMark({ width = 136, style }: {
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={officialMark}
      accessibilityRole="image"
      accessibilityLabel="OG Exports official logo"
      resizeMode="contain"
      style={[{ width, height: width * 270 / 389 }, style]}
    />
  );
}
