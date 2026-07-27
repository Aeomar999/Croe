import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { surfaces, ink as inkColors } from '../theme/tokens';
import { typography } from '../theme/typography';

export function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surfaces.canvas,
  },
  text: {
    ...typography.heading,
    color: inkColors.tertiary,
  },
});
