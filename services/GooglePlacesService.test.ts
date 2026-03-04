describe("getNearbyPlaces()", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // Ensure API key is present at module import time
    process.env.EXPO_PUBLIC_GOOGLE_API_KEY = "test-key";

    // Keep test output clean (the module logs queries)
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    jest.restoreAllMocks();
  });

  it("returns the closest hospital place_id from candidates (distance logic)", async () => {
    jest.resetModules();

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
      // Import after env is set
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getNearbyPlaces } = require("./GooglePlacesService");

      const result = await getNearbyPlaces(0, 0, "hospital");
      expect(result).toBe("near");

      // Ensure we used rankby=distance hospital query first
      const firstUrl = String(fetchMock.mock.calls[0][0]);
      expect(firstUrl).toContain("nearbysearch/json?");
      expect(firstUrl).toMatch(/rankby=distance/);
      expect(firstUrl).toMatch(/type=hospital/);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
