import "@testing-library/jest-native/extend-expect";

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
  return {
    useRouter: () => ({
      push: mockExpoRouterPush,
      back: mockExpoRouterBack,
    }),
    __router: {
      push: mockExpoRouterPush,
      back: mockExpoRouterBack,
    },
  };
});

jest.mock("expo-location", () => {
  return {
    Accuracy: { High: 6 },
    requestForegroundPermissionsAsync: jest
      .fn()
      .mockResolvedValue({ status: "granted" }),
    hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
    // Provide a quick initial fix so the screen enables place actions.
    getLastKnownPositionAsync: jest.fn().mockResolvedValue({
      coords: { latitude: 6.9271, longitude: 79.8612 },
    }),
    // Keep pending to avoid state updates after assertions (act warnings).
    getCurrentPositionAsync: jest.fn(() => new Promise(() => {})),
  };
});
