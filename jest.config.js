/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|expo(nent)?|expo-.*|@expo(nent)?/.*|@expo/.*|expo-router|react-native-svg|react-native-reanimated|nativewind|react-native-css-interop)/)",
  ],
};
