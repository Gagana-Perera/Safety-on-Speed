import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as Location from "expo-location";

jest.mock("@/components/LocationPreviewMap", () => {
  return function LocationPreviewMapMock() {
    return null;
  };
});

jest.mock("@/lib/superbase", () => {
  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
      from: () => ({
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    },
  };
});

jest.mock("react-i18next", () => {
  return {
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

jest.mock("@/components/theme/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      mode: "light",
      background: "#ffffff",
      card: "#f5f5f5",
      border: "#e5e7eb",
      text: "#000000",
      icon: "#111111",
    },
    isDark: false,
    toggleTheme: () => {},
  }),
}));

import Index from "../app/(tabs)/index";

describe("Home location preprompt buttons", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("location_preprompt_pending_v1", "true");

    // Ensure modal will show.
    (
      Location.getForegroundPermissionsAsync as unknown as jest.Mock
    ).mockResolvedValue({
      status: "denied",
      canAskAgain: true,
    });
  });

  it("Allow Once triggers OS permission request", async () => {
    jest.useFakeTimers();

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("Allow Once")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Allow Once"));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "location_preprompt_choice_v3",
      );
    });

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(
        1,
      );
    });

    // It closes immediately before the OS prompt.
    await waitFor(() => {
      expect(screen.queryByText("Allow Once")).toBeNull();
    });

    jest.useRealTimers();
  });

  it("Allow While Using App triggers OS permission request", async () => {
    jest.useFakeTimers();

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("Allow While Using App")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Allow While Using App"));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "location_preprompt_choice_v3",
      );
    });

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(
        1,
      );
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "location_preprompt_choice_v3",
        "allow_while",
      );
    });

    jest.useRealTimers();
  });

  it("Don’t Allow stores deny and closes modal", async () => {
    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("Don’t Allow")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Don’t Allow"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "location_preprompt_choice_v3",
        "deny",
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Don’t Allow")).toBeNull();
    });
  });
});
