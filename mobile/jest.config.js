/**
 * Two projects, because the suite has two genuinely different needs.
 *
 * `node` is the original config, unchanged: fast ts-jest runs for stores,
 * clients and pure logic, in a node environment with no React renderer.
 *
 * `components` renders screens, which needs the jest-expo preset (Expo module
 * mocks, the React Native transform, and the asset transformer that turns a
 * `require('...webp')` into a module rather than a parse error). Keeping them
 * apart means the component preset cannot slow down or destabilise the tests
 * that were already passing.
 */
const nodeProject = {
  displayName: 'node',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^react-native-uuid$': '<rootDir>/src/__tests__/__mocks__/react-native-uuid.ts',
    '^expo-secure-store$': '<rootDir>/src/__tests__/__mocks__/expo-secure-store.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
    }],
  },
};

const componentProject = {
  displayName: 'components',
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.components.js'],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/src/__tests__/__mocks__/expo-secure-store.ts',
  },
};

module.exports = {
  projects: [nodeProject, componentProject],
};
