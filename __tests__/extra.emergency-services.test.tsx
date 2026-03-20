import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Linking } from "react-native";

import EmergencyServices from "../app/(tabs)/extra";

const mockGetNearbyPlaces = jest.fn();
const mockGetPlaceMobileNumber = jest.fn();

jest.mock("../services/GooglePlacesService", () => {
  return {
    getNearbyPlaces: (...args: any[]) => mockGetNearbyPlaces(...args),
    getPlaceMobileNumber: (...args: any[]) => mockGetPlaceMobileNumber(...args),
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return {
    Ionicons: ({ name }: { name: string }) =>
      React.createElement("Icon", { name }),
    Feather: ({ name }: { name: string }) =>
      React.createElement("Icon", { name }),
  };
});

jest.mock("../app/themeContext", () => {
  return {
    useTheme: () => ({
      theme: { background: "#000000" },
    }),
  };
});

describe("EmergencyServices (Emergency Services page)", () => {
  beforeEach(async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true as any);
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as any);
    jest
      .spyOn(Linking, "openSettings" as any)
      .mockResolvedValue(undefined as any);

    process.env.EXPO_PUBLIC_GOOGLE_API_KEY = "test-key";

    mockGetNearbyPlaces.mockReset();
    mockGetPlaceMobileNumber.mockReset();

    // Ensure no location choice leaks between tests.
    await AsyncStorage.clear();

    // Reset router mock calls (provided by jest.setup.ts)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoRouter = require("expo-router");
    expoRouter.__router.push.mockClear();
    expoRouter.__router.back.mockClear();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    jest.restoreAllMocks();
  });

  it("renders headings and service sections", () => {
    render(<EmergencyServices />);

    expect(screen.getByText("Emergency")).toBeTruthy();
    expect(screen.getByText("Services")).toBeTruthy();

    expect(screen.getByText("Emergency Hotlines")).toBeTruthy();
    expect(screen.getByText("Nearby safe places")).toBeTruthy();

    expect(screen.getByText("Ambulance service")).toBeTruthy();
    expect(screen.getByText("Fire & Rescue")).toBeTruthy();
    expect(screen.getByText("Women & Child Bureau")).toBeTruthy();
    expect(screen.getByText("Hospital")).toBeTruthy();
    expect(screen.getByText("Police Station")).toBeTruthy();
  });

  it("shows correct number of Call/Map actions", () => {
    render(<EmergencyServices />);

    expect(screen.getAllByText("Call").length).toBe(6);
    expect(screen.getAllByText("Map").length).toBe(2);
  });

  it("pressing a hotline Call button initiates a phone intent", async () => {
    render(<EmergencyServices />);

    fireEvent.press(screen.getByLabelText("119 Call"));

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalled();
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringMatching(/^tel(prompt)?:119$/),
      );
    });
  });

  it.each([
    ["119", "119"],
    ["Ambulance service", "1990"],
    ["Fire & Rescue", "110"],
    ["Women & Child Bureau", "1938"],
  ])("hotline '%s' dials %s", async (serviceName, expectedNumber) => {
    render(<EmergencyServices />);

    fireEvent.press(screen.getByLabelText(`${serviceName} Call`));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^tel(prompt)?:${expectedNumber}$`)),
      );
    });
  });

  it("pressing Hospital Map navigates to in-app map with placeId", async () => {
    mockGetNearbyPlaces.mockResolvedValueOnce("place-hospital-123");

    render(<EmergencyServices />);

    await waitFor(() => {
      expect(screen.queryByText("Waiting for GPS...")).toBeNull();
    });

    fireEvent.press(screen.getByLabelText("Hospital Map"));

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const expoRouter = require("expo-router");
      expect(expoRouter.__router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/(tabs)/map",
          params: expect.objectContaining({
            placeId: "place-hospital-123",
          }),
        }),
      );
    });
  });

  it("pressing Police Station Map navigates to in-app map with placeId", async () => {
    mockGetNearbyPlaces.mockResolvedValueOnce("place-police-456");

    render(<EmergencyServices />);

    await waitFor(() => {
      expect(screen.queryByText("Waiting for GPS...")).toBeNull();
    });

    fireEvent.press(screen.getByLabelText("Police Station Map"));

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const expoRouter = require("expo-router");
      expect(expoRouter.__router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/(tabs)/map",
          params: expect.objectContaining({
            placeId: "place-police-456",
          }),
        }),
      );
    });
  });

  it("pressing Back returns to previous screen", () => {
    render(<EmergencyServices />);

    fireEvent.press(screen.getByLabelText("Back Button"));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoRouter = require("expo-router");
    expect(expoRouter.__router.back).toHaveBeenCalledTimes(1);
  });

  it("blocks nearby place actions when user chose Don’t Allow on Home", async () => {
    await AsyncStorage.setItem("location_preprompt_choice_v3", "deny");

    render(<EmergencyServices />);

    fireEvent.press(screen.getByLabelText("Hospital Map"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Location Access Needed",
        "To show nearby hospitals and police stations,\nplease enable location access.",
        expect.arrayContaining([
          expect.objectContaining({ text: "Enable Location" }),
          expect.objectContaining({ text: "Not Now" }),
        ]),
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoRouter = require("expo-router");
    expect(expoRouter.__router.push).not.toHaveBeenCalled();
  });
});
