/* eslint-env jest */

/**
 * expo-image renders through a native view that has no test double, so it is
 * replaced with a plain View. The onboarding tests care about what the frame
 * contains and how it is laid out, never about decode behaviour.
 */
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props) => React.createElement(View, { ...props, testID: props.testID ?? 'expo-image' }),
  };
});

/**
 * Safe-area insets come from a native provider. Zero insets keep the layout
 * assertions independent of which device the suite imagines it is running on.
 */
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: { insets: inset, frame: { x: 0, y: 0, width: 390, height: 844 } },
  };
});
