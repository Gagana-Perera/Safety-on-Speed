/**
 * Tests for `services/GooglePlacesService.ts`.
 *
 * These tests focus on *query strategy* and *selection logic* rather than UI.
 * We mock `globalThis.fetch` so no real Google APIs are called.
 *
 * Key testing themes:
 * - When multiple candidate places are returned, we pick the *nearest* by distance.
 * - Emergency vs non-emergency hospital searches behave slightly differently.
 * - Police results must be strict (avoid "Police Station Basketball Ground").
 * - `type=` is preferred over `keyword=` when possible.
 */

describe("getNearbyPlaces()", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // The module reads the API key at import-time. Ensure it's set before `require()`.
    process.env.EXPO_PUBLIC_GOOGLE_API_KEY = "test-key";

    // Keep test output clean (the module logs queries during execution).
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    jest.restoreAllMocks();
  });

  it("returns the closest hospital place_id from candidates (distance logic)", async () => {
    jest.resetModules();

    // One fetch call returns two hospitals at different distances.
    // The function should choose the nearest, regardless of array order.

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "far",
            geometry: { location: { lat: 0.01, lng: 0 } },
          },
          {
            place_id: "near",
            geometry: { location: { lat: 0.001, lng: 0 } },
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // Import after env is set (the service module reads env on import).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getNearbyPlaces } = require("./GooglePlacesService");

      const result = await getNearbyPlaces(0, 0, "hospital");
      expect(result).toBe("near");

      // Ensure we used the preferred Nearby Search strategy:
      // - `nearbysearch/json`
      // - `rankby=distance`
      // - `type=hospital`
      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toContain("nearbysearch/json?");
      expect(firstUrl).toMatch(/rankby=distance/);
      expect(firstUrl).toMatch(/type=hospital/);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("treats serviceType='emergency' as an emergency-hospital search", async () => {
    jest.resetModules();

    // When the UI asks for "emergency", the service translates it to a hospital
    // search but forces the *first keyword attempt* to be exactly "emergency".

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "far",
            geometry: { location: { lat: 0.02, lng: 0 } },
          },
          {
            place_id: "near",
            geometry: { location: { lat: 0.0005, lng: 0 } },
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getNearbyPlaces } = require("./GooglePlacesService");

      const result = await getNearbyPlaces(0, 0, "emergency");
      expect(result).toBe("near");

      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toContain("nearbysearch/json?");
      expect(firstUrl).toMatch(/rankby=distance/);
      expect(firstUrl).toMatch(/type=hospital/);
      // First attempt should use the user's expected keyword.
      expect(firstUrl).toMatch(/keyword=emergency/);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("avoids specialty-only hospitals by falling back to a plain hospital query", async () => {
    jest.resetModules();

    // The service tries multiple keyword strategies (e.g., emergency department, etc.).
    // If these yield only specialty facilities (or nothing), it should fall back
    // to a plain typed hospital query without any keyword.

    const fetchMock = jest.fn().mockImplementation(async (url: string) => {
      const u = String(url);

      // Keyword attempts (emergency/etc): only a specialty hospital appears.
      if (u.includes("rankby=distance") && u.includes("type=hospital")) {
        if (u.includes("keyword=emergency")) {
          return {
            json: async () => ({
              status: "OK",
              results: [
                {
                  place_id: "eye",
                  name: "National Eye Hospital",
                  geometry: { location: { lat: 0.0005, lng: 0 } },
                  types: ["hospital"],
                },
              ],
            }),
          };
        }

        if (u.includes("keyword=")) {
          return {
            json: async () => ({
              status: "OK",
              results: [],
            }),
          };
        }

        // Fallback query (no keyword): a general hospital appears.
        return {
          json: async () => ({
            status: "OK",
            results: [
              {
                place_id: "general",
                name: "Colombo General Hospital",
                geometry: { location: { lat: 0.0015, lng: 0 } },
                types: ["hospital"],
              },
            ],
          }),
        };
      }

      return {
        json: async () => ({
          status: "OK",
          results: [],
        }),
      };
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getNearbyPlaces } = require("./GooglePlacesService");

      const result = await getNearbyPlaces(0, 0, "hospital");
      expect(result).toBe("general");

      // Confirm we issued at least one hospital request without a keyword.
      // This ensures the fallback path was exercised.
      const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
      const hospitalNoKeywordCall = calledUrls.find(
        (u) =>
          u.includes("nearbysearch/json?") &&
          u.includes("rankby=distance") &&
          u.includes("type=hospital") &&
          !u.includes("keyword="),
      );
      expect(hospitalNoKeywordCall).toBeTruthy();
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("picks the nearest hospital across keyword attempts (not first non-empty)", async () => {
    jest.resetModules();

    // We mock multiple sequential fetch calls to simulate multiple keyword attempts.
    // The function must choose the nearest hospital across all attempts,
    // not just "first non-empty".
    const fetchMock = jest.fn();
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          status: "OK",
          results: [
            {
              place_id: "far",
              geometry: { location: { lat: 0.02, lng: 0 } },
              types: ["hospital"],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: "OK",
          results: [
            {
              place_id: "near",
              geometry: { location: { lat: 0.001, lng: 0 } },
              types: ["hospital"],
            },
          ],
        }),
      })
      // Remaining keyword attempts: no additional candidates.
      .mockResolvedValue({
        json: async () => ({
          status: "OK",
          results: [],
        }),
      });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getNearbyPlaces } = require("./GooglePlacesService");

      const result = await getNearbyPlaces(0, 0, "hospital");
      expect(result).toBe("near");
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("for police, ignores non-station places even if closer", async () => {
    jest.resetModules();

    // Places often returns nearby venues tagged with `type=police`.
    // We must prefer a real "Police Station" over "Police Station Basketball Ground".

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "bad",
            name: "Kandy Police Station Basketball Ground",
            geometry: { location: { lat: 0.0002, lng: 0 } },
            types: ["police"],
          },
          {
            place_id: "good",
            name: "Kandy Police Station",
            geometry: { location: { lat: 0.002, lng: 0 } },
            types: ["police"],
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getNearbyPlaces } = require("./GooglePlacesService");

      const result = await getNearbyPlaces(0, 0, "police station");
      expect(result).toBe("good");

      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toMatch(/type=police/);
      expect(firstUrl).toMatch(
        /keyword=police\+station|keyword=police%20station/,
      );
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe("searchNearbyPlaces()", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_API_KEY = "test-key";

    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    jest.restoreAllMocks();
  });

  it("filters out results whose types don't include the requested type", async () => {
    jest.resetModules();

    // Even if the API returns mixed types, the helper should only keep results
    // whose `types` include the requested type.

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "h1",
            name: "Real Hospital",
            geometry: { location: { lat: 0.001, lng: 0 } },
            types: ["hospital"],
          },
          {
            place_id: "p1",
            name: "Pharmacy",
            geometry: { location: { lat: 0.0005, lng: 0 } },
            types: ["pharmacy"],
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { searchNearbyPlaces } = require("./GooglePlacesService");

      const list = await searchNearbyPlaces(0, 0, "hospital", 12);
      expect(list).toHaveLength(1);
      expect(list[0].placeId).toBe("h1");

      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toMatch(/nearbysearch\/json\?/);
      expect(firstUrl).toMatch(/rankby=distance/);
      expect(firstUrl).toMatch(/type=hospital/);
      // For typed searches we do not add `keyword=hospital` (it can reduce quality).
      expect(firstUrl).not.toMatch(/keyword=hospital/);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("for pharmacy, only keeps places whose types include 'pharmacy'", async () => {
    jest.resetModules();

    // Same as hospital test, but for pharmacy.

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "ph1",
            name: "Good Pharmacy",
            geometry: { location: { lat: 0.001, lng: 0 } },
            types: ["pharmacy"],
          },
          {
            place_id: "h1",
            name: "Hospital (should be filtered)",
            geometry: { location: { lat: 0.0005, lng: 0 } },
            types: ["hospital"],
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { searchNearbyPlaces } = require("./GooglePlacesService");

      const list = await searchNearbyPlaces(0, 0, "pharmacy", 12);
      expect(list).toHaveLength(1);
      expect(list[0].placeId).toBe("ph1");

      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toMatch(/nearbysearch\/json\?/);
      expect(firstUrl).toMatch(/rankby=distance/);
      expect(firstUrl).toMatch(/type=pharmacy/);
      expect(firstUrl).not.toMatch(/keyword=pharmacy/);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("supports openNow option by adding opennow=true and marking results as open", async () => {
    jest.resetModules();

    // When `openNow` is requested, the helper should:
    // - include `opennow=true` in the query
    // - expose a derived `isOpenNow=true` even if opening_hours is absent

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "h1",
            name: "Open Hospital",
            geometry: { location: { lat: 0.001, lng: 0 } },
            types: ["hospital"],
            // Intentionally omit opening_hours to test fallback behavior.
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { searchNearbyPlaces } = require("./GooglePlacesService");

      const list = await searchNearbyPlaces(0, 0, "hospital", 12, {
        openNow: true,
      });
      expect(list).toHaveLength(1);
      expect(list[0].placeId).toBe("h1");
      expect(list[0].isOpenNow).toBe(true);

      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toMatch(/type=hospital/);
      expect(firstUrl).toMatch(/opennow=true/);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("for police, only keeps places named 'Police Station'", async () => {
    jest.resetModules();

    // `type=police` results can include "Police Post" and other nearby landmarks.
    // The helper adds `keyword=police station` and filters by name.

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        status: "OK",
        results: [
          {
            place_id: "ps1",
            name: "Colombo Police Station",
            geometry: { location: { lat: 0.001, lng: 0 } },
            types: ["police"],
          },
          {
            place_id: "bg1",
            name: "Colombo Police Station Basketball Ground",
            geometry: { location: { lat: 0.0008, lng: 0 } },
            types: ["police"],
          },
          {
            place_id: "pp1",
            name: "Police Post - Checkpoint",
            geometry: { location: { lat: 0.0005, lng: 0 } },
            types: ["police"],
          },
        ],
      }),
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { searchNearbyPlaces } = require("./GooglePlacesService");

      const list = await searchNearbyPlaces(0, 0, "police", 12);
      expect(list).toHaveLength(1);
      expect(list[0].placeId).toBe("ps1");

      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toMatch(/type=police/);
      expect(firstUrl).toMatch(/keyword=police%20station/);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
