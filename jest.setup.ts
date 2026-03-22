import "@testing-library/jest-native/extend-expect";

process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_KEY = "test-anon-key";

jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("react-native-url-polyfill/auto", () => ({}));
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (
    typeof first === "string" &&
    first.includes("SafeAreaView has been deprecated")
  ) {
    return;
  }
  originalConsoleWarn(...(args as any[]));
};

console.error = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === "string" && first.includes("not wrapped in act")) {
    return;
  }
  originalConsoleError(...(args as any[]));
};

console.log = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === "string" && first.startsWith("[Map]")) {
    return;
  }
  originalConsoleLog(...(args as any[]));
};

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

const mockExpoRouterPush = jest.fn();
const mockExpoRouterBack = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useRouter: () => ({
      push: mockExpoRouterPush,
      back: mockExpoRouterBack,
    }),
    Link: ({ children }: { children: any }) =>
      React.createElement(React.Fragment, null, children),
    useFocusEffect: (effect: () => void | (() => void)) => {
      const { useEffect } = React;
      useEffect(effect, [effect]);
    },
    __router: {
      push: mockExpoRouterPush,
      back: mockExpoRouterBack,
    },
  };
});

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  const React = require("react");
  return {
    ...actual,
    useFocusEffect: (effect: () => void | (() => void)) => {
      const { useEffect } = React;
      useEffect(effect, [effect]);
    },
  };
});

jest.mock("expo-task-manager", () => {
  return {
    isTaskDefined: jest.fn().mockReturnValue(false),
    defineTask: jest.fn(),
  };
});

jest.mock("expo-location", () => {
  return {
    Accuracy: { High: 6 },
    getForegroundPermissionsAsync: jest
      .fn()
      .mockResolvedValue({ status: "granted", canAskAgain: true }),
    requestForegroundPermissionsAsync: jest
      .fn()
      .mockResolvedValue({ status: "granted" }),
    hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
    // Provide a quick initial fix so the screen enables place actions.
    getLastKnownPositionAsync: jest.fn().mockResolvedValue({
      coords: { latitude: 6.9271, longitude: 79.8612 },
    }),
    watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
    // Keep pending to avoid state updates after assertions (act warnings).
    getCurrentPositionAsync: jest.fn(() => new Promise(() => {})),
  };
});
