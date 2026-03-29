import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

import { EMERGENCY_SOS_TAP_WINDOW_MS } from "@/lib/sosTap";
import { supabase } from "@/lib/superbase";
import Index from "../app/(tabs)/index";

const mockCountGuardianRecipients = jest.fn();
const mockUseInternetStatus = jest.fn();

jest.mock("@/hooks/notifyVerifiedGuardians", () => ({
  countGuardianRecipients: (...args: unknown[]) =>
    mockCountGuardianRecipients(...args),
}));

jest.mock("@/hooks/useInternetStatus", () => ({
  useInternetStatus: () => mockUseInternetStatus(),
}));

jest.mock("@/lib/superbase", () => {
  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    },
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

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: {
    Medium: "Medium",
  },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("Home page", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();
    await AsyncStorage.clear();

    mockUseInternetStatus.mockReturnValue("online");
    mockCountGuardianRecipients.mockResolvedValue(2);

    (supabase.auth.getSession as unknown as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1" },
        },
      },
    });

    (
      Location.hasServicesEnabledAsync as unknown as jest.Mock
    ).mockResolvedValue(true);
    (
      Location.getForegroundPermissionsAsync as unknown as jest.Mock
    ).mockResolvedValue({
      status: "granted",
      canAskAgain: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoRouter = require("expo-router");
    expoRouter.__router.push.mockClear();
    expoRouter.__router.back.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders home dashboard stats and action labels", async () => {
    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("sos_control")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText("2")).toBeTruthy();
    });

    expect(screen.getByText("GPS Ready")).toBeTruthy();
    expect(screen.getByText("Online")).toBeTruthy();
    expect(screen.getByText("manage_guardians")).toBeTruthy();
    expect(screen.getByText("1 tap = Quick SOS")).toBeTruthy();
  });

  it("navigates to emergency services and manage guardians", async () => {
    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("emergency_services")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("emergency_services"));
    fireEvent.press(screen.getByText("manage_guardians"));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoRouter = require("expo-router");
    expect(expoRouter.__router.push).toHaveBeenCalledWith("/extra");
    expect(expoRouter.__router.push).toHaveBeenCalledWith("/auth/addguardians");
  });

  it("starts quick SOS after one tap and timeout window", async () => {
    jest.useFakeTimers();

    render(<Index />);

    const sosButton = await screen.findByLabelText("SOS Button");
    fireEvent.press(sosButton);

    act(() => {
      jest.advanceTimersByTime(EMERGENCY_SOS_TAP_WINDOW_MS + 10);
    });

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const expoRouter = require("expo-router");
      expect(expoRouter.__router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/sos/loading",
          params: { mode: "quick" },
        }),
      );
    });

    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it("starts emergency SOS immediately on three fast taps", async () => {
    jest.useFakeTimers();

    render(<Index />);

    const sosButton = await screen.findByLabelText("SOS Button");

    fireEvent.press(sosButton);
    fireEvent.press(sosButton);
    fireEvent.press(sosButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const expoRouter = require("expo-router");
      expect(expoRouter.__router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/sos/loading",
          params: { mode: "emergency" },
        }),
      );
    });

    // Ensure quick timer was cancelled after emergency path.
    act(() => {
      jest.advanceTimersByTime(EMERGENCY_SOS_TAP_WINDOW_MS + 10);
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoRouter = require("expo-router");
    expect(expoRouter.__router.push).toHaveBeenCalledTimes(1);
  });

  it("shows GPS Off when location services are disabled", async () => {
    (
      Location.hasServicesEnabledAsync as unknown as jest.Mock
    ).mockResolvedValue(false);

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("GPS Off")).toBeTruthy();
    });
  });
});
