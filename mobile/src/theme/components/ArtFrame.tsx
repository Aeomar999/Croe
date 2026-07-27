/**
 * ArtFrame — the onboarding illustration plate.
 *
 * SPEC.md permits raster art in exactly one place: the `.art` element on the
 * onboarding screens. The frame is --sunken at --r-4 so the illustration's
 * ambient occlusion grounds against a matching field, and the image fills it
 * edge to edge.
 *
 * Aspect is a prop because the three panels are 1:1 and the role band is 3:1.
 * The frame never letterboxes or crops to rescue a mismatch, which is why
 * `fit="contain"` shrinks BOTH dimensions together rather than capping height
 * and letting the image crop.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { surfaces, shape } from '../tokens';

interface ArtFrameProps {
  source: number;
  /** Width-to-height ratio: 1 for the panels, 3 for the role band. */
  aspect: 1 | 3;
  /**
   * `width` fills the available width and derives height — for a short band in
   * a fixed column. `contain` grows to fill a flexible parent and centres,
   * capped by the parent's width, so a short device shrinks the art instead of
   * overflowing the screen.
   */
  fit?: 'width' | 'contain';
  style?: ViewStyle;
  testID?: string;
}

export function ArtFrame({
  source,
  aspect,
  fit = 'width',
  style,
  testID,
}: ArtFrameProps) {
  const sizing: ViewStyle =
    fit === 'contain'
      ? { flex: 1, aspectRatio: aspect, alignSelf: 'center', maxWidth: '100%' }
      : { width: '100%', aspectRatio: aspect };

  return (
    <View
      testID={testID}
      style={[
        sizing,
        {
          backgroundColor: surfaces.sunken,
          borderRadius: shape.r4,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={source}
        // Decorative — the heading beside it already says what it says.
        accessible={false}
        contentFit="cover"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
